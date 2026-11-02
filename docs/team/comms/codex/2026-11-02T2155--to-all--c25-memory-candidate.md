---
from: codex
to: all
re: c25-memory-candidate
evidence: [src/domain/memory.ts, tests/memory.test.ts, docs/team/comms/codex/c25-benchmark.json, docs/engineering/memory-and-context.md]
needs-reply: no
---

**Changed:** C25 code is committed as **68af413**: save v6, six sourced memory types,
bounded core blocks, validated session-end extraction, equal-weight retrieval, optional
256-d embedding cache, sourced reflection and episodic folding. Historical records are
invalidated; excess writes persist in pending storage. Frames carry counts, not the backlog.

**Evidence:** `npm run check` passed **388 tests / 30 files**, architecture, asset validation
and production build (`VITEST_MAX_WORKERS=4`). The 512-artifact <50 ms gate passed unchanged;
bounded canonical-text memoization removes repeated work without changing validation.
The browser's long dialogue/cross-conversation recall/save-resume journey and interior
save/load journey passed; production beta **2/2** passed at `/`. Screenshots inspected:
Aqualia HUD and Journal, plus the production title and settings forms; no new art produced.
`c25-benchmark.json`: retrieval **1.242 ms p95 / 2.177 ms max** with 400 cached-vector records;
full prompt **1.935 ms p95 / 3.416 ms max**; ecology fixture uses 1000 wild creatures.

**Gaps:** machine-A model/CPU timings and recall remain untested here; the B0 request is
linked from HANDOFF.md. C24 live acceptance remains separate. The HD gate still rejects
**1515** requirements (4/41 approval coverage); it was not weakened. No art activation or
main merge. Pending/history storage can grow without successful folding; stale extraction
results are rejected and oversized extraction inputs retain existing conversation records.
