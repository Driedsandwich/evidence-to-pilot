import { readFileSync } from "node:fs";
export function reportTrace(path: string): string {
  const rows = readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const loops = rows.filter((r) => r.type === "loop_finished");
  const lines = [
    "Task | Agent | Loop | Duration ms | Tokens | Estimated USD (all attempts)",
    "--- | --- | --- | ---: | ---: | ---:",
  ];
  for (const row of loops) {
    const attempts = rows.filter(
      (r) => r.type === "provider_attempt" && r.taskId === row.taskId,
    );
    const known = attempts.every((r) => r.estimatedCostUsd !== null);
    const cost = known
      ? attempts.reduce((n, r) => n + r.estimatedCostUsd, 0).toFixed(6)
      : "unknown";
    lines.push(
      `${row.taskId} | ${row.agent} | ${row.loopId} | ${row.durationMs.toFixed(1)} | ${row.usage?.totalTokens ?? "unknown (mock/unreported)"} | ${cost}`,
    );
  }
  lines.push("", "Overlapping loops (wall-clock intersection):");
  let count = 0;
  for (let i = 0; i < loops.length; i++)
    for (let j = i + 1; j < loops.length; j++) {
      const a = loops[i],
        b = loops[j];
      const ms =
        Math.min(Date.parse(a.endedAt), Date.parse(b.endedAt)) -
        Math.max(Date.parse(a.startedAt), Date.parse(b.startedAt));
      if (ms > 0) {
        count++;
        lines.push(
          `- ${a.taskId} ↔ ${b.taskId}: ${ms} ms (${a.loopId} / ${b.loopId})`,
        );
      }
    }
  if (!count) lines.push("- None measured.");
  lines.push("", "Critic interventions:");
  for (const r of rows.filter((r) => r.type === "critic_review"))
    lines.push(
      `- ${r.challengeId}, revision ${r.revision}: ${r.review.decision}. ${r.review.issues.join("; ") || r.review.fitReason}`,
    );
  lines.push("", "Send-backs to producing agents:");
  for (const r of rows.filter((r) => r.type === "send_back"))
    lines.push(`- ${r.challengeId}: ${r.source} → ${r.agent}, correction ${r.round}: ${r.messages.join("; ")}`);
  for (const r of rows.filter((r) => r.type === "citation_resolved"))
    lines.push(`- ${r.taskId}: resolved ${r.original.quote} to the cited field text before validation.`);
  const unfinished = rows.filter(
    (r) =>
      r.type === "loop_started" && !loops.some((l) => l.loopId === r.loopId),
  );
  if (unfinished.length)
    lines.push(
      "",
      `Unfinished loops: ${unfinished.map((r) => r.taskId).join(", ")}`,
    );
  return lines.join("\n") + "\n";
}
if (require.main === module) {
  if (!process.argv[2]) {
    console.error("Usage: npm run trace -- out/<run>/trace.jsonl");
    process.exitCode = 1;
  } else process.stdout.write(reportTrace(process.argv[2]));
}
