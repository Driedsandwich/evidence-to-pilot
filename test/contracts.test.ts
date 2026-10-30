import test from "node:test";
import assert from "node:assert/strict";
import {
  claimPaths, checkReview, checkProposal, proposalSchema, reviewSchema,
  companySchema, researchSchema, formatFor, type Proposal, type Review,
} from "../src/contracts.js";
import { Dataset, type RecordData } from "../src/data.js";
import { mockAnswer, type Job } from "../src/mock.js";
import { renderProposal } from "../src/render.js";

function fixture(topic = "Modbus unsupervised anomaly detection") {
  const db = new Dataset();
  const add = (kind: string, record: RecordData, researcherIds: string[] = []) =>
    db.add({ id: record.id, kind, record, researcherIds,
      file: "authored-fixture", locator: "authored test only" });
  add("company", { id: "CO", name: "Fixture company", rd_capacity: "Discuss a small pilot." });
  add("challenge", { id: "CH", text: topic });
  db.challenges.set("CH", { companyId: "CO", source: db.sources.get("CH")! });
  add("researcher", { id: "R", name: "Fixture researcher" });
  add("publication", { id: "W", title: topic, abstract: `Investigating ${topic}.` }, ["R"]);
  const candidates = [{ researcherId: "R", evidenceId: "W", matchedTerms: [] }];
  const job: Job = { role: "Company Analyst", challengeId: "CH", candidates,
    revision: 0, injectUnsupported: false };
  job.company = companySchema.parse(mockAnswer(db, job));
  job.research = researchSchema.parse(mockAnswer(db, { ...job, role: "Research Profiler" }));
  const proposal = proposalSchema.parse(mockAnswer(db, { ...job, role: "Matchmaker / Proposal Writer" }));
  return { db, job, proposal };
}

function accepted(p: Proposal): Review {
  return { decision: "accept", verdicts: claimPaths(p).map((path) => ({ path, status: "ok" })), issues: [] };
}

test("compact critic requires exactly one verdict for every claim", () => {
  const { proposal } = fixture();
  const review = accepted(proposal);
  assert.deepEqual(checkReview(proposal, review), []);
  assert.deepEqual(checkReview(proposal, { ...review, verdicts: [...review.verdicts].reverse() }), []);
  assert.match(checkReview(proposal, { ...review, verdicts: review.verdicts.slice(1) }).join(";"), /omitted rationale/);
  assert.match(checkReview(proposal, { ...review, verdicts: [...review.verdicts, review.verdicts[0]] }).join(";"), /duplicated rationale/);
  assert.match(checkReview(proposal, { ...review, verdicts: [...review.verdicts, { path: "invented", status: "ok" }] }).join(";"), /unknown claim invented/);
});

test("unsupported and uncertain verdicts cannot be accepted or silently abstained", () => {
  const { proposal } = fixture();
  for (const status of ["unsupported", "uncertain"] as const) {
    const review = accepted(proposal);
    review.verdicts[0].status = status;
    assert.match(checkReview(proposal, review).join(";"), /requires revision/);
    review.decision = "revise";
    assert.match(checkReview(proposal, review).join(";"), /actionable issue/);
    review.issues = ["Remove the unsupported fit assertion or make the transfer explicitly conditional."];
    assert.deepEqual(checkReview(proposal, review), []);
    const noMatch: Proposal = { ...proposal, researcherId: null, evidenceId: null, plan: null };
    const abstain: Review = { ...accepted(noMatch), decision: "no_good_match" };
    abstain.verdicts[0].status = status;
    assert.match(checkReview(noMatch, abstain).join(";"), /requires revision/);
  }
});

test("review decisions reject unresolved issues and inconsistent IDs or plans", () => {
  const { proposal } = fixture();
  assert.match(checkReview(proposal, { ...accepted(proposal), issues: ["Fix claim."] }).join(";"), /Inconsistent acceptance/);
  const noMatch: Proposal = { ...proposal, researcherId: null, evidenceId: null, plan: null };
  assert.deepEqual(checkReview(noMatch, { ...accepted(noMatch), decision: "no_good_match" }), []);
  assert.match(checkReview(noMatch, accepted(noMatch)).join(";"), /Inconsistent acceptance/);
  for (const invalid of [{ ...noMatch, evidenceId: "W" }, { ...noMatch, plan: proposal.plan }]) {
    assert.match(checkReview(invalid, { ...accepted(invalid), decision: "no_good_match" }).join(";"), /removal of unsupported pair/);
  }
});

test("critic JSON schema remains compact, strict and bounded", () => {
  const { proposal } = fixture();
  const review = accepted(proposal);
  assert.equal(reviewSchema.safeParse(review).success, true);
  assert.equal(reviewSchema.safeParse({ ...review, checkedClaims: [] }).success, false);
  assert.equal(reviewSchema.safeParse({ ...review, verdicts: [{ path: "rationale", status: "supported" }] }).success, false);
  assert.equal(reviewSchema.safeParse({ ...review, issues: ["x".repeat(401)] }).success, false);
  assert.deepEqual(Object.keys((formatFor("Critic").schema as { properties: object }).properties), ["decision", "verdicts", "issues"]);
});

test("all mock pilots include three-month milestones, data, roles and evidence IDs under 600 rendered words", () => {
  for (const topic of ["Modbus unsupervised anomaly detection", "PCB Gerber EMC emissions", "Raspberry packaging film permeability mold"]) {
    const { db, job, proposal } = fixture(topic);
    assert.deepEqual(checkProposal(db, "CH", job.candidates, proposal), []);
    const review = reviewSchema.parse(mockAnswer(db, { ...job, role: "Critic", draft: proposal }));
    assert.deepEqual(checkReview(proposal, review), []);
    const markdown = renderProposal(db, { challengeId: "CH", status: "accepted", mode: "mock",
      proposal, reviews: [review], reason: "Scripted fixture" });
    for (const month of [1, 2, 3]) assert.match(proposal.plan!.milestones, new RegExp(`Month ${month}`));
    assert.match(proposal.plan!.milestones, /weeks 9–12/);
    for (const label of ["Company problem [CH]", "Why work together (hypothesis)", "Company role (requested)",
      "Researcher role (requested)", "Data and access required", "Risks and stop conditions", "[W]"])
      assert.ok(markdown.includes(label), label);
    assert.ok(markdown.trim().split(/\s+/).length <= 600, topic);
  }
});

test("mechanical citation rejection survives compact critic contract", () => {
  const { db, job, proposal } = fixture();
  proposal.facts.push({ recordId: "R", field: "bio", quote: "Guaranteed successful pilot." });
  const errors = checkProposal(db, "CH", job.candidates, proposal);
  assert.ok(errors.some((e) => e.includes("Unsupported quote")));
  const review = reviewSchema.parse(mockAnswer(db, { ...job, role: "Critic", draft: proposal, errors }));
  assert.equal(review.decision, "revise");
  assert.equal(review.verdicts.find((v) => v.path === `facts.${proposal.facts.length - 1}`)?.status, "unsupported");
  assert.deepEqual(checkReview(proposal, review), []);
});
