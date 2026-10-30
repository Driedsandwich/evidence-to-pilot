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
    "Quotations from fictional records, checked as contiguous substrings after Unicode, case, whitespace, quote-mark and Serbian script normalization. Diacritics remain significant. Array fields are joined with `; `. Consult the complete field for negative context and qualifications.",
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
    "The companion JSON preserves the submitted quotation spelling. Full source context was available to the live critic; the mock critic uses scripted rules.",
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
  lines.push("All reasoning and plan fields below are proposals, not established facts. Factual premises require the source ledger; resources, consent and outcomes remain unconfirmed.", "");
  lines.push(`**${p.plan ? "Why work together (hypothesis)" : "Search outcome"}:** ${safe(p.rationale)}`, "");
  if (p.plan) {
    const labels: Record<keyof typeof p.plan, string> = {
      question: "Research question",
      experiment: "Three-month pilot",
      metrics: "Decision gate",
      companyAsk: "Company role (requested)",
      researcherAsk: "Researcher role (requested)",
      dataRequired: "Data and access required",
      milestones: "Monthly owners and deliverables",
      risks: "Risks and stop conditions",
      meeting: "First actions and meeting decisions",
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
