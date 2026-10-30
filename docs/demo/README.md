# Full mock demonstration

Regenerated locally during the event from the already-present, pinned organizer snapshot (no download or provider calls in this repair session):

```bash
npm run demo
npm run trace -- docs/demo/trace.jsonl
```

Run ID: `2026-10-30T09-55-23-232Z-9749fa9c`. These files are the copied output of that complete run. Data snapshot: `4fb99b3749adf0d10b5977089ff4c73f4f522240`. All people, companies and work records cited here are fictional organizer data.

| Challenge | Researcher | Outcome | Brief | Evidence |
| --- | --- | --- | --- | --- |
| C001-CH1 | R1008 | mock accepted after correction | [ICS pilot](C001-CH1.md) | [ledger](C001-CH1.evidence.md) |
| C025-CH1 | R0637 | mock accepted after correction | [PCB pilot](C025-CH1.md) | [ledger](C025-CH1.evidence.md) |
| C036-CH1 | R0976 | mock accepted after correction | [Packaging pilot](C036-CH1.md) | [ledger](C036-CH1.evidence.md) |
| C101-CH1 | none | mock abstention | [No good match](C101-CH1.md) | [ledger](C101-CH1.evidence.md) |

The three proposals contain 392–401 whitespace-delimited words in rationale plus plan, below the 600-word cap; their source quotations are in separate ledgers. Targets, resources, research follow-ons and terms are proposed for discussion, not achieved or agreed.

## Where the Critic stepped in

The demo intentionally inserted an unsupported 99% success guarantee in the first draft's researcher biography citation. For C001-CH1:

1. Company Analyst and Research Profiler loops overlapped for **28 ms** and wrote separate cited findings into shared state.
2. Writer revision 0 included the labelled test fault.
3. Critic loop `f83c7d57-794a-4a06-834e-1904b74bfd42` recorded `Unsupported quote R1008.bio` and requested revision.
4. Writer revision 1 removed the false claim.
5. Critic loop `a992f62c-ad89-4a2c-9414-1c90fb15b62a` accepted the repaired mock proposal.

The same injected-fault loop ran for the other two matched pairs. The quantum challenge did not receive an invented pair: the mock abstained because its domain recipes do not cover that challenge. This is not a judgement that UNS lacks quantum expertise.

The run completed **22 actual Mozaik loops**, with peak concurrent inference **2**, **0 provider calls** and **$0 mock inference cost**. Token counts are unknown, not invented. All four challenge analysis branches show overlap. See the [per-task/overlap report](trace-report.md), [full JSONL trace](trace.jsonl) and [summary](summary.json).

**This is a scripted mock demonstration.** The injected fault is deliberate; no live hallucination, live semantic review or provider performance was measured. No introductions were sent.

For the separate real Gemini failure, see [runs/live-1](../../runs/live-1/trace.jsonl). That run stopped before drafting; this regenerated demonstration does not claim that the live repair has succeeded.
