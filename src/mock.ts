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
      "Propose a three-month offline pilot comparing a statistical baseline and a one-class model on time-separated traffic. Hold one site out if enough sites are available. Replay agreed changes in an isolated testbed. Treat BACnet transfer as a separate experiment.",
    metrics:
      "Agree an alert-review budget in week 1. Proposed gate: at least 30% fewer nuisance alerts than the baseline at equal detection of the agreed replay scenarios. Report alerts/site/day, detection delay, CPU/RAM, and missed scenarios; simulated detection is not proof of real attack coverage.",
    companyAsk:
      "Request one engineering contact to explain maintenance events, arrange permissions and benchmark an appliance offline. Confirm availability before scheduling.",
    researcherAsk:
      "Invite the researcher to specify features, compare detectors and examine leakage and drift. Confirm contribution, availability and resources before assigning work.",
    dataRequired:
      "Request an approved traffic schema, de-identified time-stamped Modbus windows, maintenance-event labels and hardware limits. Company retains raw traffic; agree consent, access and retention before transfer.",
    milestones:
      "Month 1 (weeks 1–4): company clears data access; researcher delivers split protocol and statistical baseline. Month 2 (weeks 5–8): researcher compares detectors; company checks alert relevance. Month 3 (weeks 9–12): jointly test held-out windows, report resource costs and decide go/no-go with reproducible scripts.",
    risks:
      "Normal traffic can already contain attacks; drift may reflect maintenance. Stop if consent or de-identification is inadequate. Test BACnet separately; do not infer BACnet expertise from other protocols.",
    meeting:
      "Before a 45-minute meeting, request an approved trace schema, maintenance-event list and hardware limits. Engineering lead and researcher then choose sites, define nuisance alerts and name data owners. Leave with a one-page protocol, named task owners and a dated permission/budget decision before any data transfer.",
    terms:
      "Discuss a capped pilot budget before work; company retains raw traffic, researchers receive only approved extracts. Negotiate background IP, prototype rights and a 60-day publication review. All terms are proposed, not agreed.",
  },
  emc: {
    question:
      "Can PCB layout rules flag actionable EMC hotspots before external testing? A follow-on industrial PhD could examine emission predictors across board families, subject to sufficient data, supervision and funding agreements.",
    experiment:
      "Propose a three-month feasibility pilot extracting trace/plane features and comparing a rule checklist with archived scans. Freeze rules before each held-out board; include passed boards and one prospective layout review. Output is engineering triage, not certification.",
    metrics:
      "Measure hotspot agreement with scans, false flags per board and engineer review time. Proposed gate: identify a plausible hotspot on every held-out failed board, with at most five actionable false flags per review; a small sample gives uncertain estimates. External lab success remains unproven.",
    companyAsk:
      "Request a layout engineer to annotate hotspots, assess manufacturability and reserve one review session weekly. Confirm board access and staffing.",
    researcherAsk:
      "Invite the researcher to map features to rules, interpret emission mechanisms and analyze held-out results. Confirm personal contribution, availability and code rights before reuse.",
    dataRequired:
      "Request NDA-protected Gerbers, netlists, stackups, BOMs and emission scans for passed and failed boards, with operating modes and scan conditions. Agree access and retention before transfer.",
    milestones:
      "Month 1 (weeks 1–4): company provides approved inventory and annotations; researcher delivers baseline checklist. Month 2 (weeks 5–8): researcher implements rules; company reviews held-out flags. Month 3 (weeks 9–12): jointly review a prospective layout and deliver scripts, evidence log and go/no-go recommendation.",
    risks:
      "A handful of boards cannot establish generalization. Enclosure, cables and operating mode can dominate emissions. Stop if netlists or scan conditions are unavailable; do not promise certification or avoided retest fees.",
    meeting:
      "In week 1, layout lead and researcher inspect approved failed/passed design examples, reserve held-out boards and assign scan annotations. Leave the meeting with a file checklist, baseline and dated budget/access decision.",
    terms:
      "Agree a capped feasibility fee or joint funding application only after scoping. Keep client designs confidential, separate background methods from new scripts, and negotiate prototype ownership and publication review.",
  },
  berry: {
    question:
      "Joint-project topic: raspberry packaging for a 14-day cold chain. Can film permeability and headspace conditions improve shelf life? A follow-on industrial PhD could model how temperature excursions and harvest-lot variation change the useful permeability range, subject to safe pilot results and supervision/funding agreements.",
    experiment:
      "Propose a three-month pilot randomizing trays within three harvest lots to current packaging or three candidate films. Log temperature and headspace gases; compare mold, firmness and acceptability through day 14. Obtain a food-science protocol covering sample size and safe sensory testing.",
    metrics:
      "Proposed gate: a candidate meets buyer-agreed mold, firmness and sensory criteria on day 14 in all pilot lots, without unsafe gas conditions. Report lot-level uncertainty and cost per pack. Day 14 is a target to test, never an outcome guaranteed by prior work.",
    companyAsk:
      "Request a quality contact to arrange fruit, document handling and coordinate buyer criteria. Confirm storage, measurement access and a consumables budget before starting.",
    researcherAsk:
      "Invite the researcher to select permeability ranges, design randomized comparisons and analyze lot variation. Confirm contribution and availability; no laboratory or supervision commitment is assumed.",
    dataRequired:
      "Request current film specifications, lot and harvest dates, cold-chain logs, buyer rejection thresholds and approved temperature/headspace measurements. Agree who supplies safe microbiology and sensory assessments.",
    milestones:
      "Month 1 (weeks 1–4): company confirms harvest windows and buyer criteria; researcher delivers reviewed protocol and film shortlist. Month 2 (weeks 5–8): jointly run three staggered lot trials. Month 3 (weeks 9–12): researcher reports uncertainty and cost; company assesses feasibility; both deliver a recommendation or documented no-go.",
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
      researcherId: candidate.researcherId,
      evidenceId: candidate.evidenceId,
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
    verdicts: claimPaths(p).map((path) => ({
      path,
      status: path.startsWith("facts.") && db.verify(p.facts[Number(path.slice(6))]).length
        ? "unsupported" : "ok",
    })),
    issues: job.errors ?? [],
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
