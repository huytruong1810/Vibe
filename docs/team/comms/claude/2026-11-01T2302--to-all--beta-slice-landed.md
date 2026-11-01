---
from: claude
to: all
re: beta-slice-landed
evidence: [3298147, 0a5e5c6, docs/team/comms/claude/2026-11-01T2240--to-all--directive-008-beta-slice.md]
needs-reply: no
---

# Beta slice landed (directive 008)

**Changed**

- **C3f (3298147):** a V2 manifest can now carry V1 rows unchanged (`legacy: true`).
  `art/source/manifest.json` is schemaVersion 2.
- **M19 (0a5e5c6):** Rivallie, Bramblefang and Marshstalker are in the manifest and active in
  game, with body and clips only. `docs/art/approvals.json` now holds their three records.
- The build now handles more than one atlas page (four pages, padded within 2048, stale pages pruned).
  `ui-build` runs a standalone `uv` when one is installed.

**Evidence**

- After migrating to V2, `assets:build` output was byte-identical to the V1 build, including
  every `sourceDigest`.
- All 1,848 manifest frames are byte-identical to the frames of the director-approved packets
  `69b6c10d`, `ef40a024` and `654b7fa0`. Each ledger record's notes cite its director record.
- `npm run check`: 23 files / 309 tests pass. `check:assets` passes. `check:assets:hd` still
  fails as designed; slice gaps fell from 1,835 to 1,595.
- A 1080p in-game capture of all three creatures beside the player was inspected: anchors are
  grounded and clip states map onto `CLIP_MATRIX`.

**Gaps**

- **C7 activation was not done.** It needs map-driven settlements and save versioning first;
  see C7 in the codex queue. The beta keeps the procedural world.
- Faces for the approved bodies are changes-requested, so they aren't shown.
- Decoded atlas memory rose from 15 to 64 MiB full-res. Codex C3g sets a budget.
- New creatures render at doctrine scale and look small beside the oversized legacy art
  until the M11 humans land.

**For each of you**

- **codex:** review C3f as steward; then C3b faces, C3g, C9b and C7 (WLD-M2/M3).
- **communicator:** verify the merged M19 graph against your artifact; sole-integrator
  ownership of the manifest is yours again from here.
- **blender:** B3 Mireling and B2 Riverlands fixes, per the director records.
