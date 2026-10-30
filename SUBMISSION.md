# NTP Novi Sad AI Hackathon submission

Copy the text inside one block per field. Short versions are at most 300 characters; full versions are at most 1,500 characters, including spaces and punctuation. Labels and code fences are not part of the field text. The project name, repository URL and track stay identical in both versions.

## Project name

### Short

```text
Evidence to Pilot
```

### Full

```text
Evidence to Pilot
```

## Repository

### Short

```text
https://github.com/Driedsandwich/evidence-to-pilot
```

### Full

```text
https://github.com/Driedsandwich/evidence-to-pilot
```

## Description

### Short

```text
Evidence to Pilot turns company challenges into cited, three-month research pilot proposals. On fictional organizer data, runs/live-8 records three proposals accepted after Critic revisions. Acceptance means software checks passed; the pilots have not been carried out.
```

### Full

```text
Evidence to Pilot helps coordinators turn a company's technical challenge into a research collaboration proposal for discussion. A TypeScript CLI uses four Mozaik agents: Company Analyst, Research Profiler, Proposal Writer and Critic. Local search links researchers to works by record IDs. Each brief contains source quotations, a proposed three-month experiment, baseline, decision criteria, requested resources and a meeting agenda.

The recorded provider run in runs/live-8 accepted C001-CH1/R1008, C025-CH1/R0637 and C036-CH1/R0976 on fictional organizer data. The proposals cover industrial-network anomaly detection, circuit-board emission checks and raspberry packaging. Each required one Critic-requested revision. The run records 22 provider attempts and peak concurrent inference of 2; summary.json, trace.jsonl, briefs and evidence ledgers are preserved in that folder.

Acceptance means mechanical and model checks passed, not partner consent or demonstrated feasibility. Runs in runs/live-1 through runs/live-7 preserve earlier failures and one accepted proposal; these development runs are not an accuracy benchmark. The pilots were not carried out, and EINSTEIN/Stars integration remains proposed. The system does not score people's worth. Judges can start with npm run demo after npm ci: small authored fixtures exercise the real runtime and correction path offline, using scripted model responses and no credentials.
```

## How the agents run concurrently

### Short

```text
Company Analyst and Research Profiler run concurrently in Mozaik and publish validated findings to shared state. Writer waits for both; Critic reviews and requests revisions. Challenges run sequentially. runs/live-8/trace.jsonl shows overlapping loops; summary.json reports peak inference 2.
```

### Full

```text
One Mozaik runtime hosts four agents and an observer. For each challenge, Company Analyst and Research Profiler subscribe to challenge.opened and start separate runLoop calls without waiting for each other. They share the dataset, search index and retrieved work/researcher ID pairs. The observer validates their outputs before publishing findings to shared state and emitting findings.ready. Writer starts only when both findings exist; Critic then reviews the draft. Invalid outputs return to their producer, and Critic revision requests return to Writer through bounded correction loops. Challenges are processed one at a time; the parallel work is the two analysts within each challenge, not all four roles at once.

All roles share a request-concurrency limiter and rate, attempt and estimated-cost budgets. In runs/live-8/trace.jsonl, the initial analyst loops overlap by 5,901 ms for C001-CH1, 6,729 ms for C025-CH1 and 6,640 ms for C036-CH1. runs/live-8/summary.json records peak concurrent inference of 2 and 22 provider attempts. Each proposal received one Critic-requested revision before acceptance; the trace also records four producer-validation send-backs. These are recorded overlaps, not measured speed-up against a sequential baseline.
```

## Track selection

Select the track when submitting; this is the track named in README.

### Short

```text
EINSTEIN Science-to-Business Matchmaker
```

### Full

```text
EINSTEIN Science-to-Business Matchmaker
```

## Judge commands

The first demo command is **`npm run demo`**. For a fresh clone, use Node 20 or later and install the locked dependencies first:

```bash
npm ci
npm run demo
```

The demo builds TypeScript and runs small authored fictional fixtures with scripted model responses. It needs no credentials, `.env` or organizer dataset. Expected results are three mock acceptances after correction and one `no_good_match`, with zero provider attempts. These mock results demonstrate workflow mechanics, not live model quality.

The live command is:

```bash
npm run run -- --mode live --challenges C001-CH1,C025-CH1,C036-CH1 --out out
```

Before a live run, follow README: obtain the pinned organizer snapshot with `npm run data:download`, run `npm run build`, and configure `ANTHROPIC_API_KEY` privately as described in `.env.example`. Review spending limits before making paid provider calls. With no model overrides, the defaults are `claude-haiku-4-5` for the analysts and `claude-sonnet-5-5` for Writer and Critic, matching the configuration recorded in `runs/live-8`. Live results may differ. No new live run was performed for this submission draft.

## Evidence and submission checks

- Project purpose, track and reproduction instructions: [README](README.md); commands and Node requirement: [package.json](package.json) and [package-lock.json](package-lock.json).
- Concurrent execution and shared-state coordination: [workflow implementation](src/workflow.ts); mock entry point: [demo implementation](src/demo.ts).
- Live outcome and concurrency: [runs/live-8 summary](runs/live-8/summary.json), [raw trace](runs/live-8/trace.jsonl) and [derived trace report](docs/live-8-trace-report.md).
- Accepted proposal artifacts: [C001-CH1](runs/live-8/C001-CH1.md), [C025-CH1](runs/live-8/C025-CH1.md) and [C036-CH1](runs/live-8/C036-CH1.md), each with a linked evidence ledger and review history.
- Earlier outcomes: summaries in [runs/live-1](runs/live-1/summary.json), [runs/live-2](runs/live-2/summary.json), [runs/live-3](runs/live-3/summary.json), [runs/live-4](runs/live-4/summary.json), [runs/live-5](runs/live-5/summary.json), [runs/live-6](runs/live-6/summary.json) and [runs/live-7](runs/live-7/summary.json).
- Build, tests and fresh-clone installation/demo checks are recorded in [VERIFICATION.md](VERIFICATION.md).

The repository URL matches the configured Git origin. Remote visibility and judge permissions could not be checked offline. Before submitting, confirm that judges can open the repository and its run artifacts. Track selection is made in the submission form; final field limits must be checked when published.
