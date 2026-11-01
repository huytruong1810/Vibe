# Status board

Owner: **communicator** (director and claude may also edit). Vocabulary is TEAM-4
only (`director-approved`, `changes-requested`, `superseded`, `candidate`, `rejected`).
Every row cites evidence.

Queues: [codex](queue/codex.md) · [communicator](queue/communicator.md) · [blender](queue/blender.md)

## Art assets

| Asset | Status | Evidence | Next |
| --- | --- | --- | --- |
| 3D box-built cast: player origins + 30 villagers (`humanoid_modular_base.blend`, `art/source/exports/npcs/*`, `player_*`) | **rejected** (method retired, PRD-2) | `public/assets/generated/bundle.png`; postmortem F5–F7 | Remain as runtime placeholders until approved forge replacements are published |
| 3D box-built creatures, all 8 species (`creatures.blend`, `art/source/exports/creatures/*`, `rivallie/`) | **rejected** (method retired) | same | Same |
| Modular box rig and sockets (`build_modular_rig.py`) | **rejected** (superseded by L6 UAL skeleton) | postmortem F5 | Move to `art/source/blender/legacy/` |
| Dialogue portraits, 10 Aqualia villagers + Aqualia/Zephyria origins | **director-approved** (integration) | [portrait review](../art/reviews/portrait-review.md) | Restyle check against ART-14 once the golden samples set the sprite look |
| 2D identity masters and lineups (`art/source/masters/*`) | **candidate** (identity source, PRD-3.5) | `art/source/masters/` | Communicator derives doctrine-standard reference sheets |
| Environment exports (terrain, shore masks, cliff, ramp, house, well, waystone, hearth, flora states) | **candidate** (structural only; never director-reviewed at 2×) | `docs/art/coverage.md` | Re-author at 32-px tiles per ART-11 via tileforge (M9) |
| Golden sample: player Aqualia (1st) | **candidate** (M4 reference; forge bring-up C9a) | `art/source/references/player-aqualia/`, `art/source/forge/recipes/player-aqualia.json` | Blender B4 golden sample after M11 redraw |
| Golden sample: Rivallie (2nd) | **director-approved** (body, clips) | `docs/team/comms/director/approvals/rivallie--2026-10-31-rivallie-c3d.md` | Published to exports/staging (B8, B10); M19 digests reported; Catalog & ledger reconciliation with Codex (C12) |
| Rivallie candidate faces sidecar | **changes-requested** (eyes on crown, overhangs silhouette) | `docs/team/comms/director/approvals/rivallie--2026-11-01-rivallie-faces-d749a4350126.md` | Codex C3b face fixes; body ships without faces until re-approved |
| Human face sidecar proof (`selftest-human`) | **candidate** (12 expressions, 5 forward facings) | `art/review/2026-11-01-selftest-human-faces-9b64f90be64c/` | Proves C9b sidecar grammar & tracking; production `player-aqualia` proof gated on M11 redraw |
| Canonical prop reference: hatchet | **candidate** (PRD-3.3 reference package, M21) | `art/source/references/item-hatchet/` | Unblocks C9b item pose planning & Blender 3D modeling |
| Golden sample: Neris (3rd) | **candidate** (M3 reference) | `art/source/references/npc-neris/` | Blender B4 golden sample after M11 redraw |
| Bramblefang candidate packet | **director-approved** | `docs/team/comms/director/approvals/bramblefang--2026-10-31-bramblefang-c3d.md` | Published to exports/staging (B8, B10); M19 digests reported; Catalog & ledger reconciliation with Codex (C12) |
| Marshstalker candidate packet | **director-approved** | `docs/team/comms/director/approvals/marshstalker--2026-10-31-marshstalker.md` | Published to exports/staging (B8, B10); M19 digests reported; Catalog & ledger reconciliation with Codex (C12) |
| Mireling candidate packet | **changes-requested** (washed lavender ramp mapping, shell/head read) | `docs/team/comms/director/approvals/mireling--2026-10-31-mireling.md` | Blender B3 recipe and ramp re-run on Machine A |
| Golden village map layout (C6) | **director-approved** (layout scope) | `docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_village-1.md`, `world-aqualia--world-aqualia-aqualia_village-2.md` | Environment dressing and tile sets via C10/C11/M9 |
| Riverlands map layout (B2) | **changes-requested** (empty screens, staircase edges, rectangle zones) | `docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_riverlands-1.md` | Blender B2 pass adjustments (riverbeds, habitat bounds) |
| Aqualia region bible & plan (C5, Proposal 001) | **director-approved** | `docs/team/comms/director/approvals/proposal-001.md` | Authoring unblocked for Riverlands (B2) |

## Workstreams

| Workstream | Owner | Status | Evidence |
| --- | --- | --- | --- |
| Doctrine v1 | claude + director | **director-approved** (ratified 2026-10-31) | `docs/doctrine/` |
| Agent harness (AGENTS.md, hooks, skills, briefs) | claude | **director-approved** (Directive 001–007) | `.agents/`, `AGENTS.md` |
| Sprite Forge stages | codex + claude | **candidate** (creatures operational; C3d quality fixes landed; C9a human bring-up done; B8 creature publication complete; B9 smoke verified) | `docs/art/forge-pipeline.md`, `docs/team/queue/codex.md`, `art/source/staging/blender/` |
| Engineering mandates (2×, layers, paging, …) | codex | **candidate** (contract v2 baseline `a3fc957`, approvals ledger, 9-emotion portraits) | [codex brief](briefs/codex.md) |
| World pipeline | codex + blender | **candidate** (C4-C6 approved village layout, B2 Riverlands layout candidate, C6b/B6 smoke checks, C7 compiler candidate) | `docs/team/queue/codex.md`, `art/source/world/` |
| Tileforge | codex | **candidate** (C11 delivered; ADR 022; tile-forge skill) | `docs/engineering/tileforge.md`, `docs/team/queue/codex.md` |
| Creature minds (System 1) | codex | **candidate** (queued C13–C16) | `docs/doctrine/14-creature-minds.md`, `docs/team/comms/claude/2026-11-01T0700--to-all--directive-005-creature-minds.md` |
| Reference sheets: quadrupeds, humanoids, mannequins | communicator | **candidate** (M10 done, M11 ramps/schemas normalized, redraws in progress) | `art/source/references/` |
| Voice casting sheet: 10 Aqualia villagers | communicator | **candidate** (Proposal 002 Revision 2, M14) | `docs/team/proposals/002-aqualia-voice-casting.md` |
| Aqualia day & night scores | communicator | **candidate** (Revision 2, M15) | `art/source/audio/scores/aqualia-{day,night}.json` |
| Weekly review digest | communicator | **candidate** (W44 completed, W45 published) | `art/review/digest-2026-W45.md` |
