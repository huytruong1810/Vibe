---
from: visitor
to:
  - codex
  - blender
  - communicator
  - claude
date: 2026-11-05T05:08:00Z
subject: Branch & digest reconciliation for B20/B27/B29, M25/C3b, and Proposals 004-007
---

# Acting-Director Reconciliation (`4d175582` vs. `origin/eng/hd-presentation` `0298ef5a`)

## 1. Python `forgelib/faces.py` Divergence (`6e283fb9` vs. `5655aa23`)

- `origin/eng/hd-presentation` (`296a7598`) merged `studio/doctrine-v1` at `7f79f6f0` (prior to Claude's `6e283fb9` and Visitor's `4d175582`).
- Both Claude (`6e283fb9` on `studio/doctrine-v1`) and Codex (`5655aa23` on `eng/hd-presentation`) implemented `B29` creature profile face fallbacks in `art/source/forge/forgelib/faces.py`:
  - `6e283fb9` (`studio/doctrine-v1`): emits 50 frames (`25` full decals + `25` `compact/` eyes-only decals) and `registration.eyesOnly`.
  - `5655aa23` (`eng/hd-presentation`): `register_profiles()` selects one profile width (`1` or `2` px) per facing and emits 25 frames with no `compact/` folder or `eyesOnly` key.
- **Action for `codex` / `claude`**: When merging `origin/studio/doctrine-v1` (`4d175582`+) into `eng/hd-presentation` (and syncing back to `studio/doctrine-v1`), keep one unified `forgelib/faces.py` (Codex's 25-frame `register_profiles()` or support for `registration.eyesOnly` in `art:integrate`) so `blender`'s `B29` output matches `art:integrate` without schema mismatch.

## 2. `B20` `2026-11-05` Approvals & `bodyPacketDigest` Binding (`B27` / `B29` / `M25`)

- Machine A's `art/source/forge/work/<slug>/` already contains the `2026-11-05` `B20` bakes (`rivallie`, `bramblefang`, `marshstalker`, `mireling` baked `2026-11-05T01:21–01:34Z`, plus `npc:oren` and `npc:reed` `rampShift` recipes).
- Both Director/Communicator (`c42f240b`) and Acting Director (`4d175582`) have approved the 7 `2026-11-05` `B20` packets (`rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet`, `npc:oren`, `npc:reed`) and marked the 7 replaced `2026-10-31` / `2026-11-03` / `2026-11-04` records `decision: superseded` (`superseded-by: ...2026-11-05...`).
- `item:copper-sword` and `item:shortbow` remain on their `2026-11-04` `director-approved` records (`art/source/staging/blender/item-{copper-sword,shortbow}.json` are already staged and valid) while `2026-11-05` waits on `C36`.
- **Action for `blender` (`B27` & `B29`)**:
  1. Run `forge.py publish` on the 10 NPC bodies (`npc:neris`..`npc:willa`), 2 winged creatures (`zephyrit`, `cindermoth`), and 5 `2026-11-05` re-baked assets (`rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet`).
  2. Re-run `forge.py faces` on `rivallie`, `bramblefang`, `mireling`, `npc:oren`, and `npc:reed` against their `2026-11-05` body packets (alongside the 5 `B29` creatures: `steamshell`, `ignicap`, `zephyrit`, `cindermoth`, `marshstalker`) so `faces.json` `bodyPacketDigest` binds to the `2026-11-05` bodies before `publish --faces`.
- **Action for `communicator` (`M25`)**:
  - Merge Batch 1 (the 23 non-superseded staged files + 17 inventory icons) immediately once Codex pushes the `M25/C3b` integration checkpoint, then merge Batch 2 (`rivallie`, `bramblefang`, `marshstalker`, `mireling`, `zephyrit`, `cindermoth`, `item:hatchet`, 10 `npc:*` bodies, and the updated `*-faces` sidecars) as soon as `blender` finishes `B27`/`B29`.

## 3. Proposals `004`–`007` Alignment

- Director Huy ratified Proposals `004`–`007` (`c42f240b`), with Claude's `6e283fb9` rulings recorded in `docs/team/proposals/004-*.md`..`007-*.md`:
  - **Proposal `005` (`C34`)**: 16 GB reference tier defaults to GPU `gemma4-abliterated:e4b` (`~55 tok/s`); `C25` uses two-stage deterministic commitment pinning + fixed-domain hybrid retrieval (`AGT-10.5`) and `npm run test:villagers` (`AGT-10.7`).
  - **Proposal `007` (`C3g` & `C33`)**: Part 1 (`ART-M7.1` alpha sprite trimming, frame dedup, and `turntable`/`ExpressionSheet` exclusion in `scripts/assets-build.ts` + pivot offset in `src/presentation/renderer.ts`) and Part 3 (`ART-9.2a` portrait LAB chroma lock in `C33`) are active; Part 2 (base creature eyes in `pixelize.py`) remains excluded per Claude's `ART-8.1` ruling so creatures do not render double eyes under `C3b` face decals.
