import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Socket } from "node:net";
import {
  ModelContext,
  ModelMessageItem,
  ReasoningItem,
  UserMessageItem,
  SemanticEvent,
  type InferenceRunner,
  type InferenceInput,
} from "@mozaik-ai/core";
import { Dataset, LexicalIndex, tokens, normalizeQuote, type RecordData } from "../src/data.js";
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
import { mockAnswer } from "../src/mock.js";
import type { Role } from "../src/contracts.js";

// Tiny authored fixtures, not copies of the organizer's dataset. No download.
function fixture(liveFailureIds = false): Dataset {
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
    const companyId = liveFailureIds && i === 0 ? "C001" : `C90${i + 1}`,
      id = `${companyId}-CH1`,
      rid = liveFailureIds && i === 0 ? "R1015" : `R900${i + 1}`,
      wid = liveFailureIds && i === 0 ? "SYN-PUB-10523" : `TEST-WORK-${i + 1}`;
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
        open_to: liveFailureIds && i === 0 ? ["joint projects", "industrial PhD"] : [],
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
    proseKind: "proposal" as const,
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
      verdicts: [],
      issues: [],
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
      throw Object.assign(new Error("Unauthorized: api_key=fixture-secret"), {
        status: 401,
      });
    }),
  );
  assert.equal(
    outputValue(await b.r.run(request())).applicationError,
    "HTTP_401",
  );
  assert.equal(b.r.attempts, 1);
  assert.ok(!readFileSync(b.trace.path, "utf8").includes("fixture-secret"));
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
    modelConfig("live", { PROVIDER: "gemini", GEMINI_API_KEY: "fixture" }).model,
    "gemini-3.5-flash",
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
          ? bodies[0].generationConfig.responseJsonSchema
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

test("live-1 regression: reconstruct R1015.open_to field-path citation and complete offline", async () => {
  // The original trace records the failure and candidate IDs, NOT the raw
  // model answer. This is a reconstruction with authored field values, not a
  // verbatim provider-response replay or a copy of the organizer dataset.
  const recorded = rows("runs/live-1/trace.jsonl");
  const failure = recorded.find((r) => r.type === "challenge_finished");
  assert.equal(failure.status, "stopped");
  assert.equal(failure.reason, "Invalid agent output: Unsupported quote R1015.open_to");
  assert.ok(recorded.find((r) => r.type === "retrieval").candidates.some(
    (c: any) => c.researcherId === "R1015" && c.evidenceId === "SYN-PUB-10523"));
  const db = fixture(true);
  const citation = { recordId: "R1015", field: "open_to", quote: "R1015.open_to" };
  const field = "joint projects; industrial PhD";
  assert.equal(field.includes(citation.quote), false, "old literal validator reproduces rejection");
  assert.deepEqual(db.resolveCitation(citation), { ...citation, quote: field });
  const result = await runWorkflow(db, {
    mode: "mock", challengeIds: [failure.challengeId], policy: defaultPolicy,
    outDir: mkdtempSync(join(tmpdir(), "einstein-live1-replay-")),
    mockRespond: async (job, input) => {
      const answer = structuredClone(mockAnswer(db, job)) as any;
      const prompt = JSON.stringify(input.context.getItems());
      assert.match(prompt, /exact contiguous field VALUE/);
      if (job.role === "Research Profiler")
        answer.citations = answer.citations.map((c: any) => c.field === "open_to" ? citation : c);
      return jsonOutput(answer);
    },
  });
  assert.equal(result.results[0].status, "accepted");
  assert.equal(result.results[0].proposal!.facts.find((c) => c.field === "open_to")!.quote, field);
  const trace = rows(join(result.directory, "trace.jsonl"));
  assert.ok(trace.some((r) => r.type === "citation_resolved" && r.original.quote === "R1015.open_to"));
  assert.ok(trace.some((r) => r.type === "agent_output"), "future regressions retain actual answers");
});

test("citation resolution never repairs fabricated text, mismatched paths, missing or empty fields", () => {
  const db = fixture(true);
  for (const quote of ["R1015.open_to", "open_to"])
    assert.deepEqual(db.verify({ recordId: "R1015", field: "open_to", quote }), []);
  for (const c of [
    { recordId: "R1015", field: "open_to", quote: "R1008.open_to" },
    { recordId: "R1015", field: "open_to", quote: "R1015.bio" },
    { recordId: "R1015", field: "open_to", quote: "guaranteed supervision" },
    { recordId: "R1015", field: "bio", quote: "R1015.bio" },
    { recordId: "R1015", field: "missing", quote: "R1015.missing" },
    { recordId: "unknown", field: "open_to", quote: "unknown.open_to" },
    { recordId: "R1015", field: "toString", quote: "R1015.toString" },
  ]) {
    assert.deepEqual(db.resolveCitation(c), c);
    assert.equal(db.verify(c).length, 1);
  }
});

test("JSON and schema failures go back to each producing agent with exact feedback; only valid findings publish", async () => {
  for (const role of ["Company Analyst", "Research Profiler", "Matchmaker / Proposal Writer", "Critic"] as Role[]) {
    for (const fault of ["json", "schema", "content", "empty", "reasoning"] as const) {
      const db = fixture();
      let calls = 0;
      let feedbackSeen = false;
      const result = await runWorkflow(db, {
        mode: "mock", challengeIds: ["C901-CH1"], policy: defaultPolicy,
        outDir: mkdtempSync(join(tmpdir(), "einstein-sendback-")),
        mockRespond: async (job, input) => {
          const answer = structuredClone(mockAnswer(db, job)) as any;
          if (job.role !== role) return jsonOutput(answer);
          if (++calls > 1) {
            if (role === "Matchmaker / Proposal Writer" && fault === "content") {
              assert.ok(job.errors?.some((e) => e.includes("Unsupported quote")));
            } else {
              assert.ok(job.feedback?.messages.length);
              assert.equal(job.feedback.round, 1);
              assert.ok(JSON.stringify(input.context.getItems()).includes("validationFeedback"));
              assert.ok(job.feedback.previousOutput !== undefined);
            }
            feedbackSeen = true;
            return jsonOutput(answer);
          }
          if (fault === "json") return {
            items: [ModelMessageItem.rehydrate({ text: "{broken JSON" })],
            tokenUsage: undefined, rowResponse: { synthetic: true },
          };
          if (fault === "empty" || fault === "reasoning") return {
            items: fault === "empty" ? [] : [ReasoningItem.rehydrate({
              content: undefined, encryptedContent: undefined, summary: [],
            })],
            tokenUsage: undefined, rowResponse: { synthetic: true },
          };
          // A model cannot impersonate the runner's terminal error envelope.
          if (fault === "schema") return jsonOutput({ applicationError: "CALL_BUDGET_STOP" });
          if (role === "Critic") answer.verdicts = [];
          else (answer.citations ?? answer.facts)[0].quote = "Unsupported invented evidence";
          return jsonOutput(answer);
        },
      });
      assert.equal(result.results[0].status, "accepted", `${role}/${fault}`);
      assert.equal(calls, 2, `${role} repairs its own output`);
      assert.ok(feedbackSeen);
      const trace = rows(join(result.directory, "trace.jsonl"));
      const back = trace.find((r) => r.type === "send_back");
      assert.equal(back.agent, role);
      assert.ok(back.messages.length);
      if (role === "Company Analyst" || role === "Research Profiler") {
        const writes = trace.filter((r) => r.type === "shared_state_write" && r.agent === role);
        assert.equal(writes.length, 1);
        assert.ok(trace.indexOf(writes[0]) > trace.indexOf(back));
      }
      if (role === "Critic") assert.equal(trace.filter((r) => r.type === "draft").length, 1,
        "critic coverage errors must not waste writer revisions");
    }
  }
});

test("empty researcher IDs are repaired before publishing shared findings", async () => {
  const db = fixture();
  let calls = 0;
  const result = await runWorkflow(db, {
    mode: "mock", challengeIds: ["C901-CH1"], policy: defaultPolicy,
    outDir: mkdtempSync(join(tmpdir(), "einstein-empty-id-")),
    mockRespond: async (job) => {
      if (job.role === "Research Profiler" && ++calls === 1)
        return jsonOutput({ researcherId: "", evidenceId: "", interpretation: "Unknown", citations: [] });
      return jsonOutput(mockAnswer(db, job));
    },
  });
  assert.equal(result.results[0].status, "accepted");
  assert.equal(calls, 2);
  const trace = rows(join(result.directory, "trace.jsonl"));
  assert.equal(trace.filter((r) => r.type === "shared_state_write" && r.key === "research").length, 1);
  assert.equal(trace.find((r) => r.type === "send_back").agent, "Research Profiler");
});

test("persistent validation failure receives two repairs then stops; summary drains sibling loops", async () => {
  for (const role of ["Company Analyst", "Critic"] as Role[]) {
    const db = fixture();
    let calls = 0;
    const result = await runWorkflow(db, {
      mode: "mock", challengeIds: ["C901-CH1"], policy: defaultPolicy,
      outDir: mkdtempSync(join(tmpdir(), "einstein-bounded-repair-")),
      mockRespond: async (job) => {
        if (job.role === role) { calls++; return jsonOutput({ invalid: true }); }
        if (job.role === "Research Profiler") await sleep(100);
        return jsonOutput(mockAnswer(db, job));
      },
    });
    assert.equal(calls, 3);
    assert.equal(result.results[0].status, "stopped");
    assert.equal(result.results[0].proposal, null);
    assert.match(result.results[0].reason, /Validation correction limit/);
    const trace = rows(join(result.directory, "trace.jsonl"));
    assert.equal(trace.filter((r) => r.type === "send_back").length, 2);
    assert.equal(trace.at(-1).type, "run_finished");
    assert.equal(trace.filter((r) => r.type === "loop_started").length,
      trace.filter((r) => r.type === "loop_finished").length);
    assert.equal(trace.at(-1).mockInvocations,
      trace.filter((r) => r.type === "provider_attempt").length);
  }
});

test("three challenges finish both critic revision rounds within default call, rate and cost limits", async () => {
  const db = fixture();
  const result = await runWorkflow(db, {
    mode: "mock", challengeIds: ["C901-CH1", "C902-CH1", "C903-CH1"],
    policy: defaultPolicy,
    outDir: mkdtempSync(join(tmpdir(), "einstein-three-budget-")),
    mockRespond: async (job) => {
      const answer = structuredClone(mockAnswer(db, job)) as any;
      if (job.role === "Critic" && job.revision < 2) {
        answer.decision = "revise";
        answer.issues = ["Clarify the proposed go/no-go decision with the company before any pilot."];
      }
      return jsonOutput(answer);
    },
  });
  assert.deepEqual(result.results.map((r) => r.status), ["accepted", "accepted", "accepted"]);
  const trace = rows(join(result.directory, "trace.jsonl"));
  const tasks = trace.filter((r) => r.type === "loop_finished");
  assert.equal(tasks.length, 24);
  assert.ok(tasks.length <= defaultPolicy.rpm);
  assert.equal(trace[0].callEstimate.normalTasks, 12);
  assert.equal(trace[0].callEstimate.boundedTasks, 51);
  assert.equal(trace[0].callEstimate.boundedProviderAttempts, 102);
  // A worst-case recovery plus retries may hit the unchanged call ceiling.
  assert.equal(defaultPolicy.maxAttempts, 96);
  // Costs of mock calls are zero; live bill/semantic convergence is untested.
  assert.equal(trace.at(-1).estimatedAccountedUsd, 0);
});

test("exhausted 429/503 retries stop only the affected challenge; subsequent pairs still finish", async () => {
  const db = fixture();
  const result = await runWorkflow(db, {
    mode: "mock", challengeIds: ["C901-CH1", "C902-CH1", "C903-CH1"],
    policy: { ...defaultPolicy, retryBaseMs: 1, retryMaxMs: 2 },
    outDir: mkdtempSync(join(tmpdir(), "einstein-http-continue-")),
    mockRespond: async (job) => {
      if (job.role === "Company Analyst" && job.challengeId !== "C903-CH1")
        throw Object.assign(new Error("Transient provider failure"), {
          status: job.challengeId === "C901-CH1" ? 503 : 429,
        });
      return jsonOutput(mockAnswer(db, job));
    },
  });
  assert.deepEqual(result.results.map((r) => r.status), ["stopped", "stopped", "accepted"]);
  assert.deepEqual(result.results.slice(0, 2).map((r) => r.reason), ["HTTP_503", "HTTP_429"]);
  const trace = rows(join(result.directory, "trace.jsonl"));
  assert.equal(trace.filter((r) => r.type === "retry_scheduled").length, 2);
  assert.equal(trace.at(-1).type, "run_finished");
});

test("quote normalization preserves contiguous evidence, field identity, diacritics and negation", () => {
  const db = fixture();
  db.sources.get("R9001")!.record.bio = '  ＭＯＤＢＵＳ\u00a0 “Traffic”\n\t analysis: kuća, čip, đak, džep; NOT certified. ';
  for (const quote of ['modbus "traffic" analysis', 'КУЋА, ЧИП, ЂАК, ЏЕП', 'not certified'])
    assert.deepEqual(db.verify({ recordId: "R9001", field: "bio", quote }), []);
  assert.equal(normalizeQuote('c\u030Cip'), normalizeQuote('чип'));
  for (const quote of ['kuca', 'cip', 'djak', 'dzep', 'analysis certified', 'modbus; certified', '   '])
    assert.ok(db.verify({ recordId: "R9001", field: "bio", quote }).length, quote);
  for (const [recordId, field] of [['R9002', 'bio'], ['R9001', 'notes'], ['r9001', 'bio'], ['R9001', 'BIO']])
    assert.ok(db.verify({ recordId, field, quote: 'modbus "traffic" analysis' }).length);
});

test("live-6 recorded quotes remain rejected when they stitch nonadjacent passages or array items", () => {
  const failures = rows('runs/live-6/trace.jsonl').filter((r) =>
    r.type === 'validation_failed' && r.agent === 'Research Profiler');
  const targets = ['SYN-PUB-10477.abstract', 'R1008.keywords', 'R1008.open_to', 'R0637.open_to'];
  for (const target of targets) {
    const citation = failures.flatMap((r) => r.previousOutput.citations).find((c: any) =>
      `${c.recordId}.${c.field}` === target);
    assert.ok(citation, target);
    const parts: string[] = citation.quote.split('; ');
    assert.ok(parts.length > 1);
    // Exact rejected responses come from the preserved trace. Source shape is
    // reconstructed with an authored gap, not a copy of the organizer dataset.
    // Live source inspection confirmed these omitted spans/items (README M4).
    const db = new Dataset();
    const field = citation.field === 'abstract' ? parts.join('. Intervening source sentence. ')
      : parts.flatMap((part, i) => i ? ['Intervening source item', part] : [part]);
    db.add({ id: citation.recordId, kind: 'fixture', researcherIds: [],
      record: { id: citation.recordId, [citation.field]: field },
      file: 'authored-reconstruction', locator: target });
    assert.ok(db.verify(citation).length, target);
    for (const quote of parts) assert.deepEqual(db.verify({ ...citation, quote }), []);
  }
});

test("live-6 open_to failure drops an optional claim after corrections and supplies copy-ready fields", async () => {
  const bad = rows('runs/live-6/trace.jsonl').find((r) => r.type === 'validation_failed' &&
    r.challengeId === 'C025-CH1').previousOutput.citations.find((c: any) => c.field === 'open_to');
  const db = fixture();
  const parts = bad.quote.split('; ');
  db.sources.get('R9001')!.record.open_to = [parts[0], 'An intervening option', parts[1]];
  let calls = 0;
  const result = await runWorkflow(db, {
    mode: 'mock', challengeIds: ['C901-CH1'], policy: defaultPolicy,
    outDir: mkdtempSync(join(tmpdir(), 'einstein-drop-optional-')),
    mockRespond: async (job, input) => {
      const answer = structuredClone(mockAnswer(db, job)) as any;
      const prompt = JSON.stringify(input.context.getItems());
      if (job.role === 'Research Profiler') {
        calls++;
        assert.match(prompt, /5 to 25 words/);
        assert.match(prompt, /never skip items/);
        assert.ok(prompt.includes(`${parts[0]}; An intervening option; ${parts[1]}`));
        answer.citations = answer.citations.filter((c: any) => c.field !== 'open_to');
        answer.citations.push({ ...bad, recordId: 'R9001' });
        answer.interpretation = 'Unsupported availability premise that must be discarded.';
      }
      if (job.role === 'Matchmaker / Proposal Writer') {
        assert.ok(!job.research!.interpretation.includes('Unsupported availability'));
        assert.ok(!job.research!.citations.some((c) => c.quote === bad.quote));
      }
      return jsonOutput(answer);
    },
  });
  assert.equal(calls, 3);
  assert.equal(result.results[0].status, 'accepted');
  const trace = rows(join(result.directory, 'trace.jsonl'));
  assert.equal(trace.filter((r) => r.type === 'claim_dropped').length, 1);
  assert.equal(trace.filter((r) => r.type === 'shared_state_write' && r.key === 'research').length, 1);
});

test("dropping essential analyst work evidence yields reviewed no-match, not an accepted pair", async () => {
  const db = fixture();
  const result = await runWorkflow(db, {
    mode: 'mock', challengeIds: ['C901-CH1'], policy: defaultPolicy,
    outDir: mkdtempSync(join(tmpdir(), 'einstein-drop-essential-')),
    mockRespond: async (job) => {
      const answer = structuredClone(mockAnswer(db, job)) as any;
      if (job.role === 'Research Profiler')
        answer.citations = answer.citations.map((c: any) => c.field === 'abstract'
          ? { ...c, quote: 'Invented substantive evidence' } : c);
      return jsonOutput(answer);
    },
  });
  assert.equal(result.results[0].status, 'no_good_match');
  assert.equal(result.results[0].proposal!.researcherId, null);
  assert.equal(result.results[0].reviews.at(-1)!.decision, 'no_good_match');
});

test("persistent optional writer claim is dropped and the complete reduced draft is reviewed again", async () => {
  for (const essential of [false, true]) {
    const db = fixture();
    let criticCalls = 0;
    const result = await runWorkflow(db, {
      mode: 'mock', challengeIds: ['C901-CH1'], policy: defaultPolicy,
      outDir: mkdtempSync(join(tmpdir(), 'einstein-writer-drop-')),
      mockRespond: async (job) => {
        const answer = structuredClone(mockAnswer(db, job)) as any;
        if (job.role === 'Matchmaker / Proposal Writer') {
          if (essential) answer.facts.find((c: any) => c.field === 'abstract').quote = 'Invented work';
          else answer.facts.push({ recordId: 'R9001', field: 'bio', quote: 'Invented optional fact' });
        }
        if (job.role === 'Critic') criticCalls++;
        return jsonOutput(answer);
      },
    });
    assert.equal(result.results[0].status, essential ? 'stopped' : 'accepted');
    assert.equal(criticCalls, essential ? 3 : 4);
    if (!essential) {
      assert.ok(!result.results[0].proposal!.facts.some((c) => c.quote.includes('Invented')));
      assert.deepEqual(checkReview(result.results[0].proposal!, result.results[0].reviews.at(-1)!), []);
      const trace = rows(join(result.directory, 'trace.jsonl'));
      assert.equal(trace.filter((r) => r.type === 'claim_recovery').length, 1);
      const tasks = trace.filter((r) => r.type === 'loop_finished');
      assert.equal(new Set(tasks.map((r) => r.taskId)).size, tasks.length);
    }
  }
});

test("live-6 rationale regression: proposals are labelled; hidden factual premises still require rejection", async () => {
  const recorded = rows('runs/live-6/trace.jsonl').find((r) => r.type === 'critic_review' && r.revision === 2);
  assert.ok(recorded.review.issues.some((issue: string) => issue.includes('directly applicable')));
  for (const inventedPremise of [false, true]) {
    const db = fixture();
    const result = await runWorkflow(db, {
      mode: 'mock', challengeIds: ['C901-CH1'], policy: defaultPolicy,
      outDir: mkdtempSync(join(tmpdir(), 'einstein-judgement-')),
      mockRespond: async (job, input) => {
        const answer = structuredClone(mockAnswer(db, job)) as any;
        if (job.role === 'Matchmaker / Proposal Writer') {
          answer.rationale = 'Proposal: judge this mechanism potentially directly applicable, subject to a transfer experiment.';
          if (inventedPremise) answer.plan.companyAsk = 'The company has already secured funding and a certified lab.';
        }
        if (job.role === 'Critic') {
          const prompt = JSON.stringify(input.context.getItems());
          assert.match(prompt, /claimKinds/);
          assert.match(prompt, /quoted_fact/);
          assert.match(prompt, /need not itself appear in a source/);
          assert.match(prompt, /even under a proposal label/);
          assert.equal(job.draft!.proseKind, 'proposal');
          // Scripted contract test, not evidence of a live model's judgement.
          if (inventedPremise) {
            answer.decision = 'revise';
            answer.verdicts.find((v: any) => v.path === 'plan.companyAsk').status = 'unsupported';
            answer.issues = ['Remove invented secured funding and certified lab; request them conditionally.'];
          }
        }
        return jsonOutput(answer);
      },
    });
    assert.equal(result.results[0].status, inventedPremise ? 'stopped' : 'accepted');
  }
});

test("rationale recovery is bounded and cannot override a continued semantic rejection", async () => {
  for (const keepRejecting of [false, true]) {
    const db = fixture();
    let reviews = 0;
    const result = await runWorkflow(db, {
      mode: 'mock', challengeIds: ['C901-CH1'], policy: defaultPolicy,
      outDir: mkdtempSync(join(tmpdir(), 'einstein-rationale-drop-')),
      mockRespond: async (job) => {
        const answer = structuredClone(mockAnswer(db, job)) as any;
        if (job.role === 'Critic' && (++reviews <= 3 || keepRejecting)) {
          answer.decision = 'revise';
          answer.verdicts.find((v: any) => v.path === 'rationale').status = 'unsupported';
          answer.issues = ['Remove the unsupported transfer assertion.'];
        }
        return jsonOutput(answer);
      },
    });
    assert.equal(reviews, 4);
    assert.equal(result.results[0].status, keepRejecting ? 'stopped' : 'accepted');
    if (!keepRejecting) assert.match(result.results[0].proposal!.rationale, /Transfer, resources and participation remain unconfirmed/);
  }
});
