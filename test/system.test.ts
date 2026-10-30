import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Socket } from "node:net";
import {
  ModelContext,
  UserMessageItem,
  SemanticEvent,
  type InferenceRunner,
  type InferenceInput,
} from "@mozaik-ai/core";
import { Dataset, LexicalIndex, tokens, type RecordData } from "../src/data.js";
import { checkProposal, checkReview, formatFor } from "../src/contracts.js";
import {
  defaultPolicy,
  ControlledRunner,
  Trace,
  jsonOutput,
  sleep,
  modelConfig,
  policyFromEnv,
  liveRunner,
} from "../src/inference.js";
import { runWorkflow } from "../src/workflow.js";
import { reportTrace } from "../src/trace-report.js";

// Tiny authored fixtures, not copies of the organizer's dataset. No download.
function fixture(): Dataset {
  const db = new Dataset();
  function add(
    kind: string,
    record: RecordData,
    researcherIds: string[] = [],
  ): void {
    db.add({
      id: record.id,
      kind,
      record,
      researcherIds,
      file: "test-fixture",
      locator: "authored test only",
    });
  }
  const domains = [
    ["Modbus anomaly detection", "unsupervised ICS anomaly detection"],
    ["PCB emissions EMC", "Gerber PCB layout EMC emission analysis"],
    ["Raspberry packaging mold", "berry packaging film permeability"],
  ];
  domains.forEach(([challenge, evidence], i) => {
    const companyId = `C90${i + 1}`,
      id = `${companyId}-CH1`,
      rid = `R900${i + 1}`,
      wid = `TEST-WORK-${i + 1}`;
    add("company", {
      id: companyId,
      name: "Fictional fixture company",
      rd_capacity: "A scoping meeting can consider a small pilot.",
    });
    add("challenge", {
      id,
      text: challenge,
      detail: `Investigate ${challenge} with a controlled experiment.`,
    });
    db.challenges.set(id, { companyId, source: db.sources.get(id)! });
    add(
      "researcher",
      {
        id: rid,
        name: "Same Name",
        fields: [evidence],
        bio: "",
        open_to: [],
        notes: i === 0 ? "Profile is old; confirm availability." : "",
      },
      [rid],
    );
    add(
      "publication",
      {
        id: wid,
        title: evidence,
        abstract: `This fictional test record describes ${evidence}.`,
        authors: [{ researcher_id: rid }],
      },
      [rid],
    );
  });
  add("company", {
    id: "C999",
    name: "Fixture employer",
    rd_capacity: "Unknown",
  });
  add("challenge", {
    id: "C999-CH1",
    text: "Hire a full-time accountant next week",
    detail: "A recruitment need, no experimental objective.",
  });
  db.challenges.set("C999-CH1", {
    companyId: "C999",
    source: db.sources.get("C999-CH1")!,
  });
  return db;
}
function rows(path: string): any[] {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .map((s) => JSON.parse(s));
}
const request = (): InferenceInput => ({
  model: "mock-evidence-v1",
  context: ModelContext.create().addContextItem(
    UserMessageItem.create("fixture request"),
  ),
});
function runner(fn: InferenceRunner["run"]): InferenceRunner {
  return {
    run: fn,
    async *stream(input) {
      yield SemanticEvent.create(
        "inference.output",
        "fixture",
        await fn(input),
      );
    },
  };
}
function controlled(
  inner: InferenceRunner,
  overrides: Partial<typeof defaultPolicy> = {},
  window = 60000,
  mock = true,
) {
  const directory = mkdtempSync(join(tmpdir(), "einstein-policy-"));
  const trace = new Trace(join(directory, "trace.jsonl"), "test-run");
  return {
    r: new ControlledRunner(
      inner,
      { ...defaultPolicy, ...overrides },
      trace,
      () => ({
        runId: "test-run",
        taskId: "test-task",
        agent: "test",
        loopId: "loop",
        model: "mock",
      }),
      mock,
      window,
    ),
    trace,
  };
}
function outputValue(output: Awaited<ReturnType<InferenceRunner["run"]>>): any {
  return JSON.parse(
    (output.items[0] as { content: { text: string } }).content.text,
  );
}

test("offline Mozaik run: simultaneous findings, shared state, critic correction, 3 distinct pairs, abstention", async () => {
  const originalFetch = globalThis.fetch;
  const originalConnect = Socket.prototype.connect;
  globalThis.fetch = async () => {
    throw new Error("NETWORK FORBIDDEN in mock tests");
  };
  Socket.prototype.connect = function () {
    throw new Error("NETWORK FORBIDDEN in mock tests");
  } as typeof Socket.prototype.connect;
  try {
    const db = fixture();
    const out = await runWorkflow(db, {
      mode: "mock",
      challengeIds: [...db.challenges.keys()],
      outDir: mkdtempSync(join(tmpdir(), "einstein-workflow-")),
      policy: defaultPolicy,
      injectUnsupported: true,
      taskTimeoutMs: 3000,
    });
    assert.equal(out.peak, 2);
    assert.deepEqual(
      out.results.map((r) => r.status),
      ["accepted", "accepted", "accepted", "no_good_match"],
    );
    assert.equal(
      new Set(out.results.slice(0, 3).map((r) => r.proposal!.researcherId))
        .size,
      3,
    );
    const trace = rows(join(out.directory, "trace.jsonl"));
    for (const result of out.results.slice(0, 3)) {
      assert.deepEqual(
        result.reviews.map((r) => r.decision),
        ["revise", "accept"],
      );
      assert.ok(
        result.reviews[0].issues.some((x) => x.includes("Unsupported quote")),
      );
      assert.ok(!JSON.stringify(result.proposal).includes("99%"));
      assert.deepEqual(
        checkProposal(
          db,
          result.challengeId,
          new LexicalIndex(db).search(
            String(db.challenges.get(result.challengeId)!.source.record.text),
          ),
          result.proposal!,
        ),
        [],
      );
      const company = trace.find(
        (r) =>
          r.type === "loop_finished" &&
          r.taskId.startsWith(result.challengeId) &&
          r.agent === "Company Analyst",
      );
      const research = trace.find(
        (r) =>
          r.type === "loop_finished" &&
          r.taskId.startsWith(result.challengeId) &&
          r.agent === "Research Profiler",
      );
      assert.ok(
        Math.min(Date.parse(company.endedAt), Date.parse(research.endedAt)) >
          Math.max(
            Date.parse(company.startedAt),
            Date.parse(research.startedAt),
          ),
      );
      const writer = trace.findIndex(
        (r) =>
          r.type === "loop_started" &&
          r.taskId === `${result.challengeId}/Matchmaker / Proposal Writer/0`,
      );
      const writes = trace
        .slice(0, writer)
        .filter(
          (r) =>
            r.type === "shared_state_write" &&
            r.challengeId === result.challengeId,
        );
      assert.equal(writes.length, 2, "writer waits for both shared findings");
    }
    assert.ok(
      trace
        .filter((r) => r.type === "loop_finished")
        .every(
          (r) =>
            r.runId &&
            r.taskId &&
            r.loopId &&
            r.startedAt &&
            r.endedAt &&
            r.model &&
            r.usage === null &&
            r.estimatedCostUsd === 0,
        ),
    );
    assert.match(
      reportTrace(join(out.directory, "trace.jsonl")),
      /Unsupported quote/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    Socket.prototype.connect = originalConnect;
  }
});

test("script normalization, name collisions, missing evidence and invalid citations", () => {
  assert.deepEqual(
    tokens("Љубљана Ђорђе Чачак"),
    tokens("Ljubljana Đorđe Čačak"),
  );
  const db = fixture();
  assert.equal(db.researchers.size, 3, "identical names never merged");
  assert.deepEqual(
    db.verify({ recordId: "missing", field: "bio", quote: "hello" }),
    ["Unknown record missing"],
  );
  assert.equal(
    db.verify({ recordId: "R9001", field: "bio", quote: "invented expertise" })
      .length,
    1,
  );
  const index = new LexicalIndex(db);
  assert.equal(
    index.search("Modbus anomaly detection")[0].researcherId,
    "R9001",
  );
  db.sources.get("TEST-WORK-1")!.researcherIds = [];
  assert.equal(
    new LexicalIndex(db).search("Modbus anomaly detection").length,
    0,
    "never use profile-side/name-only attribution",
  );
});

test("critic coverage cannot accept omitted claims or an inconsistent pair", () => {
  const p = {
    researcherId: null,
    evidenceId: null,
    rationale: "No match established",
    facts: [
      {
        recordId: "C999-CH1",
        field: "text",
        quote: "Hire a full-time accountant next week",
      },
    ],
    plan: null,
  };
  assert.ok(
    checkReview(p, {
      decision: "accept",
      checkedClaims: [],
      issues: [],
      fitReason: "fine",
    }).length >= 3,
  );
});

test("call budget reservation is atomic across concurrent loops; failure becomes explicit envelope", async () => {
  let calls = 0;
  const { r } = controlled(
    runner(async () => {
      calls++;
      await sleep(20);
      return jsonOutput({ ok: true });
    }),
    { maxAttempts: 1 },
  );
  const outputs = await Promise.all([r.run(request()), r.run(request())]);
  assert.equal(calls, 1);
  assert.equal(
    outputs.filter(
      (o) => outputValue(o).applicationError === "CALL_BUDGET_STOP",
    ).length,
    1,
  );
});

test("limiter enforces maximum concurrency and sliding request window", async () => {
  const times: number[] = [];
  const { r } = controlled(
    runner(async () => {
      times.push(Date.now());
      await sleep(8);
      return jsonOutput({ ok: true });
    }),
    { concurrency: 1, rpm: 2 },
    90,
  );
  await Promise.all([
    r.run(request()),
    r.run(request()),
    r.run(request()),
    r.run(request()),
  ]);
  assert.equal(r.peak, 1);
  assert.ok(times[2] - times[0] >= 90);
  assert.equal(times.length, 4);
});

test("429 retry is bounded and traced; authentication errors are not retried", async () => {
  let calls = 0;
  const { r, trace } = controlled(
    runner(async () => {
      if (++calls === 1)
        throw Object.assign(new Error("private body"), { status: 429 });
      return jsonOutput({ ok: true });
    }),
  );
  assert.equal(outputValue(await r.run(request())).ok, true);
  assert.equal(calls, 2);
  assert.equal(r.taskTotals.get("test-task")?.attempts, 2);
  assert.equal(
    r.taskTotals.get("test-task")?.usage,
    null,
    "unknown failed-attempt usage is not hidden",
  );
  assert.deepEqual(
    rows(trace.path)
      .filter((r) => r.type === "provider_attempt")
      .map((r) => r.errorCode),
    ["HTTP_429", null],
  );
  const b = controlled(
    runner(async () => {
      throw Object.assign(new Error("secret credential must not be logged"), {
        status: 401,
      });
    }),
  );
  assert.equal(
    outputValue(await b.r.run(request())).applicationError,
    "HTTP_401",
  );
  assert.equal(b.r.attempts, 1);
  assert.ok(!readFileSync(b.trace.path, "utf8").includes("secret credential"));
});

test("monetary stop admits no provider calls; timeout does not release a still-running request slot", async () => {
  let calls = 0;
  const { r } = controlled(
    runner(async () => {
      calls++;
      return jsonOutput({ ok: true });
    }),
    { budgetUsd: 0 },
    60000,
    false,
  );
  assert.equal(
    outputValue(await r.run(request())).applicationError,
    "COST_BUDGET_STOP",
  );
  assert.equal(calls, 0);
  const t = controlled(
    runner(async () => {
      await sleep(80);
      return jsonOutput({ ok: true });
    }),
    { concurrency: 1, timeoutMs: 20 },
  );
  assert.equal(
    outputValue(await t.r.run(request())).applicationError,
    "PROVIDER_TIMEOUT",
  );
  assert.equal(t.r.active, 1);
  await sleep(90);
  assert.equal(t.r.active, 0);
});

test("invalid policy and provider combinations fail before calling a provider", () => {
  assert.throws(
    () => policyFromEnv({ MAX_CONCURRENT: "0" }),
    /positive integer/,
  );
  assert.throws(() => policyFromEnv({ MAX_RETRIES: "4" }), /0..3/);
  assert.deepEqual(modelConfig("mock", {}), {
    model: "mock-evidence-v1",
    provider: "mock",
  });
  assert.throws(
    () =>
      modelConfig("live", {
        PROVIDER: "gemini",
        MODEL: "claude-haiku-4-5",
        GEMINI_API_KEY: "fixture",
      }),
    /not registered/,
  );
  assert.throws(
    () => modelConfig("live", { PROVIDER: "anthropic" }),
    /ANTHROPIC_API_KEY/,
  );
  assert.equal(
    modelConfig("live", { GEMINI_API_KEY: "fixture" }).model,
    "gemini-3.5-flash-lite",
  );
  assert.equal(
    modelConfig("live", { PROVIDER: "anthropic", ANTHROPIC_API_KEY: "fixture" })
      .model,
    "claude-haiku-4-5",
  );
});

test("live adapter construction uses checked Mozaik APIs without making a provider call", () => {
  // Instantiating runners validates the public composition, not live inference.
  for (const [provider, model, key] of [
    ["gemini", "gemini-3.5-flash-lite", "GEMINI_API_KEY"],
    ["anthropic", "claude-haiku-4-5", "ANTHROPIC_API_KEY"],
  ]) {
    const prior = process.env[key];
    process.env[key] = "offline-fixture";
    try {
      assert.equal(
        typeof liveRunner(model, provider, defaultPolicy).run,
        "function",
      );
    } finally {
      if (prior === undefined) delete process.env[key];
      else process.env[key] = prior;
    }
  }
});

test("offline HTTP adapter contracts: provider mapping, output caps, usage and disabled SDK retries", async () => {
  const oldFetch = globalThis.fetch;
  const oldGemini = process.env.GEMINI_API_KEY,
    oldAnthropic = process.env.ANTHROPIC_API_KEY;
  process.env.GEMINI_API_KEY = "offline-fixture";
  process.env.ANTHROPIC_API_KEY = "offline-fixture";
  try {
    for (const [provider, model] of [
      ["gemini", "gemini-3.5-flash-lite"],
      ["anthropic", "claude-haiku-4-5"],
    ]) {
      const bodies: any[] = [];
      globalThis.fetch = async (_url, init) => {
        bodies.push(JSON.parse(String(init?.body)));
        const body =
          provider === "gemini"
            ? {
                candidates: [
                  {
                    content: {
                      parts: [{ text: '{"ok":true}' }],
                      role: "model",
                    },
                    finishReason: "STOP",
                  },
                ],
                usageMetadata: {
                  promptTokenCount: 12,
                  candidatesTokenCount: 6,
                  totalTokenCount: 18,
                },
              }
            : {
                id: "fixture",
                type: "message",
                role: "assistant",
                model,
                content: [{ type: "text", text: '{"ok":true}' }],
                stop_reason: "end_turn",
                stop_sequence: null,
                usage: { input_tokens: 12, output_tokens: 6 },
              };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };
      const input = {
        ...request(),
        model,
        maxOutputTokens: 512,
        structuredOutput: formatFor("Company Analyst"),
      };
      const r = liveRunner(model, provider, defaultPolicy);
      const result = await r.run(input);
      assert.equal(outputValue(result).ok, true);
      assert.equal(result.tokenUsage?.inputTokens, 12);
      assert.equal(bodies.length, 1);
      assert.equal(
        provider === "gemini"
          ? bodies[0].generationConfig.maxOutputTokens
          : bodies[0].max_tokens,
        512,
      );
      assert.ok(
        provider === "gemini"
          ? bodies[0].generationConfig.responseSchema
          : bodies[0].output_config.format.schema,
      );
      let failures = 0;
      globalThis.fetch = async () => {
        failures++;
        return new Response(
          JSON.stringify({
            error: {
              code: 429,
              status: "RESOURCE_EXHAUSTED",
              type: "rate_limit_error",
              message: "offline fixture",
            },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        );
      };
      await assert.rejects(() =>
        liveRunner(model, provider, defaultPolicy).run(input),
      );
      assert.equal(failures, 1, `${provider} SDK retries are disabled`);
    }
  } finally {
    globalThis.fetch = oldFetch;
    if (oldGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldGemini;
    if (oldAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = oldAnthropic;
  }
});

test("review bound refuses an unrepaired draft and unknown challenges are explicit failures", async () => {
  const result = await runWorkflow(fixture(), {
    mode: "mock",
    challengeIds: ["C901-CH1", "C000-CH1"],
    outDir: mkdtempSync(join(tmpdir(), "einstein-stop-")),
    policy: defaultPolicy,
    injectUnsupported: true,
    maxRevisions: 0,
    taskTimeoutMs: 3000,
  });
  assert.deepEqual(
    result.results.map((r) => r.status),
    ["stopped", "stopped"],
  );
  assert.ok(result.results.every((r) => r.proposal === null));
  assert.match(result.results[0].reason, /Review limit/);
  assert.match(result.results[1].reason, /Unknown challenge/);
});
