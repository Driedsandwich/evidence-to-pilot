import { z } from "zod";
import type { StructuredOutputFormat } from "@mozaik-ai/core";
import { Dataset, type Candidate } from "./data.js";

const text = z.string().min(1).max(2400);
const recordId = z.string().min(1).max(200).regex(/^\S+$/, "Record ID must not contain whitespace");
export const citationSchema = z
  .object({
    recordId: text.describe("Exact recordId from sources, e.g. R1015"),
    field: text.describe("Exact field key inside that source's fields, e.g. open_to"),
    quote: z.string().min(1).max(1600).describe(
      "Copy a short exact contiguous excerpt (usually 5 to 25 words, fewer for short fields) from sources.fields. Never paraphrase, translate, add ellipses or stitch separated passages. Array fields are supplied as text joined with '; ': copy one item or an adjacent span, never skip items.",
    ),
  })
  .strict();
export const companySchema = z
  .object({
    researchTask: z.boolean(),
    interpretationKind: z.literal("proposal"),
    interpretation: text,
    citations: z.array(citationSchema).min(2).max(6),
  })
  .strict();
export const researchSchema = z
  .object({
    researcherId: recordId.nullable(),
    evidenceId: recordId.nullable(),
    interpretationKind: z.literal("proposal"),
    interpretation: text,
    citations: z.array(citationSchema).max(6),
  })
  .strict();
export const planSchema = z
  .object({
    question: text,
    experiment: text,
    metrics: text,
    companyAsk: text,
    researcherAsk: text,
    dataRequired: text,
    milestones: text,
    risks: text,
    meeting: text,
    terms: text,
  })
  .strict();
export const proposalSchema = z
  .object({
    researcherId: recordId.nullable(),
    evidenceId: recordId.nullable(),
    proseKind: z.literal("proposal").describe("Labels rationale and every plan field as proposed reasoning/actions, never established facts. Factual premises still require quotes in facts."),
    rationale: text,
    facts: z.array(citationSchema).max(12),
    plan: planSchema.nullable(),
  })
  .strict();
export const reviewSchema = z
  .object({
    decision: z.enum(["accept", "revise", "no_good_match"]),
    verdicts: z.array(z.object({
      path: z.string().min(1).max(80),
      status: z.enum(["ok", "unsupported", "uncertain"]),
    }).strict()).max(32),
    issues: z.array(z.string().min(1).max(400)).max(16),
  })
  .strict();
export type CompanyFinding = z.infer<typeof companySchema>;
export type ResearchFinding = z.infer<typeof researchSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Role =
  | "Company Analyst"
  | "Research Profiler"
  | "Matchmaker / Proposal Writer"
  | "Critic";
export function formatFor(role: Role): StructuredOutputFormat {
  const schema = {
    "Company Analyst": companySchema,
    "Research Profiler": researchSchema,
    "Matchmaker / Proposal Writer": proposalSchema,
    Critic: reviewSchema,
  }[role];
  const { $schema: _unused, ...json } = z.toJSONSchema(schema);
  return { name: role.replace(/\W/g, "_"), strict: true, schema: json };
}
export function claimPaths(p: Proposal): string[] {
  return [
    "rationale",
    ...p.facts.map((_, i) => `facts.${i}`),
    ...(p.plan ? Object.keys(p.plan).map((k) => `plan.${k}`) : []),
  ];
}
export function checkProposal(
  db: Dataset,
  challengeId: string,
  candidates: Candidate[],
  p: Proposal,
): string[] {
  const errors = p.facts.flatMap((c) => db.verify(c));
  if (
    p.plan &&
    [p.rationale, ...Object.values(p.plan)].join(" ").split(/\s+/).length > 600
  )
    errors.push(
      "Pilot brief exceeds 600 words; shorten the rationale and plan",
    );
  const challenge = db.challenges.get(challengeId)!;
  if (!p.facts.some((c) => c.recordId === challengeId && c.field === "text"))
    errors.push("Missing challenge text citation");
  if (p.researcherId === null) {
    if (p.evidenceId !== null || p.plan !== null)
      errors.push("No-match must not contain a pair or plan");
    return errors;
  }
  const researcher = db.researchers.get(p.researcherId);
  const work = p.evidenceId ? db.sources.get(p.evidenceId) : undefined;
  if (!researcher) errors.push("Unknown researcher");
  if (!work?.researcherIds.includes(p.researcherId))
    errors.push("Work-side researcher link missing");
  if (
    !candidates.some(
      (c) => c.researcherId === p.researcherId && c.evidenceId === p.evidenceId,
    )
  )
    errors.push("Pair is outside retrieved evidence");
  if (!p.plan) errors.push("Matched pair requires a concrete pilot plan");
  if (
    !p.facts.some(
      (c) =>
        c.recordId === p.evidenceId &&
        ["abstract", "summary"].includes(c.field),
    )
  )
    errors.push("Missing substantive work citation");
  if (!p.facts.some((c) => c.recordId === p.researcherId))
    errors.push("Missing profile citation");
  if (
    !p.facts.some(
      (c) => c.recordId === challenge.companyId && c.field === "rd_capacity",
    )
  )
    errors.push("Missing company capacity citation");
  const allowed = new Set([
    challengeId,
    challenge.companyId,
    p.researcherId,
    p.evidenceId,
  ]);
  for (const c of p.facts)
    if (!allowed.has(c.recordId)) errors.push(`Unrelated source ${c.recordId}`);
  return errors;
}
export function checkReview(p: Proposal, r: Review): string[] {
  const required = new Set(claimPaths(p));
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const verdict of r.verdicts) {
    if (!required.has(verdict.path)) errors.push(`Critic checked unknown claim ${verdict.path}`);
    if (seen.has(verdict.path)) errors.push(`Critic duplicated ${verdict.path}`);
    seen.add(verdict.path);
  }
  for (const path of required)
    if (!seen.has(path)) errors.push(`Critic omitted ${path}`);
  if (r.decision !== "revise" && r.verdicts.some((v) => v.status !== "ok"))
    errors.push("Unresolved claim verdict requires revision");
  if (
    r.decision === "accept" &&
    (r.issues.length || !p.researcherId || !p.evidenceId || !p.plan)
  )
    errors.push("Inconsistent acceptance");
  if (r.decision === "no_good_match" && (p.researcherId !== null || p.evidenceId !== null || p.plan !== null))
    errors.push("Critic must request removal of unsupported pair first");
  if (r.decision === "no_good_match" && r.issues.length)
    errors.push("No-good-match cannot leave unresolved issues");
  if (r.decision === "revise" && !r.issues.length)
    errors.push("Revision requires an actionable issue for the writer");
  return errors;
}
