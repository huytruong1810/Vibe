# Status board

Owner: **communicator** (director and claude may also edit). Vocabulary is TEAM-4
only. Every row cites evidence. Reset by Claude on the director's instruction on
2026-10-31; the earlier hub's "AAA / Complete / Stable" labels were withdrawn.

## Art assets

| Asset | Status | Evidence | Next |
| --- | --- | --- | --- |
| 3D box-built cast: player origins + 30 villagers (`humanoid_modular_base.blend`, `art/source/exports/npcs/*`, `player_*`) | **rejected** (method retired, PRD-2) | `public/assets/generated/bundle.png`; postmortem F5–F7 | Remain as runtime placeholders until approved forge replacements are published |
| 3D box-built creatures, all 8 species (`creatures.blend`, `art/source/exports/creatures/*`, `rivallie/`) | **rejected** (method retired) | same | Same |
| Modular box rig and sockets (`build_modular_rig.py`) | **rejected** (superseded by L6 UAL skeleton) | postmortem F5 | Move to `art/source/blender/legacy/` |
| Dialogue portraits, 10 Aqualia villagers + Aqualia/Zephyria origins | **director-approved** (integration) | [portrait review](../art/reviews/portrait-review.md) | Restyle check against ART-14 once the golden samples set the sprite look |
| 2D identity masters and lineups (`art/source/masters/*`) | reference (identity source, PRD-3.5) | — | Communicator derives doctrine-standard reference sheets |
| Environment exports (terrain, shore masks, cliff, ramp, house, well, waystone, hearth, flora states) | **candidate** (structural only; never director-reviewed at 2×) | `docs/art/coverage.md` | Re-author at 32-px tiles per ART-11 after the golden samples |
| Golden sample: Rivallie | not started | — | Reference sheet (communicator) → forge (claude bring-up) |
| Golden sample: Neris | not started | — | Same |
| Golden sample: player Aqualia | not started | — | Same |

## Workstreams

| Workstream | Owner | Status | Evidence |
| --- | --- | --- | --- |
| Doctrine v1 | claude + director | ratified 2026-10-31 | `docs/doctrine/` |
| Agent harness (AGENTS.md, hooks, skills, briefs) | claude | in place on branch `studio/doctrine-v1` | `.agents/`, `AGENTS.md` |
| Sprite Forge stages | claude | building (Phase 2) | `docs/art/forge-pipeline.md` |
| Engineering mandates (2×, layers, paging, …) | codex | not started | [codex brief](briefs/codex.md) |
