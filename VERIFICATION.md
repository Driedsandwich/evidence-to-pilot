# Verification record

## M4 — offline verification, 30 October 2026

No provider calls, dependency installation, dataset downloads, training or commits were performed for M4. Historical `runs/live-1` through `runs/live-6` are unchanged. M4 live acceptance remains unverified.

| Command / check | Result |
| --- | --- |
| `npm run build` | Strict TypeScript build passed; also run by `npm test` and `npm run demo`. Existing Mozaik 4.1.0 declarations for runtime, events and context APIs were checked; no new Mozaik API names were introduced. |
| `npm test` | 36 tests passed, 0 failed. Includes exact live-6 rejected outputs with authored source reconstructions, normalized contiguous matching, wrong record/field rejection, significant diacritics, optional claim removal, essential evidence loss, full recovery review, conditional judgement and invented-premise rejection. Semantic review tests are scripted, not live model evaluations. |
| `npm run demo` | Run `2026-10-30T11-00-22-063Z-ae7c091d`: C001-CH1/R1008, C025-CH1/R0637 and C036-CH1/R0976 accepted in mock mode after one Critic correction each; C101-CH1 returned no-good-match. Outputs are under gitignored `out/`. Existing `docs/demo` examples were preserved. |
| `npm run trace -- out/2026-10-30T11-00-22-063Z-ae7c091d/trace.jsonl` | 22 completed loops; four analysis overlaps of 27 ms; peak simultaneous inference 2; three Critic send-backs; zero provider attempts and mock cost. |
| Bounded local quote diagnosis | All four distinct failed Profiler strings in live-6 failed containment under raw, NFKC, whitespace/quote folding, case, Serbian script and diagnostic diacritic removal. Original fields show skipped passages/items, documented in README. No model inference was used for this comparison. |
| `git diff --check` | Passed. Changes remain uncommitted; dependency pins, lockfile and preserved live artifacts are unchanged. |

The first build exposed a prompt string quoting error and missing TypeScript annotations; these were corrected. Restoring the requested Flash-Lite default also required updating a prior default-model assertion. The final suite passes without removing any prior tests. Final code and documentation checks were self-review, not independent verification.

## M3 — historical offline verification, 30 October 2026

Existing macOS dependencies and fictional dataset reused: Node 22.22.3, npm 10.9.8, Mozaik 4.1.0. No network calls, provider credentials, installation, downloads, training, full-dataset model inference or commits were needed. All changes remain in the working tree. The preserved live results in `runs/live-1` through `runs/live-4` predate these changes.

| Command / check | Result |
| --- | --- |
| `npm run build` | Strict TypeScript build passed using existing packages. |
| `npm test` | 29 tests passed, 0 failed, including 429/503 recovery and exhaustion, shared retry-wait budget, Retry-After seconds/dates, SDK error-body sanitization, native structured schema mapping, role-model selection, Critic coverage and multi-challenge continuation. HTTP responses are intercepted fixtures, not live calls. |
| `npm run demo` | Three distinct mock proposals accepted after Critic corrections; one mock abstention. Run `2026-10-30T10-30-54-911Z-b7998553`; selected outputs refreshed in `docs/demo/`. |
| `npm run trace -- docs/demo/trace.jsonl` | 22 completed Mozaik loops; peak concurrent inference 2; four analysis overlaps of 27–28 ms; three Critic correction cycles; zero provider calls/cost, unknown mock tokens. |
| Proposal readback | Three 12-week briefs contain problem, why together, experiment, roles, requested data, month-by-month deliverables, decision gate, risks and source IDs. Rationale plus plan: 394/376/409 words; full Markdown: 572/586/562 words. |
| Independent read-only review | No material code regression identified. The reviewer requested updating the old verification record; this M3 section addresses that finding. Review did not test live service behavior or final demo artifacts. |
| Final artifact / scope checks | Demo copies match the generated run; documentation links resolve; `git diff --check` passes. `runs/`, `docs/prep/`, package versions and lockfile are unchanged; no raw `data/` files are tracked. |

The new transport diagnostics are bounded sanitized provider messages, not complete raw responses. No-body/transport failures explicitly retain an unavailable-body marker; no HTTP status is invented. Retry budget limits scheduled backoff over all tasks in a run, separately from bounded admission/request waits. The Anthropic schema mismatch is a code-supported likely cause, not a confirmed explanation of the previous HTTP 400. No claim is made that M3 has recovered a live run or improved measured semantic quality. See [installed API checks](docs/mozaik-api-check.md#m3-adapter-checks-offline).

After review, the Gemini error path was hardened to retain status and Retry-After even if the response body stream fails. The intercepted-SDK regression covers that case; the final `npm test` rerun again passed all 29 tests.

The prior verification records below are historical. Their demo run IDs and test counts refer to previous snapshots; `docs/demo/` now contains the M3 output above.

## Live-1 repair — historical local verification, 30 October 2026

Environment: user's macOS laptop, Node **22.22.3**, npm **10.9.8**, installed TypeScript **5.9.3** and Mozaik **4.1.0**. Existing dependencies and organizer data were reused. This session made **no provider calls, network downloads, dependency installs or commits**. No training or dataset-wide model inference was run.

The original `runs/live-1` is a **real failed Gemini run**, not a mock. Its error was `Invalid agent output: Unsupported quote R1015.open_to`. Its raw answer is absent, so the regression reconstructs the reported field-path citation using tiny authored records and checks its IDs/error against the preserved trace. This is not an exact provider-output replay. The old literal substring check rejects the reconstructed path; the repaired workflow resolves it to field text and reaches mock acceptance. A separate invalid-quote regression exercises send-back rather than normalization. The original live artifacts and `docs/prep/` are unchanged.

| Command / check in this repair session | Result |
| --- | --- |
| Read installed `node_modules/@mozaik-ai/core/dist/index.d.ts` | Confirmed runtime, context, output, runner and schema APIs before changes. No new Mozaik API was invented. |
| `npm test` (includes `npm run build`) | **17 tests passed, 0 failed**. Strict TypeScript build passed. Tiny fixtures require no organizer data or credentials. |
| `npm run demo` | **3 distinct mock proposals accepted after correction; 1 honest mock abstention**. Fresh output copied to `docs/demo/`; run `2026-10-30T09-55-23-232Z-9749fa9c`. |
| `npm run trace -- docs/demo/trace.jsonl` | 22 completed Mozaik tasks, peak concurrency 2, four overlapping analysis pairs, three Critic send-back cycles. C001 analysis overlap: 28 ms. Zero provider calls; mock usage unknown, cost zero. |
| Small offline `runWorkflow` packet-size probe on C001/C025/C036, with two scripted Critic revisions each | 24 tasks completed. Applying the runner's byte-count input reservation and 4,096-token output cap at configured $1/$5 per million gives **$0.891778** total reservations; largest single reservation **$0.051527**. Doubling the same packets for one retry each gives **$1.783556**. These are capacity estimates, not provider token measurements/prices. |
| `git diff --check`; `git ls-files data package-lock.json runs/live-1`; preserved-file diff | No whitespace errors; lockfile already tracked, no raw `data/` files tracked, no changes to `runs/live-1`, `docs/prep/`, package versions or lockfile. |
| Independent read-only code review, followed by focused re-review | Found empty provider-output and empty-ID gaps; both fixed and regression-tested. Focused static re-review found no remaining material issue in those paths. This does not validate live semantic judgement. |

Regression coverage now includes field-path resolution and mismatched/fabricated/empty-field rejection; malformed JSON, schema, no-answer and reasoning-only output for **all four roles**; exact producer feedback; incomplete Critic coverage returning to the Critic; atomic publication of valid findings only; bounded correction exhaustion; forged model `applicationError` treated as invalid schema; empty researcher IDs; and sibling-loop settlement before run summaries. Existing provider-adapter, limiter, retry, concurrency, citation, attribution and abstention tests remain passing.

During development, the added tests exposed Critic correction feedback being mistaken for proposal defects; those channels are now separate. A mutation in the test injector was isolated by cloning its output before introducing faults. The final test pass includes those corrections and the independent-review fixes. The proposed joint-project and conditional industrial PhD briefs contain 392, 395 and 401 words respectively in rationale plus plan, under the 600-word limit.

Default call capacity is 12 tasks for three unrevised challenges, 18 with one writer–Critic revision each, or 24 with two each. Two producer validation repairs per role/challenge add at most 24 tasks, giving 48 logical tasks and at most 96 provider attempts with one HTTP retry each. Monetary and deadline stops still apply; no promise of live convergence is made. README and NEXT_STEPS explain the original failure, correction bounds, proposed network/Stars integration and the remaining live rerun.

## Historical initial implementation record (before the imported live run)

The following is the prior workspace's verification record, retained as history. Its install, commit and no-live statements describe that initial session, not the repair session above or the later real failed run.

Implementation and checks took place on 30 October 2026 during the event, after 10:00 CET. Environment: Linux, Node 22.23.4, npm 10.9.9, TypeScript 5.9.3. The installed Node binary was outside the initial PATH, so commands used:

```bash
export PATH=<run-dir>
```

This PATH adjustment is specific to the build workspace; users with Node on PATH do not need it.

| Command / check | Result |
| --- | --- |
| `npm install --ignore-scripts` and exact dependency installs | Installed Mozaik 4.1.0 and generated lockfile. Zod was updated to 4.6.7 after an audit advisory; final audit reports zero vulnerabilities. |
| Read `node_modules/@mozaik-ai/core/dist/index.d.ts` and relevant installed SDK declarations | Checked all Mozaik API names before using them; details in `docs/mozaik-api-check.md`. |
| `npm run data:download` | Downloaded six organizer files at the pinned commit; generated SHA-256 manifest under ignored `data/`. |
| `npm run build` | Passed strict TypeScript compilation with `skipLibCheck: false`. |
| `npm test` | 11 tests passed, 0 failed; no dataset download or provider credentials required. The full workflow test rejects socket/fetch network access. |
| `npm run demo` | Passed on organizer data. C001/R1008, C025/R0637 and C036/R0976 accepted after mock critic corrections; C101-CH1 abstained. |
| `npm run trace -- docs/demo/trace.jsonl` | Printed all 22 task rows, four analysis-loop overlaps (26–28 ms), three rejection/correction cycles and one abstention. Peak concurrent inference: 2. |
| `npm ci --ignore-scripts` then `npm test` | Clean lockfile install succeeded; all 11 tests passed again. Installation audit: zero vulnerabilities. |
| `npm exec --yes --package=prettier@3.7.4 -- prettier --write src test scripts package.json tsconfig.json` | Applied consistent source formatting; Prettier is not required at runtime. |

Test coverage includes actual concurrent Mozaik loops and shared-state coordination, source/link checks, name collisions, Cyrillic normalization, critic coverage and correction, bounded review refusal, unknown challenges, atomic call/cost budgets, rate/concurrency limiting, retry classification, timeout slots, model/credential configuration and intercepted HTTP contracts for both provider adapters. The adapter tests check native output caps, structured-output schema mapping, usage conversion and disabled SDK retries without contacting a provider.

An early demo attempt failed because TypeScript initially inferred `src/` as its source root, while the CLI script expected `dist/src/`. Setting explicit `rootDir: "."` corrected this; subsequent builds, tests and demos passed. No unresolved build/test failure remains.

No live inference, paid embedding, actual provider bill, network/Stars integration, outreach or public submission was performed. Mock acceptance demonstrates the implemented mechanics and conditional proposal templates; it does not establish live recommendation quality. `docs/prep/` was not modified. Raw dataset files and credentials are excluded from the commit and handoff source copy.

The workspace had no Git author configured. The required local commit used per-command identity `Codex <codex@localhost>`; global and repository Git identity settings were not changed.
