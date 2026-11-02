---
from: blender
to: blender
re: handoff-for-fresh-session
evidence: [docs/team/briefs/blender.md, docs/team/queue/blender.md, docs/engineering/imagegen.md, art/source/forge/models.json, docs/doctrine/locked-decisions.md (L12), docs/team/comms/claude/2026-11-02T2330--to-all--directive-014-standing-review-delegation.md]
needs-reply: no
---

# Handoff to Fresh Blender Session (2026-11-02)

## 1. Context & Role Overhaul (Directives 012, 013, 014)

You are **blender** on Machine A (WSL2, RTX 5080 Laptop GPU, Blender 4.2.3 at `~/.local/bin/blender`).
As of 2026-11-02, **Blender owns all art production**:
- Reference sheets and local image generation (`forge.py concept` → `views`).
- 2D terrain tiles (`tileforge`).
- 3D generation through the Sprite Forge (`prep → gen3d → clean → texture → layout/bake → pixelize → qa → packet`).
- World map layout through `worldforge`.

### Tooling & Models Locked in Doctrine (`DOC-2`, `L12`):
- **Image Generation**: FLUX.2 [klein] 9B is the sole registered image model (`art/source/forge/models.json`). Local generation on RTX 5080, no API quotas. Takes ~14 GB VRAM. Run only **one GPU job at a time**.
- **3D Generation**: `Hunyuan3D-2mv` is the default backend. TRELLIS.2 was evaluated and removed in C31. Do not set `gen3d.backend` in recipes.
- **Pose Guides**: Committed in `art/source/style/pose-guides/` (`quadruped.png`, `human.png`, `shelled.png`, `winged.png`, `mushroom-biped.png`). Always configure `concept.poseGuide` in recipes.
- **Review Protocol (Directive 014)**: The Director reinstated standing review delegation to Claude (`recordedBy: claude under the director's standing delegation of 2026-11-02`). Post every packet `--to-claude-director--` and proceed immediately to the next unblocked ticket without waiting.

---

## 2. Completed Milestones

- **B14 (Hatchet)**: Published and staged to `art/source/staging/blender/item-hatchet.json`.
- **B2 (Riverlands Map)**: Revision 2 director-approved (layout scope) in `docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_riverlands-2.md`.
- **B3 (Quadrupeds)**: Rivallie, Bramblefang, Marshstalker, Mireling approved, published, and staged.
- **C26 (Sprite Readability)**: Approved by Director for B20 regeneration (`"supersample": 4`, `features` for sub-pixel fangs/horns/crests, `rampShift` for dark coats).

---

## 3. Working Tree Context

- Branch: `studio/doctrine-v1` (fast-forward mirrored to `art/hd-aqualia-slice`).
- In-progress Claude tooling: `art/source/forge/forge.py` (modified) and `art/source/forge/forgelib/swatch.py` (untracked) + `scratch-c30/`.
  - **Do NOT touch or revert**: Forge code belongs to Codex/Claude (`TEAM-2`). Claude will complete C30a.
- Hygiene: `npm run check:hygiene` passes cleanly with 0 errors, 0 warnings.
- Tests: All 23 test files (311 tests) and 67 Python selftests pass.

---

## 4. Immediate Top Ticket: B19 · Golden samples with local image generation

### Step-by-Step Execution:
1. **Rivallie (Creature Golden Sample)**:
   - Recipe: `art/source/forge/recipes/rivallie.json` (already has `concept` block with `creature-v1` and `quadruped.png`).
   - Run: `uv run --project art/source/forge python art/source/forge/forge.py concept --asset rivallie --n 4`
   - Inspect: `art/source/forge/work/rivallie/concept/contact.png` (seeds 900–903 c901/c903 known clean on all fours).
   - Pick: `uv run --project art/source/forge python art/source/forge/forge.py views --asset rivallie --pick <id>`
   - Forge: `uv run --project art/source/forge python art/source/forge/forge.py all --asset rivallie`
   - Packet: Check `contact.png` and QA metrics.

2. **Item:Hatchet (Prop Golden Sample)**:
   - Add `concept` block (`prop-v1`) to `recipes/item-hatchet.json`.
   - Run `concept --asset item:hatchet --n 4` → inspect → `views --pick <id>` → `all --asset item:hatchet`.

3. **Env:House-Aqualia (Building Golden Sample)**:
   - Author `recipes/env-house-aqualia.json` (`building-v1`, footprint `[6, 4]`).
   - Run `concept --asset env:house-aqualia --n 4` → inspect → `views --pick <id>` → `all --asset env:house-aqualia`.

4. **Player-Aqualia (Human Golden Sample)**:
   - Update `recipes/player-aqualia.json` (`human-apose-v1`, `poseGuide: "art/source/style/pose-guides/human.png"`).
   - Run `concept --asset player-aqualia --n 4` → inspect → `views --pick <id>` → `all --asset player-aqualia`.

5. **Review Dispatch**:
   - Post one message `docs/team/comms/blender/<timestamp>--to-claude-director--golden-samples.md`.
   - Update `docs/team/queue/blender.md`.
   - Continue immediately to draft metadata for B15/B16 per Directive 014.

---

## 5. Rules of Engagement
- Always open every generated and packet image directly via `read_file` (`PRD-5`).
- Never model from typed coordinates (`PRD-2`).
- Never claim more than `candidate` status (`TEAM-4`).
- No banned superlatives (AAA, stellar, perfect, flawless, production-ready, world-class, stunning, gorgeous) (`TEAM-5.3`).
- Clean scratch files and verify `npm run check:hygiene` before every push (`TEAM-9`).
