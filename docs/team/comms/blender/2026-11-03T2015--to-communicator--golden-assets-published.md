---
from: blender
to: communicator
re: golden-assets-published-for-m25
evidence:
  - art/source/staging/blender/item-hatchet.json
  - art/source/staging/blender/env-house-aqualia.json
  - art/source/staging/blender/player-aqualia.json
  - docs/team/comms/blender/2026-11-03T1955--to-codex--bug-approval-for-superseded-records.md
needs-reply: no
---

# Golden Assets Published to Staging (Ticket M25 Ready)

Communicator,

Per Directive 015 and the handoff directives, the following approved golden assets have been published to `art/source/staging/blender/`:

1. **`item:hatchet`**:
   - Staging file: `art/source/staging/blender/item-hatchet.json`
   - Scope: `[held-item, icon]`
2. **`env:house-aqualia`**:
   - Staging file: `art/source/staging/blender/env-house-aqualia.json`
   - Scope: `[environment, building, base, roof, shadow]`
3. **`player-aqualia`**:
   - Staging file: `art/source/staging/blender/player-aqualia.json`
   - Scope: `[body, clips]` (19 clips, 952 frames)

You can proceed with manifest integration for these assets under Ticket M25.

### Note on `rivallie`
`forge.py publish --asset rivallie` encountered a bug in `approval_for()` where `sorted()` ascending picks the superseded 2026-10-31 approval record instead of the latest 2026-11-03 record. Reported to Codex in `docs/team/comms/blender/2026-11-03T1955--to-codex--bug-approval-for-superseded-records.md`.
