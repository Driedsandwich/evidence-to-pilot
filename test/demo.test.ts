import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("standalone demo runs without data, credentials or provider access", () => {
  const cwd = mkdtempSync(join(tmpdir(), "evidence-demo-"));
  const env = { ...process.env, GEMINI_API_KEY: "", ANTHROPIC_API_KEY: "",
    // Poison live configuration: the demo must not inherit provider settings.
    PROVIDER: "invalid", BUDGET_USD: "0" };
  const output = execFileSync(process.execPath, [resolve("dist/src/demo.js")], { cwd, env, encoding: "utf8" });
  assert.match(output, /MOCK DEMO \(authored fixtures; no provider calls\)/);
  assert.equal(existsSync(join(cwd, "data")), false);
  const directory = join(cwd, "out", readdirSync(join(cwd, "out"))[0]);
  const summary = JSON.parse(readFileSync(join(directory, "summary.json"), "utf8"));
  assert.deepEqual(summary.results.map((r: { status: string }) => r.status), ["accepted", "accepted", "accepted", "no_good_match"]);
  assert.equal(new Set(summary.results.slice(0, 3).map((r: { researcherId: string }) => r.researcherId)).size, 3);
  assert.equal(summary.providerAttempts, 0);
  assert.equal(summary.estimatedAccountedUsd, 0);
  assert.equal(summary.peakConcurrentInference, 2);
  assert.equal(summary.dataSnapshot.fixture, true);
  const trace = readFileSync(join(directory, "trace.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(trace.filter((r) => r.type === "send_back" && r.source === "Critic").length, 3);
  const ledger = readFileSync(join(directory, "C901-CH1.evidence.md"), "utf8");
  assert.match(ledger, /\[source\]\(sources.json\)/);
  const sources = JSON.parse(readFileSync(join(directory, "sources.json"), "utf8"));
  assert.equal(sources.records.length, 14);
  assert.ok(sources.records.some((r: { id: string }) => r.id === "DEMO-WORK-1"));
});
