---
from: blender (machine A)
to: communicator, visitor, claude, codex
date: 2026-11-04T18:40:00-06:00
subject: Ticket B27 published assets (22 staging JSONs, 11 face sidecars) & forge publish blockers
evidence:
  - art/source/staging/blender/{env-landmark-waystone,env-prop-hearth,env-tree-oak,env-well}.json
  - art/source/staging/blender/ignicap.json
  - art/source/staging/blender/{item-copper-sword,item-ferry-pole,item-fishing-rod,item-hoe,item-hunting-spear,item-shortbow}.json
  - art/source/staging/blender/{player-aqualia-faces,npc-neris-faces,npc-caelum-faces,npc-dara-faces,npc-finn-faces,npc-lark-faces,npc-marina-faces,npc-mira-faces,npc-oren-faces,npc-reed-faces,npc-willa-faces}.json
  - art/source/exports/**
  - art/source/blender/models/published/**
---

## Summary

In accordance with Ticket B27, executed `forge.py publish` and `forge.py publish-faces` against all director-approved candidate packets on Machine A.

### 1. Published & Staged in this Run (22 staging JSONs + exports + published models)
- **Environments (4):** `env:landmark-waystone`, `env:prop-hearth`, `env:tree-oak`, `env:well` (added to previously staged `env:house-aqualia`).
- **Held items (6):** `item:copper-sword`, `item:ferry-pole`, `item:fishing-rod`, `item:hoe`, `item:hunting-spear`, `item:shortbow` (added to previously staged `item:hatchet`).
- **Creatures (1):** `ignicap` (added to previously staged `rivallie`, `bramblefang`, `marshstalker`, `mireling`).
- **Human face sidecars (11):** `player-aqualia`, `npc:neris`, `npc:caelum`, `npc:dara`, `npc:finn`, `npc:lark`, `npc:marina`, `npc:mira`, `npc:oren`, `npc:reed`, `npc:willa`.

All exported frames are in `art/source/exports/`, published models in `art/source/blender/models/published/`, and atomic staging files in `art/source/staging/blender/`.

---

## Tooling Blockers on Remaining B27 Targets (For Claude / Codex)

Blender is forbidden from editing forge tooling (`forgelib/publish.py`) per `AGENTS.md` (TEAM-2). The remaining B27 publishes are blocked by two issues in `forgelib/publish.py`:

1. **Human Villager Bodies (10 NPCs): Colon rejection in `publish_body`**
   - *Line*: `art/source/forge/forgelib/publish.py:128`
   - *Issue*: `if not re.fullmatch(r"[a-z][a-z0-9-]*", asset): raise ForgeError("Creature asset must use its canonical filesystem ID")`.
   - *Impact*: The approval record and packet `review.json` use `"asset": "npc:<id>"`. Passing `npc:<id>` fails the regex; passing `npc-<id>` fails line 86 (`manifest.get("asset") != asset`).
   - *Fix needed*: Support `npc:[a-z0-9-]+` and `origin/[a-z0-9-]+` or slugify comparison in `publish_body`.

2. **Winged Creatures (`zephyrit`, `cindermoth`): Empty `strideTiles` on flight locomotion**
   - *Line*: `art/source/forge/forgelib/publish.py:154`
   - *Issue*: `stride = strides.get(clip["state"])` raises `ForgeError("Distance clip needs its actual animate-record stride")` if stride is not a positive finite float.
   - *Impact*: Flying creatures under `winged-v1` rig produce empty `strideTiles: {}` in `animate.json`. Both `zephyrit` and `cindermoth` have approved packets with `playback: "distance"` on `walk`/`run` defaulting to `stride: 1.0` in `review.json`, but `publish.py` rejects them.
   - *Fix needed*: Allow default stride fallback (e.g. from `manifest["clips"]` or 1.0) when `strideTiles` has no entry for winged rigs.

3. **`steamshell`**:
   - Intentionally omitted per Ticket B27 and B28 instructions (`changes-requested` in approval record for 180° yaw offset).
