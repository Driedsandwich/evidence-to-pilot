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
  feedback?: {
    messages: string[];
    previousOutput: unknown;
    round: number;
  };
  validationRound?: number;
  revision: number;
  injectUnsupported: boolean;
};
const rationales: Record<string, string> = {
  ics: "Transfer hypothesis: use the cited ICS anomaly-detection work to design traffic features and unsupervised baselines for a company with no labelled attacks. Test whether periodicity and changes in communication patterns distinguish operational changes from nuisance alerts on the company's Modbus traffic. BACnet transfer remains a separate research question. The work-side link supports participation only; confirm the researcher's contribution, interest and resources.",
  emc: "Transfer hypothesis: adapt the cited PCB layout work into a Gerber/netlist review that connects geometric risk flags to measured emission hotspots. A checklist tied to specific traces and return paths could make layout corrections testable before the company's next external EMC visit. This is a proposed transfer, not proof of fewer failed tests. Confirm the researcher's contribution and rights to any existing implementation.",
  berry: "Transfer hypothesis: apply the cited packaging-permeability work to the balance between raspberry respiration and gas exchange through the film. Comparing oxygen/carbon-dioxide transmission, measured headspace and spoilage could explain why the current pack fails before the buyer's target. Mixed-berry evidence motivates a raspberry-only experiment; it does not establish 14-day shelf life or the researcher's current laboratory capacity.",
};
const plans: Record<string, Plan> = {
  ics: {
    question:
      "Joint-project topic: label-free monitoring of industrial networks. Can site-specific baselines reduce nuisance alerts while detecting held-out operational changes? A follow-on industrial PhD could study drift-aware calibration across sites and protocols, subject to pilot evidence, supervision and funding agreements.",
    experiment:
      "Propose a 6-week offline pilot: compare a statistical baseline with a one-class model on time-separated, de-identified traffic windows. Hold one site out. Replay agreed benign anomalies in an isolated testbed; do not inject attacks into client networks. Treat BACnet transfer as a separate unproven experiment.",
    metrics:
      "Agree an alert-review budget in week 1. Proposed gate: at least 30% fewer nuisance alerts than the baseline at equal detection of the agreed replay scenarios. Report alerts/site/day, detection delay, CPU/RAM, and missed scenarios; simulated detection is not proof of real attack coverage.",
    companyAsk:
      "Request one engineering contact, a consent and NDA review, a small de-identified traffic export and an appliance for offline benchmarking. Confirm availability before scheduling; do not assume access to every client archive.",
    researcherAsk:
      "Invite the researcher to specify traffic features, compare a statistical baseline and one-class model, and lead leakage and drift analysis. Ask the company engineer to explain maintenance events and benchmark deployment costs. Confirm contributions and availability before assigning work.",
    milestones:
      "Week 1: scope, permissions, site split and baseline. Weeks 2–3: features and two detectors. Weeks 4–5: offline replay and resource measurements. Week 6: reproducible report and joint go/no-go review.",
    risks:
      "Normal traffic can already contain attacks; drift may reflect maintenance. Stop if consent or de-identification is inadequate. Test BACnet separately; do not infer BACnet expertise from other protocols.",
    meeting:
      "Before a 45-minute meeting, request an approved trace schema, maintenance-event list and hardware limits. Engineering lead and researcher then choose sites, define nuisance alerts and name data owners. Leave with a one-page protocol, named task owners and a dated permission/budget decision before any data transfer.",
    terms:
      "Discuss a capped pilot budget before work; company retains raw traffic, researchers receive only approved extracts. Negotiate background IP, prototype rights and a 60-day publication review. All terms are proposed, not agreed.",
  },
  emc: {
    question:
      "Joint-project topic: explainable PCB layout screening for EMC risk. Can geometric rules flag actionable hotspots before external testing? A follow-on industrial PhD could study which layout features predict measured emissions across board families and operating conditions, subject to sufficient data and supervision agreement.",
    experiment:
      "Propose a 6-week feasibility pilot: extract trace/plane and routing features, implement a small rule checklist, and compare flags with archived scans. Freeze rules before testing each held-out board; include passed boards as controls and one prospective layout review. Treat the output as engineering triage, not compliance certification.",
    metrics:
      "Measure hotspot agreement with scans, false flags per board and engineer review time. Proposed gate: identify a plausible hotspot on every held-out failed board, with at most five actionable false flags per review; a small sample gives uncertain estimates. External lab success remains unproven.",
    companyAsk:
      "Request NDA-protected Gerbers, netlists, stackups, BOMs and scans for the cited boards; ask a layout engineer to annotate known hotspots and reserve one review session per week.",
    researcherAsk:
      "Invite the researcher to define feature/rule mappings and interpret emission mechanisms; ask the company engineer to annotate scans and assess whether each suggested change is manufacturable. Confirm personal contributions, availability and code rights before reuse.",
    milestones:
      "Week 1: NDA, board inventory and annotation rules. Weeks 2–3: parser and baseline checklist. Weeks 4–5: held-out comparisons and one layout review. Week 6: checklist, scripts, evidence log and go/no-go meeting.",
    risks:
      "A handful of boards cannot establish generalization. Enclosure, cables and operating mode can dominate emissions. Stop if netlists or scan conditions are unavailable; do not promise certification or avoided retest fees.",
    meeting:
      "Before a 45-minute meeting, request an approved board-file inventory and scan conditions. Layout lead and researcher inspect one failed and one passed design, reserve held-out boards and agree who annotates each scan. Leave with a file checklist, proposed rule baseline and a dated budget/access decision.",
    terms:
      "Agree a capped feasibility fee or joint funding application only after scoping. Keep client designs confidential, separate background methods from new scripts, and negotiate prototype ownership and publication review.",
  },
  berry: {
    question:
      "Joint-project topic: raspberry packaging for a 14-day cold chain. Can film permeability and headspace conditions improve shelf life? A follow-on industrial PhD could model how temperature excursions and harvest-lot variation change the useful permeability range, subject to safe pilot results and supervision/funding agreements.",
    experiment:
      "Propose an 8-week pilot: randomize trays within three harvest lots to the current pack or three candidate films. Keep fill weight and handling comparable; log temperature and headspace gases. Assess mold, firmness and sensory acceptability on days 0, 7, 9, 12 and 14. A food-science review must set sample sizes and safe sensory-testing rules.",
    metrics:
      "Proposed gate: a candidate meets buyer-agreed mold, firmness and sensory criteria on day 14 in all pilot lots, without unsafe gas conditions. Report lot-level uncertainty and cost per pack. Day 14 is a target to test, never an outcome guaranteed by prior work.",
    companyAsk:
      "Request sample fruit, current packaging specifications, cold-chain logs and a quality contact. Confirm access to storage and measurements, and cap the sample and consumables budget before the first lot.",
    researcherAsk:
      "Invite the researcher to select permeability ranges, design randomized comparisons and analyze lot variation. Ask company quality staff to document handling and buyer rejection criteria. Confirm personal contribution, measurement access and availability; no lab or supervision commitment is assumed.",
    milestones:
      "Weeks 1–2: buyer acceptance criteria, film sourcing and protocol. Weeks 3–6: three staggered lot trials with temperature logging. Week 7: uncertainty and cost analysis. Week 8: packaging recommendation or documented no-go.",
    risks:
      "Mixed-berry results may not transfer to raspberry-only packs or fluctuating transport temperatures. Anaerobic conditions and sensory rejection can defeat longer shelf life. Do not release experimental packs for sale without the appropriate safety review.",
    meeting:
      "Before a 45-minute meeting, request current film specifications and one approved rejected-shipment temperature log. Quality manager and researcher agree buyer thresholds, harvest windows and who can measure gases and microbiology. Leave with a sampling plan and a dated safety/access/budget decision before sourcing films.",
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
        ? rationales[category!]
        : "No good match established in this local shortlist. MOCK domain coverage is intentionally narrow; request curator review or a reformulated bilingual query. This does not assess anyone’s worth or establish that relevant expertise is absent.",
      facts: [...job.company!.citations, ...(match ? r.citations : [])],
      plan: match ? plans[category!] : null,
    };
    if (
      match &&
      job.injectUnsupported &&
      job.revision === 0 &&
      !job.errors?.length
    )
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
    private respond?: (
      job: Job,
      input: InferenceInput,
    ) => Promise<InferenceOutput>,
  ) {}
  async run(input: InferenceInput): Promise<InferenceOutput> {
    await sleep(25); // Exposes real overlapping Mozaik loops in the demo trace.
    const job = this.jobFor(input.context.id);
    return this.respond
      ? this.respond(job, input)
      : jsonOutput(mockAnswer(this.db, job));
  }
  async *stream(input: InferenceInput): AsyncGenerator<SemanticEvent> {
    yield SemanticEvent.create(
      "inference.output",
      input.model,
      await this.run(input),
    );
  }
}
