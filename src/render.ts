import { Dataset, fieldText } from "./data.js";
import type { Result } from "./workflow.js";
const safe = (s: string) =>
  s
    .replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"))
    .replace(/([\[\]*_`])/g, "\\$1")
    .replace(/\n/g, " ");
export function renderEvidence(db: Dataset, r: Result): string {
  const lines = [
    `# ${r.mode.toUpperCase()} source ledger — ${r.challengeId}`,
    "",
    "Verbatim excerpts from fictional records. Array fields are joined with `; `. Excerpts may end mid-sentence; consult the complete field before interpreting a negative or qualification.",
    "",
  ];
  for (const [i, c] of (r.proposal?.facts ?? []).entries()) {
    const s = db.sources.get(c.recordId);
    lines.push(
      `- **[${i + 1}] ${c.recordId}.${safe(c.field)}** (${safe(s?.locator ?? "unknown")}): “${safe(c.quote)}” [source](${db.url(c.recordId)})`,
    );
  }
  lines.push(
    "",
    "The companion JSON contains the exact strings checked mechanically. Full source context was available to the live critic; the mock critic uses scripted rules.",
    "",
  );
  return lines.join("\n");
}
export function renderProposal(db: Dataset, r: Result): string {
  const p = r.proposal;
  const companyId = db.challenges.get(r.challengeId)?.companyId;
  const company = companyId ? db.sources.get(companyId) : undefined;
  const researcher = p?.researcherId
    ? db.researchers.get(p.researcherId)
    : undefined;
  const lines = [
    `# ${r.mode === "mock" ? "MOCK DEMO — " : ""}${r.challengeId}: ${r.status.replace(/_/g, " ")}`,
    "",
    `**${company ? safe(fieldText(company.record.name)) + " [" + company.id + "]" : "Unknown company"}${researcher ? " × " + safe(fieldText(researcher.record.name)) + " [" + researcher.id + "]" : ""}**`,
    "",
    r.mode === "mock"
      ? "Fictional data · Scripted mock review · No provider calls · Human discussion only"
      : "Fictional data · Model-assisted review · Human discussion only",
    "",
  ];
  if (!p) return lines.concat(`Run stopped: ${safe(r.reason)}`, "").join("\n");
  const challengeQuote = p.facts.find(
    (c) => c.recordId === r.challengeId && c.field === "text",
  );
  if (challengeQuote)
    lines.push(
      `**Company problem [${r.challengeId}]:** “${safe(challengeQuote.quote)}”`,
      "",
    );
  const work = p.evidenceId ? db.sources.get(p.evidenceId) : undefined;
  if (work)
    lines.push(
      `**Evidence to investigate [${work.id}]:** “${safe(fieldText(work.record.title))}”. The work-side record links ${p.researcherId}; participation does not establish individual mastery. [Source ledger](${r.challengeId}.evidence.md).`,
      "",
    );
  lines.push(`**Fit hypothesis / search outcome:** ${safe(p.rationale)}`, "");
  if (p.plan) {
    const labels: Record<keyof typeof p.plan, string> = {
      question: "Research question",
      experiment: "Proposed experiment",
      metrics: "Proposed decision gate",
      companyAsk: "Company contribution requested",
      researcherAsk: "Researcher contribution requested",
      milestones: "Milestones and deliverables",
      risks: "Risks and stop conditions",
      meeting: "First meeting",
      terms: "Proposed data, IP and budget terms",
    };
    for (const [key, label] of Object.entries(labels))
      lines.push(
        `**${label}:** ${safe(p.plan[key as keyof typeof p.plan])}`,
        "",
      );
  }
  lines.push(
    `**Audit:** [All ${p.facts.length} checked quotations and record locators](${r.challengeId}.evidence.md) · [Structured result and review history](${r.challengeId}.json).`,
    "",
    "Reconfirm current affiliation, resources, interest and consent. No funding or participation is secured. No person-value score. Search is limited to eight local candidates; an abstention is not evidence of absent expertise.",
    "",
  );
  return lines.join("\n");
}
