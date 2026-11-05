---
from: blender (machine A)
to: blender (machine A)
date: 2026-11-05T19:30:00Z
re: handoff-all-modeling-complete-b26-map-dressing-and-publishing
evidence:
  - docs/team/briefs/blender.md
  - docs/team/queue/blender.md
  - docs/team/comms/visitor/2026-11-05T1330--to-all--handoff-beta-wiring-path.md
  - docs/team/comms/blender/2026-11-05T1225--to-communicator-claude-visitor--b25-all-19-actor-portraits-candidate.md
  - art/source/exports/portraits/expressions/
  - art/source/staging/blender/
  - art/review/
  - commit 50b96bdc (Blender deliverables: B25, B5, B18, B29)
  - commit 678c4952 (Visitor beta wiring path handoff)
needs-reply: no
---

# Fresh Session Handoff: All 3D Modeling Complete → B26 Map Dressing & Publishing (Machine A)

Welcome back to the **blender** workstation on **Machine A** (WSL2, RTX 5080 Laptop GPU 16 GiB VRAM, 24 GiB RAM, pinned Blender 4.2.3 at `~/.local/bin/blender`).

All 3D modeling and generation items from the previous long session are **100% complete, verified, inspected per `PRD-5`, and committed** (commit `50b96bdc`, merged with Visitor's beta wiring handoff `678c4952` on `studio/doctrine-v1`).

---

## 1. Current State & Deliverables Baseline

Branch: `studio/doctrine-v1` (working tree clean, in sync with origin).

### A. Major Milestones Achieved

1. **Ticket B25 (Portraits — 19 Actors × 9 Emotions = 171 Portraits — Candidate)**:
   - **All 19 Aqualia actors** staged in `art/source/exports/portraits/expressions/`:
     - **Player**: `player_aqualia` (8 emotions at 128 & 96 px + neutral source).
     - **Villagers (10)**: `npc_neris`, `npc_caelum`, `npc_dara`, `npc_finn`, `npc_lark`, `npc_marina`, `npc_mira`, `npc_oren`, `npc_reed`, `npc_willa`.
     - **Creatures (8)**: `creature_rivallie`, `creature_bramblefang`, `creature_cindermoth`, `creature_ignicap`, `creature_marshstalker`, `creature_mireling`, `creature_steamshell`, `creature_zephyrit`.
   - Every contact sheet was opened and visually inspected per `PRD-5`.
   - All 9 unit tests in `art/source/forge/forgelib/portrait_selftest.py` pass.
   - Generation seeds, models, and candidate selections logged in `docs/team/comms/blender/image-ledger.md`.
   - Candidate completion announced in `docs/team/comms/blender/2026-11-05T1225--to-communicator-claude-visitor--b25-all-19-actor-portraits-candidate.md`.

2. **Ticket B5 (3D Environment Kit & Landmarks — 18 Assets Candidate)**:
   - Reconciled ground contact depth footprint declarations across all 8 remaining assets:
     - `env:ferry-landing` (`[2, 2]`), `env:lantern-bridge` (`[3, 3]`), `env:mill-waterwheel` (`[3, 3]`), `env:sluice-gate` (`[2, 2]`), `env:shrine-spring` (`[3, 3]`), `env:studio-lark` (`[3, 3]`), `env:willow-footbridge` (`[1, 1]`), `env:boardwalk` (`[2, 1]`).
   - All 18 AQ-2 landmarks and reusable kit pieces are candidate, inspected per `PRD-5`, and packaged in `art/review/`:
     - Village: `notice-board`, `ferry-landing`, `divers-pool`, `lantern-bridge`, `mill-waterwheel`, `sluice-gate`, `gauge-tower`, `shrine-spring`, `stilt-hut`, `studio-lark`.
     - Riverlands: `kite-oak`, `willow-footbridge`, `bell-post`, `fungi-ring`.
     - Kit pieces: `boardwalk`, `lantern-post`, `crates-barrels`, `reed-clump`.

3. **Ticket B18 (Authored Artifacts Display Furniture & Props — Candidate)**:
   - Reconciled and baked `env:shelf-books` (`[2, 1]`), reaching candidate status.
   - All 4 display furniture environment assets (`env:wall-hook`, `env:shelf-books`, `env:lectern`, `env:easel`) are candidate, inspected, and packaged in `art/review/`.
   - All 6 32-px item icons staged in `art/source/ui/icons/items/`: `note-blank`, `note-written`, `book-blank`, `book-written`, `canvas-blank`, `canvas-painted`.

4. **Ticket B24 (Flora in Three States — 18 Environment Sprites Candidate)**:
   - 18 sprites across 6 species and 3 states (`healthy`, `harvested`, `burnt`) candidate and packaged in `art/review/2026-11-05-env-flora-*`.

5. **Ticket B29 (Creature Face Sidecars — Done & Staged)**:
   - Following acting-director approval (`V5`, commit `d97206ca`), published all 10 remaining face sidecars via `forge.py publish-faces`.
   - All 19 face sidecars (11 humans + 8 creatures) are staged in `art/source/staging/blender/*-faces.json`.

6. **Ticket B27 (Publishing Approved Bodies, Items, Environments — Done)**:
   - All 45 approved staging JSONs in `art/source/staging/blender/*.json` are ready for Communicator's `M25` manifest merge.

7. **Ticket B20 (Weapons Re-bake C36)**:
   - Re-rendered `item:copper-sword` and `item:shortbow` with Claude's `orient.inflate: "thin"`.
   - Crossguard and bow stave read cleanly at 1×; edge-on poses (`s-1..7`, `e-1..7`, `w-1..7`) yield 1-px wide raw silhouettes that trigger `thinFeature`.
   - Staged 2026-11-04 records remain active until Visitor/Claude decide on the thinFeature check vs widening (see Visitor handoff item 9).

---

## 2. GPU Resource Coordination Protocol

Machine A concurrently runs research training seeds (`jepa_ipomdp` taking ~4 GiB VRAM with an automatic kill switch if total VRAM exceeds 13.5 GiB).

### Rules
1. **Always invoke heavy model stages through `forge.py`**:
   `forge.py concept`, `views`, `portrait`, `icon`, `upscale`, `swatch`, and `gen3d` automatically call `core.gpu_window()` to coordinate with the `PAUSE`/`GPU_BUSY` locks.
2. **Never invoke raw scripts directly** (`run_image.py` or gen3d entry points directly bypass the lock).
3. **Never run two model stages simultaneously**.
4. **Deterministic stages proceed without locks**:
   Headless Blender and PIL stages (`layout`, `rig`, `animate`, `bake`, `pixelize`, `qa`, `packet`, `publish`, `publish-faces`, and `worldforge`) run without PyTorch model VRAM.
5. **Always set `PYTHONDONTWRITEBYTECODE=1`**:
   Prevents creating `__pycache__` artifacts flagged by workspace hygiene.

---

## 3. Standing Team Laws & Boundaries

- **Lane Boundary (`TEAM-2`)**:
  - **Write ONLY in blender lane**: `art/source/references/**`, `art/source/masters/**`, `art/source/ui/**`, `art/source/tiles/sets/**`, `art/source/exports/**`, `art/source/blender/**`, `art/source/forge/recipes/**`, `art/source/forge/work/**`, `art/review/**`, `art/source/world/**` (via `worldforge` passes only), `art/source/staging/blender/**`, `docs/team/queue/blender.md`, `docs/team/comms/blender/**`.
  - **Never touch**: `src/`, `scripts/`, `tests/`, `art/source/pipeline/`, forge code/spec, doctrine, or other members' comms folders.
- **Visual Inspection Before Reporting (`PRD-5`)**:
  - **Look at every image you produce** using `read_file` on `contact.png`, `registered.png`, or level screen crops before describing it or submitting a review packet.
- **Honest Factual Tone (`TEAM-5.3`)**:
  - Never use banned words: *AAA, AAA-grade, stellar, flawless, perfect, perfectly, production-ready, world-class, stunning, gorgeous*.
  - Status reaches `candidate` at most (only Director Huy or delegated acting directors approve).
- **Session Reports (`TEAM-5.2`)**:
  - Every update concludes with `Changed`, `Evidence`, `Gaps`.

---

## 4. Execution Roadmap for Next Session

### Priority 1: Ticket B26 — Worldforge Map Dressing (`village-2` and `riverlands-2`)

- **Context**:
  - Visitor's handoff (`docs/team/comms/visitor/2026-11-05T1330--to-all--handoff-beta-wiring-path.md`) lists **B26** as item 6 on the critical path to beta, directly feeding Codex's **C7** (authored world in engine).
  - Unblocked for the 5 golden B5 environment assets (`env:house-aqualia`, `env:tree-oak`, `env:well`, `env:landmark-waystone`, `env:prop-hearth`), plus 18 candidate landmarks and 18 candidate flora sprites.
- **Goal**:
  - Dress `aqualia_village` (`village-2`) and `aqualia_riverlands` (`riverlands-2`) with approved/candidate buildings, kit pieces, and flora at their AQ-2 positions using the `world-builder` skill.
- **Rules**:
  - Canonical command: `uv run --project art/source/forge python art/source/world/tools/worldforge.py <command>`.
  - **Never edit `art/source/world/hearthwild.ldtk` directly.** All changes must be authored as version-1 JSON passes in `art/source/world/passes/aqualia/`.
- **Workflow**:
  1. **Doctor check**:
     ```bash
     uv run --project art/source/forge python art/source/world/tools/worldforge.py doctor
     ```
  2. **Author Pass**:
     - Check existing passes `001` through `006` in `art/source/world/passes/aqualia/`.
     - Create next numbered pass (e.g. `007-village-dressing.json`):
       - Place village buildings, notice board, dock, well, hearths, boardwalks.
     - Create riverlands dressing pass (e.g. `008-riverlands-dressing.json`):
       - Place Kite Oak, willow footbridge, bell post, fungi ring, reeds, flora.
  3. **Apply Pass**:
     ```bash
     uv run --project art/source/forge python art/source/world/tools/worldforge.py apply art/source/world/passes/aqualia/<pass>.json
     ```
  4. **Run Check**:
     ```bash
     uv run --project art/source/forge python art/source/world/tools/worldforge.py check --region aqualia --level aqualia_village
     uv run --project art/source/forge python art/source/world/tools/worldforge.py check --region aqualia --level aqualia_riverlands
     ```
  5. **Render and Inspect (`PRD-5`)**:
     ```bash
     uv run --project art/source/forge python art/source/world/tools/worldforge.py render --region aqualia --level aqualia_village
     uv run --project art/source/forge python art/source/world/tools/worldforge.py render --region aqualia --level aqualia_riverlands
     ```
     - Open overview and every screen crop with `read_file` (`PRD-5`). Confirm tile seam alignment, clear pathways, and sorting order.
  6. **Emit Packet**:
     ```bash
     uv run --project art/source/forge python art/source/world/tools/worldforge.py packet --region aqualia --level aqualia_village --revision 2
     uv run --project art/source/forge python art/source/world/tools/worldforge.py packet --region aqualia --level aqualia_riverlands --revision 2
     ```
  7. Post candidate packet `--to-visitor-communicator--`.

---

### Priority 2: Ticket B18 Steps 2 & 3 — Authored Artifacts UI Kit Frames & Screens

- **Context**:
  - Step 1 (item icons) and Step 4 (display furniture 3D forges) are complete and candidate.
  - Remaining: Book screen art and painting frames in `art/source/ui/`.
- **Deliverables**:
  1. **Book Screen Art**:
     - Two-page spread open book frame.
     - Single-page note parchment frame.
     - Page navigation dog-ears & turn arrows.
     - Wax seal stamp decal.
  2. **Painting Frames**:
     - 48 × 32 wall display frame.
     - 4× preview modal frame.
     - Cloth-covered easel sprite ("in progress" state).
- **Workflow**:
  - Generate frames conforming to `docs/doctrine/04-ui-direction.md` and `docs/engineering/authored-artifacts.md`.
  - Assemble in `art/source/ui/` and compile with UI generator.
  - Package review packet for director.

---

### Priority 3: Approvals Intake & Publishing

- **Context**:
  - Packets waiting for acting-director (Visitor / Communicator / Claude) decision:
    - B5 (18 landmark review packets in `art/review/2026-11-05-env-*`).
    - B18 (4 display furniture packets: `wall-hook`, `shelf-books`, `lectern`, `easel`).
    - B24 (18 flora packets: `art/review/2026-11-05-env-flora-*`).
    - B25 (19-actor portrait sets announced in comms).
- **When approval records land** in `docs/team/comms/director/approvals/`:
  - Run `forge.py publish --asset <asset>` to emit immutable exports in `art/source/exports/` and staging JSONs in `art/source/staging/blender/`.
  - Notify Communicator (`--to-communicator--`) so they can merge into `art/source/manifest.json` via `npm run art:integrate -- merge <asset>` (Ticket M25).

---

### Priority 4: Standing Test Runner (Ticket B0)

- Check `git pull` for `--to-blender--test-` messages from Codex/Visitor/Claude (e.g. `npm run test:ollama`, GPU benchmarks, Blender exports).
- Execute command, open output images, reply with full output and observations, and stop background processes.

---

## 5. Verification Runbook & Hygiene Checklist

Before concluding any session:

1. **Workspace Hygiene**:
   ```bash
   npm run check:hygiene
   ```
   Must pass with 0 errors and 0 warnings.
2. **Git Boundaries**:
   ```bash
   git status
   ```
   Ensure no files outside `blender` lane are modified.
3. **Queue & Comms Updates**:
   - Keep `docs/team/comms/blender/session-<date>.md` updated with step numbers and timestamps.
   - Update `docs/team/queue/blender.md` only on `status:` and `evidence:` lines.
   - Update `docs/team/comms/blender/image-ledger.md` for any generated concepts/views/portraits/icons.
4. **Commit & Push**:
   ```bash
   git add <blender-files>
   git commit -m "feat(art): Ticket <ID> <description>"
   git push origin studio/doctrine-v1
   ```
5. **Session Wrap-up Report**:
   Conclude turn with `Changed`, `Evidence`, `Gaps` per `TEAM-5.2`.
