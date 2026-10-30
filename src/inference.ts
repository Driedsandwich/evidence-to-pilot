import { appendFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import {
  defineRuntime,
  RuntimeState,
  supportedModels,
  ModelMessageItem,
  SemanticEvent,
  type InferenceRunner,
  type InferenceInput,
  type InferenceOutput,
} from "@mozaik-ai/core";

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};
export type TaskMeta = {
  runId: string;
  taskId: string;
  agent: string;
  loopId: string | null;
  model: string;
};
export type Policy = {
  concurrency: number;
  rpm: number;
  maxAttempts: number;
  budgetUsd: number;
  retries: number;
  timeoutMs: number;
  inputRate: number;
  outputRate: number;
  maxOutputTokens: number;
};
export const defaultPolicy: Policy = {
  concurrency: 2,
  rpm: 30,
  maxAttempts: 96,
  budgetUsd: 2,
  retries: 1,
  timeoutMs: 90000,
  inputRate: 1,
  outputRate: 5,
  maxOutputTokens: 4096,
};
export function policyFromEnv(env = process.env): Policy {
  const keys: Record<keyof Policy, string> = {
    concurrency: "MAX_CONCURRENT",
    rpm: "REQUESTS_PER_MINUTE",
    maxAttempts: "MAX_PROVIDER_CALLS",
    budgetUsd: "BUDGET_USD",
    retries: "MAX_RETRIES",
    timeoutMs: "REQUEST_TIMEOUT_MS",
    inputRate: "INPUT_USD_PER_MILLION",
    outputRate: "OUTPUT_USD_PER_MILLION",
    maxOutputTokens: "MAX_OUTPUT_TOKENS",
  };
  const p = { ...defaultPolicy };
  for (const k of Object.keys(keys) as (keyof Policy)[])
    if (env[keys[k]] !== undefined) p[k] = Number(env[keys[k]]);
  for (const [k, v] of Object.entries(p))
    if (!Number.isFinite(v) || v < 0) throw new Error(`Invalid policy ${k}`);
  for (const k of [
    "concurrency",
    "rpm",
    "maxAttempts",
    "timeoutMs",
    "maxOutputTokens",
  ] as const)
    if (!Number.isInteger(p[k]) || p[k] < 1)
      throw new Error(`${k} must be a positive integer`);
  if (!Number.isInteger(p.retries) || p.retries > 3)
    throw new Error("MAX_RETRIES must be 0..3");
  if (!p.inputRate || !p.outputRate)
    throw new Error("Planning token rates must be positive");
  return p;
}
export class Trace {
  constructor(
    readonly path: string,
    readonly runId: string,
  ) {}
  write(row: Record<string, unknown>): void {
    appendFileSync(
      this.path,
      JSON.stringify({
        runId: this.runId,
        at: new Date().toISOString(),
        ...row,
      }) + "\n",
    );
  }
}
export function disableCloudTelemetry(): void {
  // Core 4.1.0 sends full loop payloads if cloud credentials are discovered.
  process.env.MOZAIK_API_KEY = "";
  process.env.MOZAIK_PROJECT_KEY = "";
  process.env.MOZAIK_CREDENTIALS_FILE = join(
    tmpdir(),
    `einstein-no-cloud-${randomUUID()}`,
  );
}
export function modelConfig(
  mode: "mock" | "live",
  env = process.env,
): { model: string; provider: string } {
  if (mode === "mock") return { model: "mock-evidence-v1", provider: "mock" };
  const provider = env.PROVIDER ?? "gemini";
  if (!["gemini", "anthropic"].includes(provider))
    throw new Error("PROVIDER must be gemini or anthropic");
  const model =
    env.MODEL ||
    (provider === "gemini" ? "gemini-3.5-flash-lite" : "claude-haiku-4-5");
  const m = supportedModels.find(
    (m) =>
      m.specification.name === model &&
      m.specification.provider ===
        (provider === "gemini" ? "google" : "anthropic"),
  );
  if (!m)
    throw new Error(
      `Model ${model} is not registered for ${provider} in Mozaik 4.1.0`,
    );
  if (!env[provider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY"])
    throw new Error(
      `Missing ${provider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY"}`,
    );
  return { model, provider };
}
export function liveRunner(
  model: string,
  provider: string,
  policy: Policy,
): InferenceRunner {
  const bundled = supportedModels.find((m) => m.specification.name === model)!;
  const mapper = bundled.endpoint.endpointMapper;
  // Keep Mozaik model validation and native mappers. SDK adapters disable hidden
  // retries so every HTTP inference attempt passes through the shared limiter.
  const gemini =
    provider === "gemini"
      ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
      : null;
  const anthropic =
    provider === "anthropic"
      ? new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
          maxRetries: 0,
          timeout: policy.timeoutMs,
        })
      : null;
  const endpoint = {
    endpointMapper: mapper,
    async infer(input: InferenceInput): Promise<InferenceOutput> {
      if (gemini) {
        const request = mapper.toRequest(input) as GenerateContentParameters;
        request.config = {
          ...request.config,
          maxOutputTokens: input.maxOutputTokens,
          httpOptions: {
            timeout: policy.timeoutMs,
            retryOptions: { attempts: 1 },
          },
        };
        return mapper.toResponse(await gemini.models.generateContent(request));
      }
      return mapper.toResponse(
        await anthropic!.messages.create({
          ...mapper.toRequest(input),
          stream: false,
        }),
      );
    },
    async *stream(input: InferenceInput): AsyncGenerator<SemanticEvent> {
      yield SemanticEvent.create(
        "inference.output",
        input.model,
        await this.infer(input),
      );
    },
  };
  class Holder extends RuntimeState {}
  return defineRuntime<Holder>()
    .initializeRuntime({
      state: new Holder(),
      inferenceRunnerConfig: { supportedModels: [{ ...bundled, endpoint }] },
    })
    .getInferenceRunner();
}
export const sleep = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));
export function jsonOutput(value: unknown): InferenceOutput {
  return {
    items: [ModelMessageItem.rehydrate({ text: JSON.stringify(value) })],
    tokenUsage: undefined,
    rowResponse: { synthetic: true },
  };
}
export class ControlledRunner implements InferenceRunner {
  active = 0;
  peak = 0;
  attempts = 0;
  spent = 0;
  reserved = 0;
  readonly taskFailures = new Map<string, string>();
  readonly outputErrors = new Map<string, string>();
  private starts: number[] = [];
  readonly taskTotals = new Map<
    string,
    { usage: Usage | null; estimatedCostUsd: number | null; attempts: number }
  >();
  constructor(
    private inner: InferenceRunner,
    readonly policy: Policy,
    private trace: Trace,
    private meta: (contextId: string) => TaskMeta,
    private mock: boolean,
    private windowMs = 60000,
  ) {}
  private reserveCost(input: InferenceInput): number {
    // Byte count is a conservative planning input-token proxy, not a tokenizer.
    return (
      (Buffer.byteLength(JSON.stringify(input.context.getItems())) *
        this.policy.inputRate +
        this.policy.maxOutputTokens * this.policy.outputRate) /
      1e6
    );
  }
  async run(input: InferenceInput): Promise<InferenceOutput> {
    const { runId, taskId, agent, loopId, model } = this.meta(input.context.id);
    const meta = { runId, taskId, agent, loopId, model };
    const deadline = Date.now() + this.policy.timeoutMs;
    try {
      for (let attempt = 0; attempt <= this.policy.retries; attempt++) {
        const reserve = this.mock ? 0 : this.reserveCost(input);
        while (true) {
          if (Date.now() >= deadline) throw new Error("ADMISSION_TIMEOUT");
          if (this.attempts >= this.policy.maxAttempts)
            throw new Error("CALL_BUDGET_STOP");
          if (this.spent + this.reserved + reserve > this.policy.budgetUsd)
            throw new Error("COST_BUDGET_STOP");
          this.starts = this.starts.filter(
            (t) => Date.now() - t < this.windowMs,
          );
          if (
            this.active < this.policy.concurrency &&
            this.starts.length < this.policy.rpm
          )
            break;
          await sleep(Math.min(25, Math.max(1, deadline - Date.now())));
        }
        // Atomic reservation before awaiting provider; shared by every agent.
        this.attempts++;
        this.active++;
        this.peak = Math.max(this.peak, this.active);
        this.reserved += reserve;
        this.starts.push(Date.now());
        const startedAt = new Date().toISOString();
        const start = performance.now();
        let usage: Usage | null = null;
        let cost: number | null = this.mock ? 0 : null;
        let errorCode: string | null = null;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let timedOut = false;
        try {
          const pending = this.inner.run(input);
          // Keep capacity reserved until the actual request settles on timeout.
          const output = await Promise.race([
            pending,
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                timedOut = true;
                reject(new Error("PROVIDER_TIMEOUT"));
              }, this.policy.timeoutMs);
            }),
          ]).catch((error) => {
            if (timedOut)
              void pending.then(
                () => {
                  this.active--;
                },
                () => {
                  this.active--;
                },
              );
            throw error;
          });
          usage = output.tokenUsage
            ? {
                inputTokens: output.tokenUsage.inputTokens,
                outputTokens: output.tokenUsage.outputTokens,
                totalTokens: output.tokenUsage.totalTokens,
              }
            : null;
          cost = this.mock
            ? 0
            : usage
              ? (usage.inputTokens * this.policy.inputRate +
                  usage.outputTokens * this.policy.outputRate) /
                1e6
              : null;
          this.spent += cost ?? reserve;
          // Core 4.1.0 cannot transition from an empty/reasoning-only output.
          // Agents have no tools: a function call is also invalid output.
          // Supply a terminal answer event so the workflow can send it back,
          // retaining actual usage rather than classifying it as HTTP failure.
          if (!output.items.some((item) => item instanceof ModelMessageItem) ||
              output.items.some((item) => item.type === "function_call")) {
            this.outputErrors.set(taskId, "Agent returned no text answer or an unexpected tool call; return the requested JSON object");
            return { ...output, items: [ModelMessageItem.rehydrate({ text: "" })] };
          }
          return output;
        } catch (error) {
          const status =
            (error as { status?: number; code?: number })?.status ??
            (error as { code?: number })?.code;
          errorCode = timedOut
            ? "PROVIDER_TIMEOUT"
            : typeof status === "number"
              ? `HTTP_${status}`
              : "PROVIDER_ERROR";
          this.spent += reserve; // Unknown charges retain the full planning reservation.
          if (
            timedOut ||
            attempt >= this.policy.retries ||
            !(
              status === 429 ||
              (typeof status === "number" && status >= 500 && status < 600)
            )
          )
            throw new Error(errorCode);
        } finally {
          clearTimeout(timer);
          if (!timedOut) this.active--;
          this.reserved -= reserve;
          const previous = this.taskTotals.get(taskId);
          const totalUsage = previous
            ? previous.usage && usage
              ? {
                  inputTokens: previous.usage.inputTokens + usage.inputTokens,
                  outputTokens:
                    previous.usage.outputTokens + usage.outputTokens,
                  totalTokens: previous.usage.totalTokens + usage.totalTokens,
                }
              : null
            : usage;
          const totalCost = previous
            ? previous.estimatedCostUsd !== null && cost !== null
              ? previous.estimatedCostUsd + cost
              : null
            : cost;
          this.taskTotals.set(taskId, {
            usage: totalUsage,
            estimatedCostUsd: totalCost,
            attempts: (previous?.attempts ?? 0) + 1,
          });
          this.trace.write({
            ...meta,
            type: "provider_attempt",
            attempt: attempt + 1,
            startedAt,
            endedAt: new Date().toISOString(),
            durationMs: performance.now() - start,
            usage,
            estimatedCostUsd: cost,
            costBasis: this.mock
              ? "mock; no provider call"
              : "configured planning rates; not a bill",
            reservationUsd: reserve,
            errorCode,
          });
        }
        await sleep(100 * 2 ** attempt);
      }
      throw new Error("RETRIES_EXHAUSTED");
    } catch (error) {
      // Mozaik 4.1.0 does not catch rejected runLoop promises. Carry failures
      // through a typed application envelope, never an accepted proposal.
      const code = error instanceof Error ? error.message : "INFERENCE_FAILURE";
      this.taskFailures.set(taskId, code);
      this.trace.write({ ...meta, type: "task_failure", errorCode: code });
      return jsonOutput({ applicationError: code });
    }
  }
  async *stream(input: InferenceInput): AsyncGenerator<SemanticEvent> {
    yield SemanticEvent.create(
      "inference.output",
      input.model,
      await this.run(input),
    );
  }
}
