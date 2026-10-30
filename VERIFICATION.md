# Verification record

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
