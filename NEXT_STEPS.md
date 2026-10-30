# M4 handoff

## What works

- TypeScript CLI with Mozaik 4.1.0 pinned exactly and an existing lockfile; Node 20+ is required by the installed Gemini SDK.
- Local lexical retrieval, work-side researcher ID attribution, simultaneous Company Analyst and Research Profiler loops, validated shared state, a proposal writer and a bounded Critic loop.
- Copy-ready source fields and short exact quote instructions. The validator uses contiguous substring checks after NFKC, whitespace, quotation-mark, case and Serbian script normalization. It preserves punctuation, order and diacritics; no fuzzy matching or stitched excerpts.
- Facts remain typed record/field/quote citations. Required `interpretationKind: "proposal"` and `proseKind: "proposal"` labels distinguish interpretation, rationale and plan from facts. Labels do not authorize invented factual premises. The Critic receives every claim path, its kind and full selected source fields.
- At the analyst correction limit, invalid citations are removed and dependent interpretation is discarded. Required evidence is checked again. Loss of substantive research/profile evidence becomes a reviewed no-match; loss of required company evidence stops the challenge.
- At the writer review limit, one final recovery may remove rejected optional facts or replace a rejected rationale with a tentative transfer question. It cannot remove required evidence or plan fields. The complete reduced draft must pass a fresh Critic review; persistent rejection stops the challenge. Trace events `claim_dropped` and `claim_recovery` expose these decisions.
- Provider concurrency/rate limits, bounded HTTP retries, planning-cost and call budgets, per-task usage/cost traces and loop-overlap reports remain active. Recovery adds at most one Critic task per challenge. Three challenges have a theoretical maximum of 51 logical tasks / 102 attempts with one retry each; the unchanged 96-attempt ceiling, cost budget or deadline may stop that worst case.

## Recorded evidence and M4 limits

Six preserved live runs contain sixteen challenge attempts: one accepted in live-4 and fifteen stopped. These are historical observations, not a controlled model comparison or evidence of M4 acceptance. See [README](README.md#recorded-live-results) and the unchanged run artifacts.

- [live-5](runs/live-5/summary.json): Gemini Flash returned HTTP 429 on all twelve attempts. Daily-quota exhaustion is plausible but not established by status alone.
- [live-6](runs/live-6/summary.json): Anthropic Haiku completed all three challenge paths without the prior HTTP 400, but accepted none. Estimated accounted cost was $0.233953, not a verified bill.
- Live-6 rejected abstract quotes stitched separated passages; `R1008.keywords`, `R1008.open_to` and `R0637.open_to` skipped array items. None became contiguous under NFKC, whitespace/quote folding, case, Serbian script or diagnostic diacritic removal. The correct response is to copy a shorter span or drop the claim, not accept the stitched quote.
- C036-CH1 also exceeded the 600-word limit and had unresolved baseline, metric and resource-commitment issues. Its failure was not solely the phrase “directly applicable”. M4 requests a 350–450-word target and treats conditional transfer reasoning as a proposal while retaining checks on factual premises and feasibility.

Mock mode uses scripted findings, proposal recipes and Critic rules. It exercises the real Mozaik runtime, concurrency, shared state, mechanical checks and correction flow without provider calls. The existing three different mock pairs, abstention and full Critic intervention trace remain in [docs/demo](docs/demo/README.md). They are historical mock artifacts, not regenerated M4 or live outputs.

M4 regression tests read exact rejected outputs from live-6 and reconstruct relevant source shapes using tiny authored fields; the organizer dataset is not added to tests. The source diagnosis above also used the local pinned snapshot. Tests of semantic judgement use a scripted Critic and cannot establish how a live model will respond. **No M4 live run has been performed.**

## Offline verification

```bash
npm test
npm run build
npm run demo
npm run trace -- out/<run-id>/trace.jsonl
```

M4 verification: 36 tests passed and the build passed. Mock run `2026-10-30T11-00-22-063Z-ae7c091d` accepted three distinct pairs after Critic corrections and returned one no-match, with peak concurrent inference 2. The trace report found four analysis overlaps of 27 ms and zero provider calls/cost. See [VERIFICATION.md](VERIFICATION.md) for the executed commands and scope.

Tests need neither the organizer dataset nor provider credentials. The small mock demo uses the local snapshot and produces outputs under gitignored `out/`. On a fresh checkout only, `npm ci` and `npm run data:download` supply dependencies and the pinned fictional snapshot. Keep `data/` out of Git.

## Next live run

Configure `.env` privately from `.env.example` if needed; never overwrite an existing credential file. Default Gemini is `gemini-3.5-flash-lite`. For the Anthropic path, set `PROVIDER=anthropic`, `MODEL=claude-haiku-4-5` and `ANTHROPIC_API_KEY`. Optional role overrides (`COMPANY_MODEL`, `RESEARCH_MODEL`, `WRITER_MODEL`, `CRITIC_MODEL`) must use the same provider. Review planning rates and budget limits before running.

```bash
npm run build
PROVIDER=anthropic MODEL=claude-haiku-4-5 npm run run -- --mode live --challenges C001-CH1,C025-CH1,C036-CH1 --out out
npm run trace -- out/<run-id>/trace.jsonl
```

The CLI selects mock unless `--mode live` is explicit. The command above requires network access, a privately configured provider credential and authorization for paid calls; it was not executed for M4. Preserve `runs/live-1` through `runs/live-6`. Inspect accepted and stopped outputs, claim removals, complete Critic coverage, source context, usage and cost. Do not report acceptance until a new live result actually passes all checks.

## Next three improvements by scoring impact

1. **Validate M4 live convergence and proposal usefulness (review architecture 30 + proposals 25 + accuracy 20).** Run the three challenges with Anthropic, preserve raw outputs and trace, and check whether short copying, labelled reasoning and bounded claim removal reduce false rejection without admitting invented facts. Have a domain reviewer inspect accepted briefs and false acceptances on a small synthetic edge-case set. Report observed acceptance separately from mock success.
2. **Improve bilingual retrieval and bounded re-search (proposals 25 + accuracy 20).** Add a reviewed Serbian/English technical lexicon and one query reformulation for weak evidence. Evaluate missing abstracts, stale profiles, name collisions, false friends and no-match cases. Keep work-side IDs and abstention; never score people's worth.
3. **Build a consent-aware coordinator workflow (real use 15 + responsible data 10).** Implement an authorized snapshot adapter and review queue around the [proposed network/Stars workflow](README.md#plugging-into-the-einstein-network-and-einstein-stars). Coordinators and both parties approve introductions. Stars staff decide whether an approved pilot merits mentoring or research-training discussion. Include verification dates, correction/withdrawal handling and retention; assume no official API, funding, eligibility or automatic outreach.
