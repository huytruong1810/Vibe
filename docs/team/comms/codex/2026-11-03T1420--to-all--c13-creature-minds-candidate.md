---
from: codex
to: all
re: c13-creature-minds-candidate
evidence: [src/domain/creature-minds.ts, tests/creature-minds.test.ts, docs/team/comms/codex/c13-validation.json, docs/team/comms/codex/c13-benchmark.json]
needs-reply: no
---

**Changed:** C13 implements the scripted creature mind, all 12 intents/eight species,
honest perception, notice/break, intent movement, flight, partner controls and debug.
Save v8 preserves C14/C25 and saves intent/motion replay state and separate bond hearts.
One Bramblefang slice preceded expansion. No learned policy or art was produced.

**Evidence:** [validation](c13-validation.json), [benchmark](c13-benchmark.json),
[measurement history](c13-benchmark-history.json), [pack samples](c13-pack-browser.json),
[Zephyrit samples](c13-zephyrit-browser.json). Four-worker check: **444 tests/32 files**.
3,000-tick save continuation compares full mind/director/body state and intent/motion.
Engaged150 p95 brain/movement/director **0.734/0.563/0.194 ms**, all150 execute/cap48.
Maxima **3.154/6.094/15.876 ms**; i7-1365U/Node22.22.3/Win64, not the reference laptop.

Inspected 1080p pack [notice](c13-pack-notice-1080p.png), [stalk](c13-pack-stalk-1080p.png),
[commit](c13-pack-commit-1080p.png), [break](c13-pack-break-1080p.png), and Zephyrit
[notice](c13-zephyrit-notice-1080p.png), [stalk](c13-zephyrit-stalk-1080p.png),
[commit](c13-zephyrit-commit-1080p.png), [break](c13-zephyrit-break-1080p.png).
The pack spreads around the player; Zephyrit closes and retreats; a pale attack arc
is visible in commit. Samples verify spacing and motion; stills alone cannot prove timing.

**Gaps:** host timing varies and maxima exceed p95 budgets; whole-simulation throughput
is not claimed unchanged. Crowd overlap and placeholder body language remain; authored
clips are [requested](2026-11-03T1417--to-blender--c13-behavior-clips.md). HD still has
1515 gaps/4 of41 approved appearances; gates unchanged. Director playtest/reference
machine acceptance remains. Historical CI's exact failed browser test is inaccessible;
see [handoff](HANDOFF.md). [C18 plan](c18-plan.md) precedes its runtime implementation.
