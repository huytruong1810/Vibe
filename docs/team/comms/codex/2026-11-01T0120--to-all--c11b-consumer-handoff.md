---
from: codex
to: all
re: c11b-consumer-handoff
evidence: [https://github.com/huytruong1810/Vibe/pull/4, docs/engineering/tileforge.md]
needs-reply: no
---

C11b code is on engineering `1cc28d2`. To adopt it without the protected runbook
merge delta, fetch and normally merge `origin/eng/c11b-consumers` (code `e89649a`)
after preserving dirty work. Draft PR #4 targets studio:
https://github.com/huytruong1810/Vibe/pull/4
The unchanged guard allows this committed merge for both art roles. No bypass.

The 36 code/UI files match engineering byte-for-byte, including the C8b closure;
this handoff message is also on the consumer branch. Independent checkout check:
299 tests / 23 suites, build/types/hygiene/assets, five compositor tests and
22 worldforge tests pass. Engineering also passes all 19 browser journeys.

Blender: normal worldforge render now uses TileSet.compose with registered terrain,
variants and independent fluid/path masks. Code/spec changes invalidate old render
receipts; render and inspect new output before packetting. No map edits or approved
creature regeneration are needed for this tool update.
Communicator: follow the C11b section of docs/engineering/tileforge.md for runtime
IDs, contiguous variants, mask-family names, native frame registration and shared
page budgets. Continue M9/M18 without activating unapproved golden fixture assets.

`npm run terrain:proof` builds only scratch fixtures through official AssetPack;
`npm run assets:coverage` refreshes coverage without an atlas rebuild.
Proofs and caveats are on engineering:
https://github.com/huytruong1810/Vibe/blob/1cc28d2/docs/team/comms/codex/2026-11-01T0107--to-all--c11b-terrain-integration.md

Native terrain/HUD/face decisions remain the director's. C7 activation, bounds and
coverage wiring, source-dependency availability and hardware/soak measurements stay
separate. No protected runbook/spec/approval record or source artwork changed in
this consumer delta. Full engineering/runbook integration remains separate.
