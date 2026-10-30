import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { demoChallengeIds, demoDataset } from "./demo-data.js";
import { defaultPolicy } from "./inference.js";
import { runWorkflow } from "./workflow.js";

async function main(): Promise<void> {
  const db = demoDataset();
  // Explicit mock mode and fixed policy: no credentials, .env or data/ needed.
  const run = await runWorkflow(db, { mode: "mock", challengeIds: demoChallengeIds,
    outDir: "out", policy: { ...defaultPolicy }, injectUnsupported: true });
  writeFileSync(join(run.directory, "sources.json"), JSON.stringify({
    origin: "Authored fictional demo records; not the organizer dataset",
    records: [...db.sources.values()].map((source) => source.record),
  }, null, 2) + "\n");
  console.log(`MOCK DEMO (authored fixtures; no provider calls): ${run.directory}`);
  console.table(run.results.map((r) => ({ challenge: r.challengeId, status: r.status,
    researcher: r.proposal?.researcherId ?? "—" })));
  console.log(`Peak concurrent inference: ${run.peak}. Trace: ${join(run.directory, "trace.jsonl")}`);
  if (run.results.some((r) => r.status === "stopped")) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
