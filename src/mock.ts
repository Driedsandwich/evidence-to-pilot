import {
  SemanticEvent,
  type InferenceInput,
  type InferenceOutput,
  type InferenceRunner,
} from "@mozaik-ai/core";
import { type Candidate, Dataset, fieldText } from "./data.js";
import {
  claimPaths,
  type CompanyFinding,
  type ResearchFinding,
  type Proposal,
  type Plan,
  type Role,
} from "./contracts.js";
import { jsonOutput, sleep } from "./inference.js";

export type Job = {
  role: Role;
  challengeId: string;
  candidates: Candidate[];
  company?: CompanyFinding;
  research?: ResearchFinding;
  draft?: Proposal;
  errors?: string[];
  revision: number;
  injectUnsupported: boolean;
};
const plans: Record<string, Plan> = {
  ics: {
    question:
      "Can a site-specific unsupervised detector reduce nuisance alerts while detecting held-out operational changes without training on attack labels?",
    experiment:
      "Propose a 6-week offline pilot: compare a statistical baseline with a one-class model on time-separated, de-identified traffic windows. Hold one site out. Replay agreed benign anomalies in an isolated testbed; do not inject attacks into client networks. Treat BACnet transfer as a separate unproven experiment.",
    metrics:
      "Agree an alert-review budget in week 1. Proposed gate: at least 30% fewer nuisance alerts than the baseline at equal detection of the agreed replay scenarios. Report alerts/site/day, detection delay, CPU/RAM, and missed scenarios; simulated detection is not proof of real attack coverage.",
    companyAsk:
      "Request one engineering contact, a consent and NDA review, a small de-identified traffic export and an appliance for offline benchmarking. Confirm availability before scheduling; do not assume access to every client archive.",
    researcherAsk:
      "Invite the cited researcher to review the statistical baseline, evaluation protocol and failure analysis; confirm their own contribution to the cited work and current availability. No supervision commitment is assumed.",
    milestones:
      "Week 1: scope, permissions, site split and baseline. Weeks 2–3: features and two detectors. Weeks 4–5: offline replay and resource measurements. Week 6: reproducible report and joint go/no-go review.",
    risks:
      "Normal traffic can already contain attacks; drift may reflect maintenance. Stop if consent or de-identification is inadequate. Test BACnet separately; do not infer BACnet expertise from other protocols.",
    meeting:
      "A 45-minute scoping meeting: engineering lead and researcher inspect one anonymized trace, agree alert costs, name data owners and decide whether a six-week pilot is feasible.",
    terms:
      "Discuss a capped pilot budget before work; company retains raw traffic, researchers receive only approved extracts. Negotiate background IP, prototype rights and a 60-day publication review. All terms are proposed, not agreed.",
  },
  emc: {
    question:
      "Can a repeatable Gerber/netlist review flag emission hotspots early enough to guide PCB layout changes before external testing?",
    experiment:
      "Propose a 6-week feasibility pilot: extract layout features, implement a small rule checklist, and compare flagged areas with archived scans. Use leave-one-board-out evaluation and one prospective layout review. Treat the output as engineering triage, not compliance certification.",
    metrics:
      "Measure hotspot agreement with scans, false flags per board and engineer review time. Proposed gate: identify a plausible hotspot on every held-out failed board, with at most five actionable false flags per review; a small sample gives uncertain estimates. External lab success remains unproven.",
    companyAsk:
      "Request NDA-protected Gerbers, netlists, stackups, BOMs and scans for the cited boards; ask a layout engineer to annotate known hotspots and reserve one review session per week.",
    researcherAsk:
      "Invite the cited researcher to help adapt layout rules and explain failure mechanisms; confirm personal contributions, current availability and any rights to existing code before reuse.",
    milestones:
      "Week 1: NDA, board inventory and annotation rules. Weeks 2–3: parser and baseline checklist. Weeks 4–5: held-out comparisons and one layout review. Week 6: checklist, scripts, evidence log and go/no-go meeting.",
    risks:
      "A handful of boards cannot establish generalization. Enclosure, cables and operating mode can dominate emissions. Stop if netlists or scan conditions are unavailable; do not promise certification or avoided retest fees.",
    meeting:
      "A 45-minute meeting with the layout lead and researcher: inspect one failed board and its scan, agree available file formats, select a held-out board and estimate engineering effort.",
    terms:
      "Agree a capped feasibility fee or joint funding application only after scoping. Keep client designs confidential, separate background methods from new scripts, and negotiate prototype ownership and publication review.",
  },
  berry: {
    question:
      "Can packaging-film permeability and headspace conditions be tuned to improve raspberry shelf life under the exporter’s actual cold-chain conditions?",
    experiment:
      "Propose an 8-week pilot: compare the current pack with three candidate films across three independent harvest lots. Log temperature and headspace gases; assess mold, firmness and sensory acceptability on days 0, 7, 9, 12 and 14. Final sample sizes and safety procedures require a food-science review.",
    metrics:
      "Proposed gate: a candidate meets buyer-agreed mold, firmness and sensory criteria on day 14 in all pilot lots, without unsafe gas conditions. Report lot-level uncertainty and cost per pack. Day 14 is a target to test, never an outcome guaranteed by prior work.",
    companyAsk:
      "Request sample fruit, current packaging specifications, cold-chain logs and a quality contact. Confirm access to storage and measurements, and cap the sample and consumables budget before the first lot.",
    researcherAsk:
      "Invite the cited researcher to design film/headspace comparisons and assess microbial-growth assumptions. Confirm personal contribution, lab access and availability; an industrial PhD is a later option requiring consent.",
    milestones:
      "Weeks 1–2: buyer acceptance criteria, film sourcing and protocol. Weeks 3–6: three staggered lot trials with temperature logging. Week 7: uncertainty and cost analysis. Week 8: packaging recommendation or documented no-go.",
    risks:
      "Mixed-berry results may not transfer to raspberry-only packs or fluctuating transport temperatures. Anaerobic conditions and sensory rejection can defeat longer shelf life. Do not release experimental packs for sale without the appropriate safety review.",
    meeting:
      "A 45-minute meeting with the quality manager and researcher: review one rejected shipment, choose acceptance thresholds and harvest windows, and confirm who can measure gases and microbiology.",
    terms:
      "Propose a capped trial budget, company ownership of shipment records, agreed access to de-identified measurements, negotiated foreground IP and a 60-day publication review. No funding or participation is secured.",
  },
};
function recipe(text: string): string | null {
  if (
    /(modbus|industrial control|\bics\b)/i.test(text) &&
    /(anomal|unsupervised|one-class|unusual)/i.test(text)
  )
    return "ics";
  if (/(pcb|gerber)/i.test(text) && /(emission|emc)/i.test(text)) return "emc";
  if (
    /(berr|raspberr)/i.test(text) &&
    /(packag|film|permeab|mold|mould)/i.test(text)
  )
    return "berry";
  return null;
}
export function mockAnswer(db: Dataset, job: Job): unknown {
  const ch = db.challenges.get(job.challengeId)!;
  const challenge =
    fieldText(ch.source.record.text) + " " + fieldText(ch.source.record.detail);
  const category = recipe(challenge);
  if (job.role === "Company Analyst")
    return {
      researchTask: category !== null,
      interpretation: category
        ? "MOCK heuristic: an experimental feasibility pilot may be appropriate; confirm in a scoping meeting."
        : "MOCK abstention: this challenge is outside the three implemented demo domains; no conclusion about university capability.",
      citations: [
        db.cite(job.challengeId, "text", 650),
        db.cite(ch.companyId, "rd_capacity", 400),
      ],
    };
  if (job.role === "Research Profiler") {
    const candidate = job.candidates.find((c) => {
      const s = db.sources.get(c.evidenceId)!;
      return (
        category !== null &&
        recipe(
          fieldText(s.record.title) +
            " " +
            fieldText(s.record.abstract) +
            " " +
            fieldText(s.record.summary),
        ) === category &&
        Boolean(fieldText(s.record.abstract) || fieldText(s.record.summary))
      );
    });
    if (!candidate)
      return {
        researcherId: null,
        evidenceId: null,
        interpretation:
          "MOCK: no directly supported candidate in the retrieved shortlist for an implemented demo domain; not evidence of absence.",
        citations: [],
      };
    const work = db.sources.get(candidate.evidenceId)!;
    const citations = [
      db.cite(candidate.researcherId, "name"),
      db.cite(candidate.evidenceId, "title", 250),
      db.cite(
        candidate.evidenceId,
        work.kind === "project" ? "summary" : "abstract",
        450,
      ),
    ];
    for (const field of ["open_to", "notes"])
      if (fieldText(db.researchers.get(candidate.researcherId)!.record[field]))
        citations.push(db.cite(candidate.researcherId, field, 250));
    return {
      ...candidate,
      matchedTerms: undefined,
      interpretation:
        "MOCK hypothesis: the work addresses a related technical mechanism. Work-side ID attribution establishes participation, not sole authorship, personal mastery, availability or consent.",
      citations,
    };
  }
  if (job.role === "Matchmaker / Proposal Writer") {
    const r = job.research!;
    const match = job.company!.researchTask && r.researcherId && category;
    const proposal: Proposal = {
      researcherId: match ? r.researcherId : null,
      evidenceId: match ? r.evidenceId : null,
      rationale: match
        ? "Proposed fit: test transfer of the cited work to the cited challenge in a bounded pilot. The link records authorship/participation only; the meeting must establish the individual’s role, current interest and resources."
        : "No good match established in this local shortlist. MOCK domain coverage is intentionally narrow; request curator review or a reformulated bilingual query. This does not assess anyone’s worth or establish that relevant expertise is absent.",
      facts: [...job.company!.citations, ...(match ? r.citations : [])],
      plan: match ? plans[category!] : null,
    };
    if (match && job.injectUnsupported && job.revision === 0)
      proposal.facts.push({
        recordId: r.researcherId!,
        field: "bio",
        quote: "The researcher guarantees a 99% success rate for this pilot.",
      });
    return proposal;
  }
  const p = job.draft!;
  return {
    decision: job.errors?.length
      ? "revise"
      : p.researcherId
        ? "accept"
        : "no_good_match",
    checkedClaims: claimPaths(p),
    issues: job.errors ?? [],
    fitReason:
      "MOCK scripted review: exact-source checks and three domain rules only. No LLM semantic judgement was made; acceptance means demo validation passed, not real feasibility.",
  };
}
/** Official custom-inference-runner pattern: run -> ModelMessageItem,
 * stream -> terminal inference.output. No provider endpoint is constructed. */
export class MockRunner implements InferenceRunner {
  constructor(
    private db: Dataset,
    private jobFor: (contextId: string) => Job,
  ) {}
  async run(input: InferenceInput): Promise<InferenceOutput> {
    await sleep(25); // Exposes real overlapping Mozaik loops in the demo trace.
    return jsonOutput(mockAnswer(this.db, this.jobFor(input.context.id)));
  }
  async *stream(input: InferenceInput): AsyncGenerator<SemanticEvent> {
    yield SemanticEvent.create(
      "inference.output",
      input.model,
      await this.run(input),
    );
  }
}
