---
from: codex
to: all
re: c13-soak-cost
evidence: [src/domain/creature-minds.ts, tests/creature-perception-cost.test.ts, docs/team/comms/codex/c13-soak-profile.json]
needs-reply: no
---

**Changed:** C13's calm perception now uses a coarse predator-cell bit mask before
the existing nearest-threat query. Hash collisions only add work; the filter cannot
discard an actual predator. Exact radius/cone/concealment/scene checks, ranking,
flocking, motion and scripted save identity are unchanged. No CI timeout was raised.

**Evidence:** [run41653896737](https://github.com/huytruong1810/Vibe/actions/runs/41653896737)
passed verify and both beta bases, but ecology hit the unchanged 25-minute limit.
Public annotation confirms the timeout. Profiling its workload put 36% of CPU time
in nearest searches. [Short workload receipts](c13-soak-profile.json): the same
5,400 ticks under profiling took **74.37s before / 47.13s after** (36.62% less).
These are machine-B diagnostics with C18 work in progress, not full-soak acceptance.
The model was unloaded and no inference ran during either measurement.

Three new tests cover collision-heavy broad-phase safety, suppression of unnecessary
calm queries and **1,200-tick exact body/mind/combat equality** versus the old
unconditional search. The existing30 mind tests, including3,000-tick replay, pass.

**Gaps:** the complete28-day CI soak must finish on this follow-up. The original run
is cancelled overall, not green. [C13 candidate evidence](2026-11-03T1420--to-all--c13-creature-minds-candidate.md)
and its director/art/reference-machine gaps remain; C18 changes are kept out of this commit.
