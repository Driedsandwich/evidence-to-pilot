# Handoff

## What works

- TypeScript CLI with Mozaik 4.1.0 pinned and locked; Node 20+. Current local checks use macOS, Node 22.22.3 and npm 10.9.8; earlier checks used Node 22.23.4.
- Immutable organizer snapshot downloader, local BM25 index, Unicode normalization and work-side ID attribution. No raw dataset in Git.
- Concurrent Company Analyst and Research Profiler, validated shared findings, event-driven writer, bounded Critic revision loop and honest abstention/failure states.
- Producer-specific validation corrections: at most two per role per challenge, with exact errors and previous output. Invalid JSON/schema, analysis evidence and Critic review coverage return to their producer. Schema-valid writer drafts pass through the Critic; citation/structure errors and semantic concerns share a separate allowance of two writer–Critic revision cycles.
- Exact-quotation validation and canonical local `field` keys. A `quote` containing only the matching record/field reference or local field name is resolved to source text, with original/resolved citations logged. Source ledgers, per-task/per-attempt JSONL tracing and loop-overlap reports preserve the evidence trail.
- Shared rate/concurrency controls, atomic planning-cost/call budget reservations, bounded retries and timeout failure envelopes.
- Offline tests and full organizer-data mock demo. Three distinct accepted mock pairs plus one abstention are in `docs/demo/`.
- One recorded live proposal passed the then-current checks: [live-4 / C001-CH1](runs/live-4/C001-CH1.json), using Gemini Flash and fictional researcher R1015. This is not partner consent or a validated pilot outcome.

## Recorded live evidence

The preserved results cover four runs and ten challenge attempts on 30 October 2026: one accepted and nine stopped. The [README result table](README.md#recorded-live-results) links each summary and trace.

- [live-1](runs/live-1/summary.json): Flash-Lite stopped C001-CH1 on an unsupported `R1015.open_to` quote, before writing or Critic review. Its trace lacks the rejected raw answer; the regression reconstructs that error class rather than replaying the exact response.
- [live-2](runs/live-2/summary.json): Flash-Lite reached drafts for C001-CH1 and C025-CH1, but both exhausted Critic coverage corrections. C036-CH1 stopped on HTTP 429. All three challenges stopped. Its trace records 10 validation failures and eight send-backs; these are within-run correction events, not additional challenge outcomes.
- [live-3](runs/live-3/summary.json): Anthropic Haiku returned HTTP 400 for all three challenges; all six analysis attempts failed. The recorded status alone does not establish the provider's reason.
- [live-4](runs/live-4/summary.json): Flash accepted C001-CH1 / R1015 after one Critic review, proposing a 12-week anomaly-detection pilot. C025-CH1 stopped on HTTP 503 and C036-CH1 on HTTP 429. The batch therefore remains a partial success.

The old live-1 summary records $0.007857 before the Company Analyst call settled; the two completed attempt rows total $0.015518 at planning rates. The other summaries record $0.231351, $0.231760 and $0.354370. These figures include retained reservations for failed requests and are not verified invoices. Recorded artifacts are preserved; the M3 changes have not been rerun against a provider.

## M3 changes to evaluate next

- Flash is the default, with optional same-provider models per role. Historical model differences are observations from these runs, not a controlled model comparison.
- The Critic returns a decision, `verdicts` with each claim's path and `ok`, `unsupported` or `uncertain` status, and correction issues. Local checks require every claim path exactly once. Writer instructions require a three-month (12-week) plan with required data, milestones and role assignments. The 600-word limit applies to rationale plus plan, not the entire rendered brief.
- HTTP retries use exponential backoff with jitter and honor usable `Retry-After` headers on 429/503. Defaults are `RETRY_BASE_MS=1000`, `RETRY_MAX_MS=30000` and `MAX_RETRY_WAIT_MS=120000`; the last value caps total scheduled retry waits across the run, excluding limiter waits and request timeouts. A required delay beyond the remaining budget stops the task without an early retry. `MAX_RETRIES=1` remains the default and cannot exceed three.
- New `provider_attempt.errorStatus` and `provider_attempt.errorBody` fields retain available HTTP status and sanitized diagnostics of at most 600 characters. Transport failures without HTTP status use `null`; unavailable or unrecognized bodies use `No provider error body available`. Arbitrary structured bodies are not retained. `retry_scheduled` logs planned waits, `retry_stopped` logs retry-wait-budget refusals, and `summary.retryWaitMs` totals scheduled backoff. Preserved live traces are unchanged.
- The Anthropic adapter uses the installed SDK's `jsonSchemaOutputFormat` transformation; full local Zod validation remains authoritative. Inspection confirmed that the previous raw schema bypassed this helper and contained constraints the helper transforms. That is a plausible HTTP 400 cause, not proven by the old trace. No old error body or new live result is available to establish causality. The workflow did not send thinking/temperature settings. Gemini now uses `responseJsonSchema` for JSON Schema requests.

Use [VERIFICATION.md](VERIFICATION.md) for the executed offline checks. None of these changes demonstrates provider recovery, semantic accuracy or lower real charges until a separately authorized live evaluation is completed.

## What is mocked or unverified

Mock generation uses three local domain recipes, not an LLM. Mock Critic semantic review is scripted; quote/ID/link validation is real. Injected guarantees demonstrate rejection and correction, not a naturally occurring live hallucination. Mock token usage is unknown and cost is zero. Offline intercepted-HTTP tests check request mapping, token caps and retry disablement; they do not establish semantic quality. One live proposal passed the checks of its recorded version, but no repeatability, broad accuracy, verified charges, real meetings or integration with EINSTEIN is claimed.

## Next live evaluation, when authorized

This workspace already has dependencies and the pinned dataset. Reuse them. Only a fresh checkout needs the following optional setup:

```bash
npm ci
npm run data:download
```

For a fresh checkout, create `.env` from `.env.example` only if absent, then privately configure the credential and planning rates. For the existing workspace, verify its configuration without overwriting it. The normal three-challenge rerun is:

```bash
# Default: PROVIDER=gemini, MODEL=gemini-3.5-flash.
# Alternative: PROVIDER=anthropic, MODEL=claude-haiku-4-5, ANTHROPIC_API_KEY=...
npm run build
npm run run -- --mode live --challenges C001-CH1,C025-CH1,C036-CH1
npm run trace -- out/<run-id>/trace.jsonl
```

For an optional single-challenge smoke run, substitute `--challenges C001-CH1`. Use a fresh output directory and preserve `runs/live-1` through `runs/live-4`. Inspect all facts, validation corrections, Critic decisions and provider usage. Keep mock labels on the included examples. No provider call is needed to run the offline regression or mock demo. Optional `COMPANY_MODEL`, `RESEARCH_MODEL`, `WRITER_MODEL` and `CRITIC_MODEL` overrides inherit `MODEL` when omitted and must belong to the same selected provider.

The default 96 provider-attempt ceiling accommodates three challenges with two writer–Critic revision cycles each (24 logical calls), up to two producer validation corrections for each of four roles per challenge (24 more), and one HTTP retry per logical call. Writer citation/structure errors and semantic revisions share the two-cycle allowance. The unchanged $2 budget is a hard limit on configured planning-cost reservations and settlements, not a guaranteed invoice cap. Cost or deadline limits can stop a run before the call ceiling.

The earlier offline organizer-data packet estimate for the three challenges and two Critic revisions each was $0.891778 for 24 tasks at the configured rates/full output caps, or $1.783556 if every same-sized task needed one HTTP retry. Prompt changes, longer live responses and validation repairs can require more; this historical estimate does not measure live cost or establish the M3 cost envelope. See [VERIFICATION.md](VERIFICATION.md) for current executed checks.

## Next three improvements, ordered by scoring impact

1. **Evaluate live review and proposal usefulness (accuracy 20 + proposals 25 + review architecture 30).** After authorization, rerun the three challenges with the M3 changes, preserving both accepted and stopped outputs. Confirm compact Critic coverage, bounded handling of provider failures and complete three-month plans. Then use a small synthetic validation set spanning direct matches, false friends, absent abstracts, stale notes and non-research requests. Have a domain reviewer label evidence/fit and inspect Critic false acceptances. Report actual live outcomes separately from mock and reconstructed regression results.
2. **Improve bilingual retrieval and targeted re-search (proposals 25 + accuracy 20).** Add a small reviewed Serbian/English technical lexicon and field-aware retrieval. Let the Profiler request one bounded query reformulation when evidence is weak. Test the prep notes' Serbian and battery/quantum cases before claiming higher recall; retain evidence paths and abstention.
3. **Add a consent-aware coordinator workflow (real use 15 + responsible data 10).** Use the [proposed network/Stars workflow](README.md#plugging-into-the-einstein-network-and-einstein-stars): build an authorized snapshot adapter and coordinator review queue around the existing CLI outputs. Network coordinators and both parties approve introductions; Stars staff decide whether an approved pilot merits a mentoring or research-training discussion. Include verification dates, correction/withdrawal handling and retention. Confirm official procedures with staff; no API, funding, eligibility, acceptance, person-worth ranking or automatic outreach is assumed.
