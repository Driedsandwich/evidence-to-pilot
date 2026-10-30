import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadDataset } from "./data.js";
import { policyFromEnv } from "./inference.js";
import { runWorkflow } from "./workflow.js";
function args(argv: string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === "--inject-unsupported") {
      out.set(key, "true");
      continue;
    }
    if (
      !["--mode", "--challenges", "--data", "--out"].includes(key) ||
      !argv[i + 1] ||
      argv[i + 1].startsWith("--")
    )
      throw new Error(`Unknown or incomplete option: ${key}`);
    out.set(key, argv[++i]);
  }
  return out;
}
async function main(): Promise<void> {
  const a = args(process.argv.slice(2));
  const mode = a.get("--mode") ?? "mock";
  if (mode !== "mock" && mode !== "live")
    throw new Error("--mode must be mock or live");
  const ids = (a.get("--challenges") ?? "C001-CH1,C025-CH1,C036-CH1")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!ids.length || ids.some((id) => !/^C\d{3}-CH\d+$/.test(id)))
    throw new Error("Provide comma-separated challenge IDs such as C001-CH1");
  if (mode === "live" && a.has("--inject-unsupported"))
    throw new Error("Fault injection is only available in mock mode");
  const outDir = resolve(a.get("--out") ?? "out");
  mkdirSync(outDir, { recursive: true });
  try {
    const db = loadDataset(resolve(a.get("--data") ?? "data"));
    const result = await runWorkflow(db, {
      mode,
      challengeIds: ids,
      outDir,
      policy: policyFromEnv(),
      injectUnsupported: a.has("--inject-unsupported"),
    });
    console.log(`${mode.toUpperCase()} run: ${result.directory}`);
    console.table(
      result.results.map((r) => ({
        challenge: r.challengeId,
        status: r.status,
        researcher: r.proposal?.researcherId ?? "—",
      })),
    );
    console.log(
      `Peak concurrent inference: ${result.peak}. Trace: ${join(result.directory, "trace.jsonl")}`,
    );
    if (result.results.some((r) => r.status === "stopped"))
      process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Run failed";
    writeFileSync(
      join(outDir, `startup-failure-${Date.now()}.jsonl`),
      JSON.stringify({
        type: "startup_failure",
        runId: `startup-${Date.now()}`,
        at: new Date().toISOString(),
        error: message,
      }) + "\n",
    );
    throw error;
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
