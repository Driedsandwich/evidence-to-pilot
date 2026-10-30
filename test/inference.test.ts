import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ModelContext, UserMessageItem, type InferenceInput, type InferenceRunner } from "@mozaik-ai/core";
import { ControlledRunner, defaultPolicy, jsonOutput, Trace, liveRunner, modelConfig } from "../src/inference.js";
import { providerErrorDetails, retryAfterMs, sanitizeErrorBody } from "../src/provider-errors.js";
import { formatFor } from "../src/contracts.js";

const request = (model = "mock-evidence-v1"): InferenceInput => ({
  model, context: ModelContext.create().addContextItem(UserMessageItem.create("Authored fixture only")),
  structuredOutput: formatFor("Critic"), maxOutputTokens: 1024,
});
function controlled(inner: InferenceRunner, overrides = {}) {
  const trace = new Trace(join(mkdtempSync(join(tmpdir(), "m3-errors-")), "trace.jsonl"), "fixture");
  const runner = new ControlledRunner(inner, { ...defaultPolicy, retryBaseMs: 8, retryMaxMs: 32, ...overrides }, trace,
    (id) => ({ runId: "fixture", taskId: id, agent: "Critic", loopId: id, model: "fixture" }), true);
  return { runner, rows: () => readFileSync(trace.path, "utf8").trim().split("\n").map((s) => JSON.parse(s)) };
}
const inner = (run: InferenceRunner["run"]): InferenceRunner => ({ run, async *stream() {} });

test("sanitized diagnostics retain status/useful error but omit credentials and arbitrary response fields", () => {
  const clean = sanitizeErrorBody('Unsupported minLength; api_key="abc123" Bearer private-token https://example.test/?key=hidden sk-test-secret exposed', { GEMINI_API_KEY: "exposed" });
  assert.match(clean, /Unsupported minLength/);
  for (const secret of ["abc123", "private-token", "hidden", "sk-test-secret", "exposed"]) assert.ok(!clean.includes(secret));
  assert.ok(sanitizeErrorBody("x".repeat(2000)).length <= 600);
  const details = providerErrorDetails({ status: 400, error: { error: {
    message: "Unsupported constraint", request: { api_key: "never-copy" },
  } }, headers: new Headers({ "retry-after": "2", authorization: "never-copy" }) });
  assert.equal(details.status, 400);
  assert.equal(details.body, "Unsupported constraint");
  assert.equal(details.retryAfter, "2");
  assert.ok(!JSON.stringify(details).includes("never-copy"));
  assert.equal(retryAfterMs("2.5", 0), 2500);
  assert.equal(retryAfterMs("Thu, 01 Jan 1970 00:00:05 GMT", 1000), 4000);
  assert.equal(retryAfterMs("nonsense", 0), null);
});

test("exponential jitter, Retry-After floor and release of capacity during backoff", async () => {
  let calls = 0;
  const c = controlled(inner(async () => {
    if (++calls < 4) throw { status: calls === 2 ? 503 : 429, body: "Temporarily unavailable", headers: { "retry-after": calls === 1 ? "0.02" : "0" } };
    return jsonOutput({ ok: true });
  }), { retries: 3 });
  await c.runner.run(request());
  const waits = c.rows().filter((r) => r.type === "retry_scheduled").map((r) => r.waitMs);
  assert.equal(calls, 4);
  assert.equal(waits[0], 20);
  assert.ok(waits[1] >= 8 && waits[1] <= 16);
  assert.ok(waits[2] >= 16 && waits[2] <= 32);
  assert.equal(c.runner.retryWaitMs, waits.reduce((a, b) => a + b, 0));
  assert.equal(c.runner.active, 0);
});

test("concurrent tasks reserve one run-wide retry wait budget; long Retry-After is never shortened", async () => {
  const c = controlled(inner(async () => { throw { status: 503, body: "Overloaded", headers: { "retry-after": "0.02" } }; }),
    { maxRetryWaitMs: 25, retries: 3 });
  await Promise.all([c.runner.run(request()), c.runner.run(request())]);
  assert.equal(c.runner.retryWaitMs, 20);
  assert.equal(c.runner.attempts, 3);
  assert.equal(c.rows().filter((r) => r.type === "retry_stopped").length, 2);
  assert.ok(c.rows().filter((r) => r.type === "provider_attempt").every((r) => r.errorStatus === 503 && r.errorBody === "Overloaded"));
  const date = new Date(Date.now() + 10000).toUTCString();
  const d = controlled(inner(async () => { throw { status: 429, headers: { "Retry-After": date } }; }), { maxRetryWaitMs: 10 });
  await d.runner.run(request());
  assert.equal(d.runner.attempts, 1);
  assert.equal(d.runner.retryWaitMs, 0);
});

test("role model configuration defaults, overrides and provider validation", () => {
  const env = { GEMINI_API_KEY: "fixture", CRITIC_MODEL: "gemini-3.5-flash-lite" };
  assert.equal(modelConfig("live", env, "Company Analyst").model, "gemini-3.5-flash");
  assert.equal(modelConfig("live", env, "Critic").model, "gemini-3.5-flash-lite");
  assert.equal(modelConfig("live", { ...env, MODEL: "gemini-3.5-flash-lite", WRITER_MODEL: "gemini-3.5-flash" }, "Matchmaker / Proposal Writer").model, "gemini-3.5-flash");
  assert.throws(() => modelConfig("live", { ...env, CRITIC_MODEL: "claude-haiku-4-5" }, "Critic"), /not registered/);
  assert.equal(modelConfig("mock", env, "Critic").model, "mock-evidence-v1");
});

test("real SDK adapters preserve sanitized HTTP bodies/Retry-After and send provider-compatible structured schemas offline", async () => {
  const originalFetch = globalThis.fetch;
  const oldGemini = process.env.GEMINI_API_KEY;
  const oldAnthropic = process.env.ANTHROPIC_API_KEY;
  process.env.GEMINI_API_KEY = "fixture-gemini-secret";
  process.env.ANTHROPIC_API_KEY = "fixture-anthropic-secret";
  try {
    for (const [provider, model] of [["gemini", "gemini-3.5-flash"], ["anthropic", "claude-haiku-4-5"]]) {
      const requests: any[] = [];
      globalThis.fetch = async (_url, init) => {
        requests.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ error: { type: "invalid_request_error", message: "Unsupported minLength fixture-gemini-secret fixture-anthropic-secret" } }),
          { status: 400, headers: { "Content-Type": "application/json", "Retry-After": "1" } });
      };
      const adapter = liveRunner(model, provider, defaultPolicy);
      const c = controlled(adapter);
      await c.runner.run(request(model));
      const attempt = c.rows().find((r) => r.type === "provider_attempt");
      assert.equal(attempt.errorStatus, 400);
      assert.match(attempt.errorBody, /Unsupported minLength/);
      assert.ok(!JSON.stringify(c.rows()).includes("fixture-gemini-secret"));
      assert.ok(!JSON.stringify(c.rows()).includes("fixture-anthropic-secret"));
      assert.equal(requests.length, 1, "400 is not retried");
      if (provider === "anthropic") {
        const schema = requests[0].output_config.format.schema;
        assert.equal(schema.additionalProperties, false);
        assert.equal(schema.properties.verdicts.maxItems, undefined);
        assert.equal(schema.properties.verdicts.items.properties.path.minLength, undefined);
        assert.equal(requests[0].thinking, undefined);
        assert.equal(requests[0].temperature, undefined);
      } else {
        assert.equal(requests[0].generationConfig.responseSchema, undefined);
        assert.ok(requests[0].generationConfig.responseJsonSchema);
      }
      globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: "Overloaded" } }),
        { status: 503, headers: { "Retry-After": "1", "Content-Type": "application/json" } });
      const budgeted = controlled(liveRunner(model, provider, defaultPolicy), { maxRetryWaitMs: 10 });
      await budgeted.runner.run(request(model));
      assert.equal(budgeted.runner.attempts, 1, "SDK preserves server delay; no premature retry");
      assert.equal(budgeted.rows().find((r) => r.type === "retry_stopped").requestedWaitMs, 1000);
      if (provider === "gemini") {
        globalThis.fetch = async () => new Response(new ReadableStream({
          start(controller) { controller.error(new Error("Broken response body")); },
        }), { status: 503, headers: { "Retry-After": "1" } });
        const broken = controlled(liveRunner(model, provider, defaultPolicy), { maxRetryWaitMs: 10 });
        await broken.runner.run(request(model));
        const failure = broken.rows().find((r) => r.type === "provider_attempt");
        assert.equal(failure.errorStatus, 503);
        assert.equal(failure.errorBody, "No provider error body available");
        assert.equal(broken.runner.attempts, 1);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (oldGemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldGemini;
    if (oldAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = oldAnthropic;
  }
});
