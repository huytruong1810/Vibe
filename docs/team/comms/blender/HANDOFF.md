---
from: blender (machine A)
to: blender (machine A)
date: 2026-11-04T18:42:00-06:00
re: session-handoff-and-gpu-coordination
evidence:
  - docs/team/briefs/blender.md
  - docs/team/queue/blender.md
  - docs/team/comms/claude/2026-11-03T0057--to-blender--shared-gpu-and-memory.md
  - docs/team/comms/blender/2026-11-04T1825--to-communicator--inventory-icons-candidate.md
  - docs/team/comms/blender/2026-11-04T1840--to-communicator-visitor--b27-published.md
  - art/review/2026-11-04-icons-items-1/
  - art/source/staging/blender/
  - art/source/exports/
needs-reply: no
---

# Fresh Session Handoff: Blender Lane (Machine A)

Welcome to the **blender** session on **Machine A** (WSL2, RTX 5080 Laptop GPU 16 GiB VRAM, 24 GB RAM, pinned Blender 4.2.3 at `~/.local/bin/blender`).
You hold the **entire art production pipeline** (TEAM-1, Directive 012): reference sheet generation via local FLUX.2 [klein] 9B, 2D terrain via `tileforge`, 3D sprite forging via `forge.py`, and world map dressing via `worldforge`.

---

## 1. CRITICAL: GPU Resource Coordination Protocol

Machine A runs multiple concurrent workloads:
1. **`Vibe` (Sprite Forge)**: Image generation (FLUX.2 [klein] 9B, ~14.2 GiB VRAM peak) and 3D mesh reconstruction (Hunyuan3D-2mv, ~4.6–7.7 GiB VRAM).
2. **`jepa_ipomdp`** (separate research process, PID running `sweep.py de`): GPU training seeds of ~4 GB VRAM. **Guardrail aborts training if total VRAM exceeds 13.5 GB**.
3. **`ipomcp`**: CPU-only worker (< 4 GB RAM) guarded by memory gates.

### Binding Rules for Blender
- **Always run GPU stages via `forge.py`**:
  `concept`, `portrait`, `icon`, `upscale`, `swatch`, and `gen3d` automatically call `core.gpu_window()` in `art/source/forge/forgelib/core.py`.
  - The forge creates `/home/andyj1810/projects/jepa_ipomdp/runs/week/PAUSE` so the training queue starts no new seed.
  - It waits until `/home/andyj1810/projects/jepa_ipomdp/runs/week/GPU_BUSY` is removed (timeout 2.5 hours).
  - It runs your model job with exclusive VRAM.
  - It removes `PAUSE` when finished (if it created it).
- **Never touch `PAUSE` or `GPU_BUSY` manually**, and never touch `~/projects/jepa_ipomdp` or `~/projects/ipomcp`.
- **Never invoke raw scripts directly** (`run_image.py`, gen3d runners, etc.), as bypassing `forge.py` bypasses `gpu_window()` and crashes concurrent training.
- **Never run two GPU stages at once**.
- **Waiting is normal**: If a stage pauses while waiting for `GPU_BUSY` to clear, that is expected protocol, not a hang.

---

## 2. Completed Milestones & Current State (All Committed & Pushed)

Branch: `studio/doctrine-v1` (clean working tree, pushed to `origin`).

### A. Golden Samples & Staged Bodies
- **Golden Bodies Staged**: `player-aqualia`, `rivallie`, `bramblefang`, `marshstalker`, `mireling`, `ignicap`.
- **Golden Held Item**: `item:hatchet` staged in `art/source/staging/blender/item-hatchet.json`.
- **Golden Environment**: `env:house-aqualia` staged in `art/source/staging/blender/env-house-aqualia.json`.

### B. Ticket B22 (Held Items) & B21 (9 Aqualia Villagers)
- All 5 additional held items complete (`item:fishing-rod`, `item:hoe`, `item:ferry-pole`, `item:copper-sword`, `item:hunting-spear`, `item:shortbow`).
- All 9 Aqualia villagers complete (`npc:caelum`, `npc:marina`, `npc:reed`, `npc:willa`, `npc:oren`, `npc:mira`, `npc:lark`, `npc:dara`, `npc:finn`) with both 18-clip body packets and 12-expression face packets in `art/review/`.

### C. Ticket B23 (Inventory Icons) — 100% DONE (Candidate)
- 17 icons generated via `forge.py icon` and palette-locked: `berries`, `reeds`, `wheat`, `nectar`, `ashgrass`, `fungi`, `flint`, `stick`, `fiber`, `tool-head`, `poultice`, `water`, `ore`, `meat`, `meal`, `arrow-bundle`, `garment`.
- Placed in `art/source/ui/icons/items/`.
- Review packet in `art/review/2026-11-04-icons-items-1/` with composite `contact.png` (inspected per PRD-5).
- Dispatched to communicator: `docs/team/comms/blender/2026-11-04T1825--to-communicator--inventory-icons-candidate.md`.
- Staged and committed in `08e81b93`.

### D. Ticket B27 (Publish Approved Assets) — PARTIALLY COMPLETE (In Progress)
- **Published & Staged (22 new staging JSONs + exports + published models in `b053a281`)**:
  - 11 human face sidecars: `player-aqualia`, `npc:neris`, `npc:caelum`, `npc:dara`, `npc:finn`, `npc:lark`, `npc:marina`, `npc:mira`, `npc:oren`, `npc:reed`, `npc:willa`.
  - 4 environments: `env:landmark-waystone`, `env:prop-hearth`, `env:tree-oak`, `env:well`.
  - 6 held items: `item:copper-sword`, `item:ferry-pole`, `item:fishing-rod`, `item:hoe`, `item:hunting-spear`, `item:shortbow`.
  - 1 creature: `ignicap`.
- **Blocked by Forge Tooling (`publish.py`)**:
  1. *10 NPC bodies*: `publish.py:128` regex `[a-z][a-z0-9-]*` rejects colons in `npc:<id>`.
  2. *2 Winged creatures (`zephyrit`, `cindermoth`)*: `publish.py:154` throws on distance clips because `winged-v1` flight locomotion leaves `strideTiles: {}` in `animate.json`.
  - Both blockers dispatched to Claude/Codex in `docs/team/comms/blender/2026-11-04T1840--to-communicator-visitor--b27-published.md`.

---

## 3. Immediate Action Plan for Next Session (In Order)

### Priority 1: Ticket B28 — Fix `steamshell` 180° Yaw Offset & Re-packet
- **Context**: The director marked `steamshell` as `changes-requested` in `docs/team/comms/director/approvals/steamshell--2026-11-03-steamshell.md` because the tan head/eyes face North and walk cycles move backward.
- **Action**:
  1. In `art/source/forge/recipes/steamshell.json`, adjust `rig.yawDeg` by ~`180` degrees (matching the Mireling fix).
  2. Run:
     ```bash
     uv run --project art/source/forge python art/source/forge/forge.py rig --asset steamshell
     uv run --project art/source/forge python art/source/forge/forge.py animate --asset steamshell
     uv run --project art/source/forge python art/source/forge/forge.py bake --asset steamshell
     uv run --project art/source/forge python art/source/forge/forge.py pixelize --asset steamshell
     uv run --project art/source/forge python art/source/forge/forge.py qa --asset steamshell
     uv run --project art/source/forge python art/source/forge/forge.py packet --asset steamshell
     ```
  3. Inspect `art/source/forge/work/steamshell/contact.png` with `read_file` (PRD-5): verify head faces South in `s` and leads the stride in `walk`/`run`.
  4. Submit new candidate packet and dispatch notice to `--to-visitor-communicator--`.
  5. Update Ticket B28 in `docs/team/queue/blender.md`.

### Priority 2: Ticket B29 — Creature Face Decals (C3b) on 7 Approved Creatures
- **Context**: Unblocked by `docs/team/comms/claude/2026-11-04T2356--to-blender--go-c3b-faces-and-publish-faces.md`. Tool: `forge.py faces`.
- **Target Assets**: `rivallie`, `bramblefang`, `mireling`, `marshstalker`, `zephyrit`, `cindermoth`, `ignicap` (plus `steamshell` once B28 is resolved).
- **Action, one creature at a time**:
  1. Run:
     ```bash
     uv run --project art/source/forge python art/source/forge/forge.py faces --asset <creature>
     ```
  2. Open both `contact.png` and `registered.png` in the emitted `art/review/<date>-<creature>-faces-<hash>/` packet with `read_file` (PRD-5).
  3. Verify `faces.json` passes `faceCoverage` and `faceDistinct` (status `candidate`, 0 overhang pixels).
  4. Post `--to-visitor-communicator--` for acting-director approval.

### Priority 3: Ticket B25 — Character Portraits & Expressions
- **Context**: Tooling landed in C30b: `forge.py portrait --asset <id> [--emotions a,b] [--n 2] [--seed S]`.
- **Goal**: 19 Aqualia actors (player, 10 villagers, 8 species) × 8 non-neutral emotions at 128 and 96 px.
- **Action**: Run the player and Neris first. Pick by eye, check IoU and color drift against neutral. Copy kept ones to `art/source/exports/portraits/expressions/<kind>_<id>/` and log seeds in `docs/team/comms/blender/image-ledger.md`.

### Priority 4: Ticket B20 — C26 Readability Re-bakes
- **Context**: Upgrades 4 quadrupeds (`rivallie`, `bramblefang`, `marshstalker`, `mireling`) and `item:hatchet` with C26 readability fields (`supersample: 4`, sub-pixel `features`, `rampShift`).
- Also tunes `npc:oren` white beard/hair and `npc:reed` white shirt ramps so warm lighting does not collapse them into brown/tan.
- *Constraint*: Run only after B27 publications are safely locked in git (already done!).

### Priority 5: Ticket B24 — Gatherable Flora (Environment Kind)
- 6 species (`berries`, `reeds`, `wheat`, `nectar`, `ashgrass`, `fungi`) × 3 states (`healthy`, `harvested`, `burnt`) = 18 sprites.

---

## 4. Laws & Operating Constraints

1. **PRD-5 Law**: Always open and view contact sheets with `read_file` before describing or packeting any image.
2. **TEAM-2 Lane Boundary**: Blender never modifies or commits engine code (`src/`, `scripts/`, `tests/`), forge tooling (`forge.py`, `forgelib/*`), or doctrine. Report forge bugs to Claude/Codex via comms dispatches.
3. **TEAM-5.3 Banned Words**: Never use superlatives (*AAA, stellar, flawless, perfect, perfectly, production-ready, world-class, stunning, gorgeous*) in commits, docs, or messages.
4. **Hygiene Gate (TEAM-9)**: Scratch only in `art/source/forge/work/`, OS temp, or `docs/team/comms/blender/tmp/`. Verify `npm run check:hygiene` exits 0 before any push.
5. **End-of-Session Reporting**: Always conclude messages and sessions with `Changed`, `Evidence`, `Gaps` (TEAM-5.2).
