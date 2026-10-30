# Handoff

## What works

- TypeScript CLI with Mozaik 4.1.0 pinned and locked; Node 20+, tested with Node 22.23.4.
- Immutable organizer snapshot downloader, local BM25 index, Unicode normalization and work-side ID attribution. No raw dataset in Git.
- Concurrent Company Analyst and Research Profiler, shared findings, event-driven writer, bounded Critic revision loop and honest abstention/failure states.
- Exact-quotation validation and source ledgers, per-task/per-attempt JSONL tracing and loop-overlap report.
- Shared rate/concurrency controls, atomic planning-cost/call budget reservations, bounded retries and timeout failure envelopes.
- Offline tests and full organizer-data mock demo. Three distinct accepted mock pairs plus one abstention are in `docs/demo/`.

## What is mocked or unverified

Mock generation uses three local domain recipes, not an LLM. Mock Critic semantic review is scripted; quote/ID/link validation is real. Injected guarantees demonstrate rejection and correction, not a naturally occurring live hallucination. Mock token usage is unknown and cost is zero. Live provider request mapping, token caps and retry disablement were checked with intercepted HTTP only. No actual live inference, charges, real meetings or integration with EINSTEIN were performed.

## Run live later

```bash
npm ci
npm run data:download
cp .env.example .env
# Privately set GEMINI_API_KEY and conservative token-price planning rates.
# Default: PROVIDER=gemini, MODEL=gemini-3.5-flash-lite.
# Alternative: PROVIDER=anthropic, MODEL=claude-haiku-4-5, ANTHROPIC_API_KEY=...
npm run build
npm run run -- --mode live --challenges C001-CH1
npm run trace -- out/<run-id>/trace.jsonl
```

Begin with one challenge. Inspect all facts, critic decisions and actual provider usage before expanding. Keep mock labels on the included examples. No live execution occurred during implementation.

## Next three improvements, ordered by scoring impact

1. **Evaluate live review and proposal usefulness (accuracy 20 + proposals 25 + review architecture 30).** Run a small, consent-free synthetic validation set spanning direct matches, false friends, absent abstracts, stale notes and non-research requests. Have a domain reviewer label evidence/fit and inspect critic false acceptances. Improve prompts and error repairs from those failures; report real measured results separately from mock demonstrations.
2. **Improve bilingual retrieval and targeted re-search (proposals 25 + accuracy 20).** Add a small reviewed Serbian/English technical lexicon and field-aware retrieval. Let the Profiler request one bounded query reformulation when evidence is weak. Test the prep notes' Serbian and battery/quantum cases before claiming higher recall; retain evidence paths and abstention.
3. **Add a consent-aware coordinator workflow (real use 15 + responsible data 10).** Implement a reviewed network export/import adapter with verification dates, correction/withdrawal handling and retention. Add human approval of a meeting packet for both partners and a Stars discussion packet. Confirm official procedures with program staff; never introduce person-worth rankings or automatic outreach.
