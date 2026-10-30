# Handoff

## What works

- TypeScript CLI with Mozaik 4.1.0 pinned and locked; Node 20+. Current local checks use macOS, Node 22.22.3 and npm 10.9.8; earlier checks used Node 22.23.4.
- Immutable organizer snapshot downloader, local BM25 index, Unicode normalization and work-side ID attribution. No raw dataset in Git.
- Concurrent Company Analyst and Research Profiler, validated shared findings, event-driven writer, bounded Critic revision loop and honest abstention/failure states.
- Producer-specific validation corrections: at most two per role per challenge, with exact errors and previous output. Invalid JSON/schema, analysis evidence and Critic review coverage return to their producer. Schema-valid writer drafts pass through the Critic; citation/structure errors and semantic concerns share a separate allowance of two writer–Critic revision cycles.
- Exact-quotation validation and canonical local `field` keys. A `quote` containing only the matching record/field reference or local field name is resolved to source text, with original/resolved citations logged. Source ledgers, per-task/per-attempt JSONL tracing and loop-overlap reports preserve the evidence trail.
- Shared rate/concurrency controls, atomic planning-cost/call budget reservations, bounded retries and timeout failure envelopes.
- Offline tests and full organizer-data mock demo. Three distinct accepted mock pairs plus one abstention are in `docs/demo/`.

## The real failure and the offline repair

The preserved [live result](runs/live-1/C001-CH1.json) records a real `gemini-3.5-flash-lite` run on `C001-CH1` that stopped with `Invalid agent output: Unsupported quote R1015.open_to`. Its two analysis calls overlapped; no proposal or Critic review was produced. The [trace](runs/live-1/trace.jsonl) lacks the rejected raw answer, so the regression is a reconstructed example of that failure class, not an exact provider replay. The original artifacts remain unchanged.

The old [summary](runs/live-1/summary.json) records $0.007857 before the Company Analyst call settled; the two completed attempt rows total $0.015518 at planning rates. Neither is a verified invoice. The repair allows the producing agent to correct invalid output instead of immediately terminating the challenge, while retaining bounded attempts and exact evidence checks. It has not been rerun against a provider.

## What is mocked or unverified

Mock generation uses three local domain recipes, not an LLM. Mock Critic semantic review is scripted; quote/ID/link validation is real. Injected guarantees demonstrate rejection and correction, not a naturally occurring live hallucination. Mock token usage is unknown and cost is zero. Offline intercepted-HTTP tests check request mapping, token caps and retry disablement; they do not establish semantic quality. One real inference run failed as described above. No successful live proposal, verified charges, real meetings or integration with EINSTEIN are claimed.

## Next live evaluation, when authorized

This workspace already has dependencies and the pinned dataset. Reuse them. Only a fresh checkout needs the following optional setup:

```bash
npm ci
npm run data:download
```

For a fresh checkout, create `.env` from `.env.example` only if absent, then privately configure the credential and planning rates. For the existing workspace, verify its configuration without overwriting it. The normal three-challenge rerun is:

```bash
# Default: PROVIDER=gemini, MODEL=gemini-3.5-flash-lite.
# Alternative: PROVIDER=anthropic, MODEL=claude-haiku-4-5, ANTHROPIC_API_KEY=...
npm run build
npm run run -- --mode live --challenges C001-CH1,C025-CH1,C036-CH1
npm run trace -- out/<run-id>/trace.jsonl
```

For an optional single-challenge smoke run, substitute `--challenges C001-CH1`. Use a fresh output directory and preserve `runs/live-1`. Inspect all facts, validation corrections, Critic decisions and provider usage. Keep mock labels on the included examples. No provider call is needed to run the offline regression or mock demo.

The default 96 provider-attempt ceiling accommodates three challenges with two writer–Critic revision cycles each (24 logical calls), up to two producer validation corrections for each of four roles per challenge (24 more), and one HTTP retry per logical call. Writer citation/structure errors and semantic revisions share the two-cycle allowance. The unchanged $2 budget is a hard limit on configured planning-cost reservations and settlements, not a guaranteed invoice cap. Cost or deadline limits can stop a run before the call ceiling.

The offline organizer-data packet estimate for the three challenges and two Critic revisions each was $0.891778 for 24 tasks at the default rates/full output caps, or $1.783556 if every same-sized task needed one HTTP retry. Longer live responses and validation repairs can require more; this estimate does not measure live cost. All 17 offline tests pass, including the reconstructed live failure, each role's malformed/empty-output corrections, bounded exhaustion and the 24-task path.

## Next three improvements, ordered by scoring impact

1. **Evaluate live review and proposal usefulness (accuracy 20 + proposals 25 + review architecture 30).** After authorization, rerun the failed challenge and a small synthetic validation set spanning direct matches, false friends, absent abstracts, stale notes and non-research requests. Confirm that invalid outputs either recover through the producing role or stop at the stated limit. Have a domain reviewer label evidence/fit and inspect Critic false acceptances. Report actual live outcomes separately from mock and reconstructed regression results.
2. **Improve bilingual retrieval and targeted re-search (proposals 25 + accuracy 20).** Add a small reviewed Serbian/English technical lexicon and field-aware retrieval. Let the Profiler request one bounded query reformulation when evidence is weak. Test the prep notes' Serbian and battery/quantum cases before claiming higher recall; retain evidence paths and abstention.
3. **Add a consent-aware coordinator workflow (real use 15 + responsible data 10).** Use the [proposed network/Stars workflow](README.md#plugging-into-the-einstein-network-and-einstein-stars): build an authorized snapshot adapter and coordinator review queue around the existing CLI outputs. Network coordinators and both parties approve introductions; Stars staff decide whether an approved pilot merits a mentoring or research-training discussion. Include verification dates, correction/withdrawal handling and retention. Confirm official procedures with staff; no API, funding, eligibility, acceptance, person-worth ranking or automatic outreach is assumed.
