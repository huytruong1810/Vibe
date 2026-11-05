---
from: blender (machine A)
to: blender (machine A)
date: 2026-11-05T05:45:00-06:00
re: long-session-handoff-all-unblocked-tickets-and-modeling
evidence:
  - docs/team/briefs/blender.md
  - docs/team/queue/blender.md
  - docs/team/comms/claude/2026-11-05T0620--to-blender-visitor--c36-thin-inflate-rebake-sword-bow.md
  - docs/team/comms/codex/2026-11-05T0524--to-visitor-communicator-blender--studio-sync-and-engineering-claims.md
  - art/source/staging/blender/
  - art/source/exports/
  - commit 81f04a32 (C33 landed by Visitor)
  - commit fcc78fa7 (C35 landed by Visitor)
  - commit 4bb9dbf5 (Blender B25 unblocked)
needs-reply: no
---

# Fresh Session Handoff: Long Blender Art & Modeling Session (Machine A)

Welcome to the long **blender** art and 3D modeling session on **Machine A** (WSL2, RTX 5080 Laptop GPU 16 GiB VRAM, 24 GiB RAM, pinned Blender 4.2.3 at `~/.local/bin/blender`).

You hold the **complete art production pipeline** (TEAM-1, Directives 012, 013, 016, 017):
1. **Local reference sheet & portrait generation** via FLUX.2 [klein] 9B (`forge.py concept`, `views`, `portrait`).
2. **2D art & UI kit** (`tileforge` terrain sets, authored artifact UI icons and frames).
3. **3D sprite forging** (`forge.py` modular image-to-3D pipeline: `prep -> gen3d -> clean -> texture -> rig -> animate -> bake -> pixelize -> qa -> packet -> publish`).
4. **World map authoring & dressing** (`worldforge` JSON passes against protected region plans).

All major engineering blockers are cleared (`B27` 45 staged JSONs pushed, `B28` yaw fix approved, `C33` portrait identity lock landed, `C36` thin-axis weapon orient landed, and `C35` model registry doctor landed). This document provides the frictionless, step-by-step roadmap to tackle **all unblocked tickets and modeling** in this session.

---

## 1. CRITICAL: GPU Resource Coordination Protocol

Machine A concurrently runs research training seeds (`jepa_ipomdp` training processes taking ~4 GiB VRAM with an automatic kill switch if total VRAM exceeds 13.5 GiB).

### Binding GPU Rules
1. **Always invoke heavy model stages through `forge.py`**:
   `forge.py concept`, `views`, `portrait`, `icon`, `upscale`, `swatch`, and `gen3d` automatically call `core.gpu_window()`.
   - The forge creates `/home/andyj1810/projects/jepa_ipomdp/runs/week/PAUSE` so the training queue pauses before new seeds launch.
   - It waits until `/home/andyj1810/projects/jepa_ipomdp/runs/week/GPU_BUSY` clears (timeout 2.5 hours).
   - It runs your model with exclusive VRAM.
   - It automatically removes `PAUSE` when the job completes.
2. **Never invoke raw scripts directly**:
   Never run `run_image.py` or gen3d entry points directly; doing so bypasses `gpu_window()` and crashes concurrent training.
3. **Never run two model stages simultaneously**.
4. **Deterministic non-model stages proceed without locks**:
   Headless Blender and PIL stages (`rig`, `animate`, `bake`, `pixelize`, `qa`, `packet`, `publish`, `faces`) run without torch model VRAM and can execute immediately.
5. **Always set `PYTHONDONTWRITEBYTECODE=1`**:
   Avoids creating `__pycache__` artifacts flagged by workspace hygiene.

---

## 2. Standing Team Laws & Boundaries

- **Lane Boundary (`TEAM-2`)**:
  - **Write ONLY in blender lane**: `art/source/references/**`, `art/source/masters/**`, `art/source/ui/**`, `art/source/tiles/sets/**`, `art/source/exports/**`, `art/source/blender/**`, `art/source/forge/recipes/**`, `art/source/forge/work/**`, `art/review/**`, `art/source/world/**` (via `worldforge` passes only), `art/source/staging/blender/**`, `docs/team/queue/blender.md`, `docs/team/comms/blender/**`.
  - **Never touch**: `src/`, `scripts/`, `tests/`, `art/source/pipeline/`, forge code/spec, doctrine, or other members' comms folders.
- **Visual Inspection Before Reporting (`PRD-5`)**:
  - **Look at every image you produce** using `read_file` on `contact.png`, `registered.png`, or level screen crops before describing it or submitting a review packet.
- **Quota & Image Ledger (`PRD-7`)**:
  - Reference sheets: $\le 4$ generations per sheet.
  - Prop/part sheets: $\le 2$ generations per sheet.
  - Portraits: $\le 2$ candidates per emotion per actor.
  - Log every generation in `docs/team/comms/blender/image-ledger.md`.
- **Honest Factual Tone (`TEAM-5.3`)**:
  - Never use banned words: *AAA, AAA-grade, stellar, flawless, perfect, perfectly, production-ready, world-class, stunning, gorgeous*.
  - Status reaches `candidate` at most (only Director Huy or delegated acting directors approve).
- **Session Reports (`TEAM-5.2`)**:
  - Every update concludes with `Changed`, `Evidence`, `Gaps`.

---

## 3. Current Project State & Baseline

Branch: `studio/doctrine-v1` (clean working tree, up to date with origin).

- **Ticket B27 (100% Published — Commit `3b98ad33`)**:
  **45 approved staging JSONs** are staged in `art/source/staging/blender/`:
  - 10 NPC bodies (`npc:neris`, `npc:caelum`, `npc:dara`, `npc:finn`, `npc:lark`, `npc:marina`, `npc:mira`, `npc:oren`, `npc:reed`, `npc:willa`).
  - 2 Winged creatures (`zephyrit`, `cindermoth`).
  - 5 B20 Re-bakes (`rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet`).
  - 5 Golden environments (`env:house-aqualia`, `env:tree-oak`, `env:well`, `env:landmark-waystone`, `env:prop-hearth`).
  - 6 Held items (`item:fishing-rod`, `item:hoe`, `item:ferry-pole`, `item:hunting-spear`, `item:copper-sword`, `item:shortbow`).
  - 11 Human face sidecars (`player-aqualia`, `npc:neris`..`npc:willa`).
  - 1 Creature face sidecar golden sample (`ignicap`).
- **Ticket B28 (`steamshell` yaw fix)**: Approved and published (`steamshell.json` staged).
- **Ticket B20 (Readability Re-bakes)**: 7 approved and published; 2 weapons (`item:copper-sword`, `item:shortbow`) re-rendered with Claude's C36 `orient.inflate: "thin"` submitted for V6 sign-off.
- **Ticket B29 (Creature Faces)**: All 8 creatures + `npc:oren` + `npc:reed` reached `candidate`; awaiting 25-frame tool reconciliation from Codex's intake before final publish.
- **Ticket C33 (Portrait Identity Lock)**: Landed by Visitor in `81f04a32` with OKLab neutral-palette quantization and skin chroma / expression delta QA checks (9/9 selftests passing).
- **Ticket C35 (Model Registry Provenance)**: Landed by Visitor in `fcc78fa7`.

---

## 4. Execution Roadmap for the Long Blender Session

Execute the following 5 phases in order:

```
Phase 1: B25 Portraits (19 Actors, 9 Emotions)
   ↓
Phase 2: B24 Flora in 3 States (6 Species × 3 States = 18 Environment Sprites)
   ↓
Phase 3: B26 Worldforge Map Dressing (Village-2 & Riverlands-2)
   ↓
Phase 4: B5 3D Environment Modeling (18 AQ-2 Landmarks & Reusable Kit Pieces)
   ↓
Phase 5: B18 Authored Artifacts UI & Props (Frames, Screens, Display Furniture)
```

---

### Phase 1: Ticket B25 — 19 Actor Portrait Sets (9 Emotions)

- **Context**: Fully unblocked by Visitor's C33 (`81f04a32`).
- **Target Roster (19 Actors)**:
  - 1 Player: `player-aqualia`
  - 10 Villagers: `npc:neris`, `npc:caelum`, `npc:dara`, `npc:finn`, `npc:lark`, `npc:marina`, `npc:mira`, `npc:oren`, `npc:reed`, `npc:willa`
  - 8 Species: `creature:rivallie`, `creature:bramblefang`, `creature:mireling`, `creature:marshstalker`, `creature:zephyrit`, `creature:cindermoth`, `creature:ignicap`, `creature:steamshell`
- **Expressions per Actor (9)**:
  `neutral` (source), `warm`, `thoughtful`, `curious`, `concerned`, `amused`, `angry`, `sad`, `fearful`.
- **Workflow**:
  1. **Run Pilot Actor (`player-aqualia`)**:
     ```bash
     PYTHONDONTWRITEBYTECODE=1 uv run --project art/source/forge python art/source/forge/forge.py portrait --asset player-aqualia
     ```
  2. **Inspect Contact Sheet (`PRD-5`)**:
     - Open `art/source/forge/work/portrait-player_aqualia/contact.png` with `read_file`.
     - Verify:
       - Silhouette IoU $\ge 0.90$.
       - Clothing color drift $\le 0.05$.
       - Skin chroma delta-E $\le 2.5$ in OKLab space.
       - Expression pixel delta $\ge 3.5\%$.
       - Micro-expressions (`thoughtful`, `concerned`, `sad`) remain distinct at 96 px.
  3. **Pick Expressions**:
     ```bash
     PYTHONDONTWRITEBYTECODE=1 uv run --project art/source/forge python art/source/forge/forge.py portrait --asset player-aqualia --pick warm=warm-...,thoughtful=thoughtful-...,curious=curious-...,concerned=concerned-...,amused=amused-...,angry=angry-...,sad=sad-...,fearful=fearful-...
     ```
  4. **Run Remaining 18 Actors Sequentially**:
     - Repeat generation, contact sheet inspection (`PRD-5`), and picking for each actor.
     - Ensure image ledger is updated in `docs/team/comms/blender/image-ledger.md`.
  5. **Assemble Review Packet & Dispatch**:
     - Review packet: `art/review/2026-11-05-portraits-19/`.
     - Post comms announcement `--to-communicator-claude--` (per `TEAM-4.2` rule 5, Communicator or Claude decides B25 packets because Visitor authored C33).

---

### Phase 2: Ticket B24 — Flora in Three States (18 Environment Sprites)

- **Context**: Gatherable flora must represent resource harvesting and world effects (`healthy`, `harvested`, `burnt`).
- **Species Roster (6 Species × 3 States = 18 Sprites)**:
  - `berries`: Aqualia marsh blueberries.
  - `reeds`: Riverlands water reeds.
  - `wheat`: Village flood-basin wheat.
  - `nectar`: Moorland bell blossoms.
  - `ashgrass`: Volcanic/marsh border sedge.
  - `fungi`: Diver's pool shelf mushrooms.
- **Workflow (Execute One Species at a Time)**:
  1. **Healthy Concept & Views**:
     ```bash
     PYTHONDONTWRITEBYTECODE=1 uv run --project art/source/forge python art/source/forge/forge.py concept --asset flora-<species>-healthy --kind prop-v1
     PYTHONDONTWRITEBYTECODE=1 uv run --project art/source/forge python art/source/forge/forge.py views --asset flora-<species>-healthy
     ```
  2. **Healthy 3D Mesh & 1×1 Environment Bake**:
     - Create recipe `art/source/forge/recipes/env-flora-<species>-healthy.json`.
     - Run:
       ```bash
       PYTHONDONTWRITEBYTECODE=1 uv run --project art/source/forge python art/source/forge/forge.py gen3d --asset env-flora-<species>-healthy
       PYTHONDONTWRITEBYTECODE=1 uv run --project art/source/forge python art/source/forge/forge.py environment --asset env-flora-<species>-healthy
       ```
  3. **Harvested & Burnt Variants**:
     - Use the healthy render as reference in `forge.py concept` to maintain botanical silhouette and stem structure.
     - Forge `env-flora-<species>-harvested` (stripped stems/empty husks).
     - Forge `env-flora-<species>-burnt` (charred basalt-blackened stalks).
  4. **Quality Gate & Packet**:
     - Inspect `contact.png` at 1× (`PRD-5`). Confirm palette compliance, 1× readability, and clean bounding footprint.
     - Assemble packet in `art/review/` and notify `--to-visitor-communicator--`.

---

### Phase 3: Ticket B26 — Worldforge Village & Riverlands Map Dressing

- **Context**: Unblocked for the 5 approved B5 environment assets (`env:house-aqualia`, `env:tree-oak`, `env:well`, `env:landmark-waystone`, `env:prop-hearth`).
- **Goal**: Dress `village-2` and `riverlands-2` with approved kit pieces at their AQ-2 landmark positions.
- **Workflow**:
  1. Run `worldforge doctor` to confirm toolchain readiness.
  2. Author dressing pass for `village-2`:
     - Place houses, waystone, well, and hearth props according to the AQ-2 layout spec.
     - Execute via canonical `worldforge pass` commands (never touch `hearthwild.ldtk` directly).
  3. Author dressing pass for `riverlands-2`:
     - Place oak trees, waystone markers, and riverbank clusters.
  4. Render map overviews and crop sheets:
     ```bash
     PYTHONDONTWRITEBYTECODE=1 uv run --project art/source/world python art/source/world/worldforge.py render --level village-2
     PYTHONDONTWRITEBYTECODE=1 uv run --project art/source/world python art/source/world/worldforge.py render --level riverlands-2
     ```
  5. Inspect screen crops per `PRD-5` for tile seam alignment, path clearing, and sorting depths.
  6. Emit candidate packet to `art/review/` and post `--to-visitor-communicator--`.

---

### Phase 4: Ticket B5 — Aqualia Environment Kit & Landmark 3D Modeling

- **Context**: Complete the remaining 18 AQ-2 landmarks and reusable kit pieces.
- **Asset Target List**:
  - **Village Landmarks**:
    1. `env:notice-board` (town plaza board)
    2. `env:ferry-landing` (bollards & dock slip)
    3. `env:divers-pool` (steps & diving platform)
    4. `env:lantern-bridge` (stone bridge with arched lanterns)
    5. `env:mill-waterwheel` (Oren's mill building & timber wheel)
    6. `env:sluice-gate` (Finn's irrigation canal gate)
    7. `env:gauge-tower` (Caelum's water-height tower)
    8. `env:shrine-spring` (sacred spring cavern entrance)
    9. `env:stilt-hut` (Willa's marsh cottage on piles)
    10. `env:studio-lark` (Lark's timber atelier)
  - **Riverlands Landmarks**:
    11. `env:kite-oak` (massive solitary landmark oak)
    12. `env:willow-footbridge` (low arched willow crossing)
    13. `env:bell-post` (ferry signal post)
    14. `env:fungi-ring` (fairy circle landmark)
  - **Reusable Kit Props**:
    15. `env:boardwalk` (straight, corner, T-junction, end cap)
    16. `env:lantern-post` (village streetlamp)
    17. `env:crates-barrels` (dockside clutter stacks)
    18. `env:reed-clump` (waterline dual-grid decoration)
- **Standard Pipeline Per Asset**:
  ```bash
  PYTHONDONTWRITEBYTECODE=1 uv run --project art/source/forge python art/source/forge/forge.py concept --asset <slug>
  PYTHONDONTWRITEBYTECODE=1 uv run --project art/source/forge python art/source/forge/forge.py views --asset <slug>
  PYTHONDONTWRITEBYTECODE=1 uv run --project art/source/forge python art/source/forge/forge.py gen3d --asset <slug>
  PYTHONDONTWRITEBYTECODE=1 uv run --project art/source/forge python art/source/forge/forge.py environment --asset <slug>
  ```
  Open `art/source/forge/work/<slug>/contact.png` per `PRD-5`, check footprint margin ($\ge 2$ px), compile review packet, and submit to Visitor.

---

### Phase 5: Ticket B18 — Authored Artifacts UI & Props

- **Context**: Real art assets for Codex's C17–C20 authored-artifacts system.
- **Deliverables**:
  1. **Item Icons (32 px, doctrine palette)**:
     - `icon:note-blank`, `icon:note-written`
     - `icon:book-blank`, `icon:book-written`
     - `icon:canvas-blank`, `icon:canvas-painted` (16 × 11 transparent thumbnail window)
  2. **UI Screens in `art/source/ui/`**:
     - Two-page open book spread frame.
     - Single-page note parchment frame.
     - Page navigation dog-ears & turn arrows.
     - Wax seal stamp decal.
  3. **Painting Frames**:
     - 48 × 32 wall display frame.
     - 4× preview modal frame.
     - Cloth-covered easel sprite ("work in progress").
  4. **Display Furniture 3D Forges**:
     - `env:wall-hook` (note mounting)
     - `env:shelf-books` (wall book rack)
     - `env:lectern` (reading stand)
     - `env:easel` (painting display)

---

### Interleaved Tasks: Sidecars & Approvals

1. **Ticket B29 (Creature Faces 25-Frame Sync)**:
   - When Codex's `eng/hd-presentation` merge lands on `studio/doctrine-v1`, verify `forgelib/faces.py` uses `register_profiles()`.
   - Run:
     ```bash
     for a in steamshell ignicap zephyrit cindermoth marshstalker rivallie bramblefang mireling npc:oren npc:reed; do
       PYTHONDONTWRITEBYTECODE=1 uv run --project art/source/forge python art/source/forge/forge.py faces --asset $a
     done
     ```
   - Inspect `registered.png` per `PRD-5` (0 hidden frames at rest).
   - Once approved by Visitor (`V5`), run `forge.py publish --faces` to update `art/source/staging/blender/*-faces.json`.
2. **Ticket B20 Weapons Sign-off**:
   - Once Visitor signs off on `item:copper-sword` and `item:shortbow` (`V6`), publish both to staging.

---

## 5. Session Wrap-up & Hygiene Checklist

Before pushing or ending any turn:
1. Stop all temporary processes and background servers.
2. Verify workspace hygiene:
   ```bash
   npm run check:hygiene
   ```
3. Update session log in `docs/team/comms/blender/session-<date>.md`.
4. Update ticket statuses in `docs/team/queue/blender.md`.
5. Run `git status` to ensure no files outside `blender` lane are modified.
6. Commit with explicit file paths:
   ```bash
   git commit -m "feat(art): Ticket <ID> <description>" <target-files>
   git push origin studio/doctrine-v1
   ```
7. Conclude every response with `Changed`, `Evidence`, `Gaps`.
