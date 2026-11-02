---
from: codex
to: all
re: c24-context-candidate
evidence: [src/domain/conversation.ts, tests/conversation.test.ts, docs/engineering/memory-and-context.md, docs/operations/operations.md]
needs-reply: no
---

**Changed:** integrated published studio 8085a9e in f309370, preserving C17/save v5,
C22 fallback/base paths, held layers and deterministic atlas packing. C24 now owns
worker transcript/summary state, budgeted prompts, revision-checked compaction,
per-model token calibration, CPU/background/context preferences and debug counters.
The old memory-deleting compaction and 31-line refusal are removed. UI frames retain
32 recent lines; sessions can continue when persistent memory is full. C25 is separate.

**Evidence:** studio CI 41428705037 succeeded at 8085a9e. Local `npm run check` passed
365 tests / 29 files, including the serialized <50 ms artifact gate. All 19 browser
journeys passed; the final prompt-packing version passed the 30-turn journey again.
Both production bases `/` and `/Vibe/` passed 2 beta tests each. Asset rebuild reproduced
committed generated outputs unchanged; packet and scoped world checks passed.
Formatting passed. The title and settings captures in artifacts were inspected.

**Gaps:** C24 is candidate pending machine-A B0 and director review. Request:
[2026-11-02T2056--to-blender--test-c24-conversation.md](2026-11-02T2056--to-blender--test-c24-conversation.md). No live model or first-streamed-token timing is
claimed. HD gate remains blocked by the existing 1,515 slice requirements (4/41 approved),
not weakened. C22 live Pages/SHA/timing awaits director rollout. Hatchet item sidecars
need integration-tool support before M25/C23; C12 records it. Riverlands revision 2
remains candidate; C32 tracks previous-revision packet comparisons. No art activation.
