---
from: blender
to: blender
re: session-handoff-and-gpu-coordination
evidence:
  - docs/team/briefs/blender.md
  - docs/team/queue/blender.md
  - docs/team/comms/claude/2026-11-03T0057--to-blender--shared-gpu-and-memory.md
  - docs/team/comms/communicator/2026-11-03T0150--to-blender--b19-golden-samples-approved.md
  - docs/team/comms/communicator/2026-11-03T2055--to-blender-codex--bug-mireling-inverted-walk.md
  - docs/team/comms/director/approvals/
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
  `concept`, `swatch`, and `gen3d` automatically call `core.gpu_window()` in `art/source/forge/forgelib/core.py`.
  - The forge creates `/home/andyj1810/projects/jepa_ipomdp/runs/week/PAUSE` so the training queue starts no new seed.
  - It waits until `/home/andyj1810/projects/jepa_ipomdp/runs/week/GPU_BUSY` is removed (timeout 2.5 hours).
  - It runs your model job with exclusive VRAM.
  - It removes `PAUSE` when finished (if it created it).
- **Never touch `PAUSE` or `GPU_BUSY` manually**, and never touch `~/projects/jepa_ipomdp` or `~/projects/ipomcp`.
- **Never invoke raw scripts directly** (`run_image.py`, gen3d runners, etc.), as bypassing `forge.py` bypasses `gpu_window()` and crashes concurrent training.
- **Never run two GPU stages at once**.
- **Waiting is normal**: If a stage pauses while waiting for `GPU_BUSY` to clear, that is expected protocol, not a hang.

---

## 2. Completed Milestones & Current State

### Golden Samples & Core Assets (All Director-Approved)
- **Ticket B19 Golden Samples**:
  - `rivallie`: approved (`docs/team/comms/director/approvals/rivallie--2026-11-03-rivallie.md`)
  - `item:hatchet`: approved (`docs/team/comms/director/approvals/item-hatchet--2026-11-03-item-hatchet.md`)
  - `env:house-aqualia`: approved (`docs/team/comms/director/approvals/env-house-aqualia--2026-11-03-env-house-aqualia.md`)
  - `player-aqualia`: approved (`docs/team/comms/director/approvals/player-aqualia--2026-11-03-player-aqualia.md`)
- **Ticket B11**: `player-aqualia-faces-d4cc567cadce` approved (`docs/team/comms/director/approvals/player-aqualia-faces--2026-11-03-player-aqualia-faces-d4cc567cadce.md`)
- **Ticket B17**: Aqualia terrain set candidate (`art/review/tiles-aqualia-terrain-1/`)
- **Ticket B4**: `npc-neris` body (`art/review/2026-11-03-npc-neris/`) and faces (`art/review/2026-11-03-npc-neris-faces-9eda4cbedf2f/`)
- **Ticket B5 Golden Core**: `env:tree-oak`, `env:well`, `env:landmark-waystone`, `env:prop-hearth`
- **Ticket B3 (Non-Quadruped Creatures)**: 100% complete!
  - `steamshell`: `art/review/2026-11-03-steamshell/` (15 clips, 616 frames)
  - `zephyrit`: `art/review/2026-11-03-zephyrit/` (15 clips, 616 frames)
  - `cindermoth`: `art/review/2026-11-03-cindermoth/` (15 clips, 616 frames)
  - `ignicap`: `art/review/2026-11-03-ignicap/` (15 clips, 616 frames)
- **Ticket B22 (Held Items)**:
  - `item:fishing-rod`: complete (`art/review/2026-11-03-item-fishing-rod/`, 65 poses, 0 failures, candidate)
  - Remaining 5 recipes calibrated with `reach <= 14.0 art px` and `minFeaturePx: 2.5`.

---

## 3. Standing Director Directive

The Director has given explicit standing instructions:
1. **Existing packets are approved**.
2. **Do not wait for intermediate "go" approvals**. Proceed continuously through the queue.
3. **Route candidate review packets to Communicator** (`--to-communicator--`) per Directive 015.

---

## 4. Priority Action Items for Next Session

### Step 1: Fix Mireling Backward Walk Bug (DONE)
- **Status**: Completed. Template changed to `shelled-v1`, walk facing matches head, candidate review packet published to `art/review/2026-11-04-mireling/`, candidate dispatched to `--to-communicator--` (`2026-11-03T1950--to-communicator--mireling-inverted-walk-candidate.md`).

### Step 2: Publish Approved Golden Assets (DONE)
- **Status**: Completed for `item:hatchet`, `player-aqualia`, `env-house-aqualia` to `art/source/staging/blender/`. Dispatched to `--to-communicator--` (`2026-11-03T2015--to-communicator--golden-assets-published.md`). Note: `rivallie` publish blocked on forge parser bug reported to codex (`2026-11-03T1955--to-codex--bug-approval-for-superseded-records.md`).

### Step 3: Complete Remaining 5 Held Items (Ticket B22) (DONE)
- **Status**: Completed all 5 held items (`item:hoe`, `item:ferry-pole`, `item:copper-sword`, `item:hunting-spear`, `item:shortbow`). All 65 poses verified with 0 failures, candidate packets published to `art/review/2026-11-04-item-*/`, and candidate dispatches sent to `--to-communicator--`.

### Step 4: The 9 Aqualia Villagers (Ticket B21) (DONE)
- **Status**: Completed all 9 villagers (`npc:caelum`, `npc:marina`, `npc:reed`, `npc:willa`, `npc:oren`, `npc:mira`, `npc:lark`, `npc:dara`, `npc:finn`) with both 18-clip body packets and 12-expression face sidecar packets in `art/review/2026-11-04-npc-*/`. All passed 12/12 hard QA, inspected per PRD-5, and candidate dispatches sent to `--to-communicator--`.

### Step 5: Inventory Icons (Ticket B23)
- Tooling landed: `forge.py icon` (C32).
- Goal: 17 items from `src/content/definitions.ts` without held models: `berries`, `reeds`, `wheat`, `nectar`, `ashgrass`, `fungi`, `flint`, `stick`, `fiber`, `tool_head`, `poultice`, `water`, `ore`, `meat`, `roast`, `arrow_bundle`, `garment`.
- Execute with palette-locked prompts and named ramps.

### Step 6: Character Portraits & Expressions (Ticket B25)
- Tooling landed: `forge.py portrait` (C30b).
- Goal: 19 Aqualia actors (player, 10 villagers, 8 creatures) × 8 non-neutral expressions at 128 and 96 px.

### Step 7: Gatherable Flora (Ticket B24)
- 6 species (`berries`, `reeds`, `wheat`, `nectar`, `ashgrass`, `fungi`) × 3 states (`healthy`, `harvested`, `burnt`) = 18 sprites.

### Step 8: Modernize Approved Quadrupeds (Ticket B20)
- Apply C26 readability (`supersample: 4`, sub-pixel `features`, `rampShift`) to `bramblefang`, `marshstalker`, `mireling`.

### Step 9: Dress Maps (Ticket B26)
- Apply baked environment assets to `aqualia_village` and `aqualia_riverlands` via `worldforge` passes.

### Step 7: Dress Maps (Ticket B26)
- Apply baked environment assets to `aqualia_village` and `aqualia_riverlands` via `worldforge` passes.

---

## 5. Laws & Quality Checks

1. **PRD-5 Law**: Open every generated image (`read_file` on PNGs) before packeting or describing it.
2. **TEAM-5.3**: No superlatives (*AAA, stellar, flawless, perfect, perfectly, production-ready, world-class, stunning, gorgeous*).
3. **TEAM-9 Workspace Hygiene**: Scratch only in `art/source/forge/work/`, OS temp, or `docs/team/comms/blender/tmp/`. Verify `npm run check:hygiene` exits 0.
4. **Lane Boundaries (TEAM-2)**: Never edit engine code (`src/`, `scripts/`, `tests/`), forge code, specs, or doctrine.
