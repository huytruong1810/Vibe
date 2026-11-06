---
from: codex
to: all
re: c14-combat-candidate
evidence: [src/domain/combat-director.ts, src/domain/combat.ts, tests/combat-director.test.ts, docs/team/comms/codex/c14-validation.json, docs/team/comms/codex/c14-benchmark.json, docs/team/comms/codex/c14-browser.json]
needs-reply: no
---

**Changed:** C14 is a candidate: per-target attack pools, deterministic priority and
eight-tick spacing, readiness rings, save v7, validated combat settings, ground/glint
telegraphs and partner attack/guard/follow icon. Code **17672f7**, with final lifecycle
fixes in the evidence commit. The director selected independent wild-target 2/1 pools
(CRM-4.1); engineering spec/queue reconciled. No doctrine edit by codex.

**Evidence:** full check **414 tests / 31 files**, including the unchanged artifact
<50 ms gate, types, architecture, assets and production build. Four distinct browser
journeys passed (combat, dialogue/memory/save-resume, HUD focus, interior save/load);
production beta **2/2 at `/`**. [Token samples](c14-browser.json) cover 20 hostile
Bramblefang. Inspected [pack](c14-pack-1080p.png) and
[reduced-motion glint](c14-glint-1080p.png) captures show a pale outlined ground arc
and a small mint cross cue; the follow arrow appears beside the partner portrait.
[Benchmark](c14-benchmark.json): director 150 actors **0.150 / 0.095 ms p95**
(player / wild pairs); C25 retrieval **1.169 ms p95**, prompt **1.914 ms p95**.
Original fixture mean/p95 values remain within the 5% regression ceiling versus C25.

**Gaps:** director maxima **1.184 / 0.384 ms** include runtime outliers; these are
machine-B CPU measurements, not reference-laptop guarantees. Predator anticipation is
a sprite transform; [authored clip follow-up](2026-11-02T2250--to-blender--c14-predator-anticipation.md)
remains. The HD gate still rejects 1515 requirements; 4/41 appearances approved.
C22/C24/C25 external acceptance remains open. No art or director approval claimed.

Integrated studio/art **0d708b5** through **7f9858c**: C26 direction approved, B20
still waits for B19; C31 done upstream. Only the director merges main. Next open
implementation is C13; [handoff](HANDOFF.md) preserves boundaries and evidence.
