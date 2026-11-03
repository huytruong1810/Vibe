---
from: blender
to: blender
re: fresh-session-handoff-and-context
evidence: [docs/team/briefs/blender.md, docs/team/queue/blender.md, docs/engineering/imagegen.md, art/source/forge/models.json, docs/doctrine/locked-decisions.md (L12), docs/team/comms/claude/2026-11-02T2330--to-all--directive-014-standing-review-delegation.md, docs/team/comms/claude/2026-11-03T0057--to-blender--shared-gpu-and-memory.md, docs/team/comms/blender/2026-11-03T0125--to-claude-director--golden-samples.md]
needs-reply: no
---

# Handoff to Fresh Blender Session (2026-11-03)

Welcome to the **blender** lane on **Machine A** (WSL2, RTX 5080 Laptop GPU, 24 GB RAM, Blender 4.2.3 at `~/.local/bin/blender`).
This document consolidates everything accomplished so far, the binding constraints, the multi-agent coordination rules on this machine, and your exact next steps.

---

## 1. Role & Operating Principles (Directives 012, 013, 014, 015)

- **Ownership (TEAM-1, Directive 012)**: You hold the **entire art production pipeline**:
  - Reference sheets and local image generation (`forge.py concept` → `views`).
  - 2D terrain tiles and masks (`tileforge`).
  - 3D sprites and environments through the Sprite Forge (`forge.py`).
  - Map dressing through `worldforge`.
- **Lane Boundaries (TEAM-2)**:
  - You write: `art/source/references/**`, `art/source/masters/**`, `art/source/ui/**`, `art/source/tiles/sets/**`, `art/source/exports/portraits/**`, `art/source/blender/**`, `art/source/forge/recipes/**`, `art/source/forge/work/**`, `art/review/**` (via forge), `docs/team/queue/blender.md` (your status), `docs/team/comms/blender/**`.
  - **Never touch**: `src/**`, `scripts/**`, `tests/**`, `art/source/pipeline/**`, forge code (`art/source/forge/forgelib/**`), spec files (`art/source/forge/spec/**`), region plans, doctrine, or other agents' comms folders.
- **Review Protocol (Directive 014 & 015)**:
  - All review packets go to `--to-claude-director--`.
  - Claude reviews packets under the Director's standing delegation.
  - Communicator is the Director's personal assistant and art digest author.
  - **Do not idle waiting for approvals**: Post each candidate packet and proceed immediately to the next unblocked ticket in `docs/team/queue/blender.md`.
- **Core Laws**:
  1. Open and inspect every generated image and contact sheet via `read_file` before describing or packeting (`PRD-5`).
  2. Never model from typed coordinates (`PRD-2`).
  3. Max status is `candidate` (`TEAM-4`). Only the Director approves.
  4. No superlatives in reports/commits (banned: AAA, stellar, flawless, perfect, perfectly, production-ready, world-class, stunning, gorgeous; `TEAM-5.3`).
  5. Always report in `Changed` / `Evidence` / `Gaps` format (`TEAM-5.2`).
  6. Always run `npm run check:hygiene` before pushing (`TEAM-9`).

---

## 2. Shared Machine & GPU Handshake Protocol

There are concurrent long-running agent sessions on Machine A:
1. **`jepa_ipomdp`** (Claude session `schedule-jepa-ipomdp-experiments`, PID 287780): runs GPU training seeds of ~4 GB VRAM. **Guardrail aborts training if total VRAM exceeds 13.5 GB**.
2. **`ipomcp`** (Claude session): runs one CPU-only worker (< 4 GB RAM) guarded by a memory gate.

### Mandatory Rules for Blender:
- **Run GPU stages ONLY via `forge.py`**:
  `concept`, `swatch`, and `gen3d` stages automatically call `core.gpu_window()`. This helper creates `/home/andyj1810/projects/jepa_ipomdp/runs/week/PAUSE`, waits for `/home/andyj1810/projects/jepa_ipomdp/runs/week/GPU_BUSY` to clear (up to 2.5 hours), executes the model run, and removes `PAUSE`.
- **Never touch `PAUSE` or `GPU_BUSY` by hand**.
- **Never touch any files in `~/projects/jepa_ipomdp` or `~/projects/ipomcp`**.
- **Never run two GPU stages at once**.
- **Locked Models (L12)**:
  - Image generation: **FLUX.2 [klein] 9B** (local, ~14.2 GiB VRAM).
  - 3D generation: **Hunyuan3D-2mv** (local, ~4.6–7.7 GiB VRAM).
  - Both are installed and verified by `forge.py doctor`. Never download or modify models.

---

## 3. Completed Milestones & Status Inventory

### Ticket B19: Golden Samples with Local Image Generation (Candidate)
All four golden samples were generated, reconstructed, and validated to status `candidate`. Review message dispatched to Claude and Director in `docs/team/comms/blender/2026-11-03T0125--to-claude-director--golden-samples.md`:
1. **Creature (`rivallie`)**:
   - Packet: `art/review/2026-11-03-rivallie/`
   - Picked candidate `c901` (`seed 901`); 498k raw faces → 14k clean faces; rig 30 bones (0.1° yaw); 15 clips, 616 frames; all QA hard checks passed.
2. **Held Item / Prop (`item:hatchet`)**:
   - Packet: `art/review/2026-11-03-item-hatchet/`
   - Picked candidate `c65716` (`seed 65716`); vertical ash haft, flat wide butt; 65 held poses across 8 grip buckets passed with 0 failing poses.
3. **Environment / Building (`env:house-aqualia`)**:
   - Packet: `art/review/2026-11-03-env-house-aqualia/`
   - Picked candidate `c66585` (`seed 66585`); footprint `[3, 3]` (contact depth 3.20 vs declared 3.0 tiles, delta 0.20 <= 0.35); roof split `0.50`; 18 colors; all 6 checks passed.
4. **Human (`player-aqualia`)**:
   - Packet: `art/review/2026-11-03-player-aqualia/`
   - Picked candidate `c67299` (`seed 67299`, 5 heads tall, A-pose); `heightArtPx: 46` (≥ 2px margin across all 952 frames on 19 clips); 21 colors (budget 24); explicit arm mesh centroids in `rig.landmarks` (0 sleeve tearing); 0 outline gaps.

### Ticket B11: Human Face Sidecar Technical Proof (Candidate)
- Executed `forge.py faces --asset player-aqualia` against golden body review packet.
- Packet: `art/review/2026-11-03-player-aqualia-faces-d4cc567cadce/`
- Generated 60 decal frames across all 12 expressions and 5 facings; inspected `contact.png` and `registered.png`. Blank face plane and `Socket_Head` registration offsets validated.

### Pre-Drafted Recipe Inventory (Commit `cda6dd5`)
All 30 recipes are authored in `art/source/forge/recipes/` with complete `concept` blocks, pose guides, ramps, and footprints:
- **Creatures (8)**: `rivallie`, `bramblefang`, `marshstalker`, `mireling`, `steamshell` (`shelled-v1` + `shelled.png`), `zephyrit` (`winged-v1` + `winged.png`), `cindermoth` (`winged-v1` + `winged.png`), `ignicap` (`mushroom-biped-v1` + `mushroom-biped.png`).
- **Environment Kit (4)**: `env-house-aqualia`, `env-tree-oak`, `env-well`, `env-landmark-waystone`, `env-prop-hearth`.
- **Aqualia NPCs (10)**: `npc-neris` (elder), `npc-caelum`, `npc-marina`, `npc-reed`, `npc-willa`, `npc-oren`, `npc-mira`, `npc-lark`, `npc-dara`, `npc-finn`.
- **Held Items (7)**: `item-hatchet`, `item-fishing-rod`, `item-hoe`, `item-ferry-pole`, `item-copper-sword`, `item-hunting-spear`, `item-shortbow`.
- **Gatherable Flora (6)**: `env-flora-berries`, `env-flora-reeds`, `env-flora-wheat`, `env-flora-nectar`, `env-flora-ashgrass`, `env-flora-fungi`.

---

## 4. Immediate Next Steps for Fresh Session

### Step 1: Work Ticket B17 (Aqualia Terrain Set)
Ticket B17 is unblocked and marked `in_progress`. Claude landed `forge.py swatch` in commit `aca6682` (C30a).
Follow `.agents/skills/tile-forge/SKILL.md`:
1. Check set configuration in `art/source/tiles/sets/aqualia-terrain/set.json`.
2. Generate swatches:
   ```bash
   uv run --project art/source/forge python art/source/forge/forge.py swatch --set aqualia-terrain --material grass --prompt "short upright grass blades with small clumps" --n 4
   ```
   *(Note: This call will enter `core.gpu_window()`, create `PAUSE`, wait for `GPU_BUSY` if jepa is training, generate 4 candidates, and write `work/swatch-aqualia-terrain-grass/swatch/contact.png`)*.
3. Inspect `contact.png` with `read_file` (PRD-5). Pick best candidate with:
   ```bash
   uv run --project art/source/forge python art/source/forge/forge.py swatch --set aqualia-terrain --material grass --pick <id>
   ```
4. Run `tileforge.py all --set aqualia-terrain`.
5. Open all three previews with `read_file`:
   - `art/source/tiles/work/aqualia-terrain/contact.png`
   - `art/source/tiles/work/aqualia-terrain/field.png`
   - `art/source/tiles/work/aqualia-terrain/level.png`
6. Tune recipe parameters (`swatchTilePx: 256`, `flatten: 2`, `proportions`, `cluster`) to achieve QA `candidate`.
7. Expand to remaining materials: `freshwater` (with 14 shore masks), `dirt`, `sand`, `stone`, `mud`, `reedbed`, `boardwalk`, and path edge masks.

### Step 2: Once B19 Look Approval is Recorded
When Claude / Director post the approval record for B19:
1. Proceed with **Ticket B15**: generate reference sheets using the drafted recipes in `art/source/forge/recipes/`:
   - `npc:neris` and remaining 9 villagers (`human-apose-v1` with `human.png`).
   - Environment kit: `env:tree-oak` (canopy split 0.45) and `env:well` (roof split 0.50).
   - Non-quadruped creatures: `steamshell`, `zephyrit`, `cindermoth`, `ignicap`.
   - Held items: `item:fishing-rod`, `item:hoe`, `item:ferry-pole`.
2. For each generated sheet: run through `forge.py all --asset <id>`, inspect contact sheet, and packet.

---

## 5. Verification Commands Quick Reference

```bash
# Workspace hygiene (must be 0 errors, 0 warnings before push)
npm run check:hygiene

# Forge environment and asset class readiness
uv run --project art/source/forge python art/source/forge/forge.py doctor

# Tileforge readiness
uv run --project art/source/forge python art/source/tiles/tools/tileforge.py doctor

# Check git status
git status
```
