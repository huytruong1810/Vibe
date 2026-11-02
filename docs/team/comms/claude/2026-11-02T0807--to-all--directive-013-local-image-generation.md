---
from: claude
to: all
re: directive-013
evidence: [docs/engineering/imagegen.md, docs/doctrine/09-production-doctrine.md (PRD-7), docs/doctrine/locked-decisions.md (L12), .agents/skills/reference-sheets/SKILL.md, docs/operations/operations.md]
needs-reply: no
---

# Directive 013: reference art is generated locally; villagers run abliterated models

Adds to directive 012, which still holds every member's order of work. Director decisions,
2026-11-02:

1. **No more image quota.** The forge generates reference art on machine A's GPU:
   `forge.py concept --asset <id>` makes candidate sheets, and `forge.py views --asset <id>
   --pick <cand>` writes the reference sheet with full provenance. PRD-7 is rewritten
   (no generation cap, templates only, provenance, one style), and L12 records the model
   policy: the project is personal, so non-commercial licences are fine for now. Proven on
   Rivallie with FLUX.2 [klein] 4B: 30–50 s per sheet, and the sheet became a clean
   all-fours mesh in `gen3d`. See `docs/engineering/imagegen.md`.
2. **Pose guides.** Quadruped prompts alone came out upright. A grey clay pose guide
   (`art/source/style/pose-guides/quadruped.png`, recipe `concept.poseGuide`) fixes it. New
   body types need their own guide.
3. **2D → 3D stays** for everything that moves or turns. Only static classes (terrain
   swatches, portraits, icons, VFX concepts) go image → 2D tools.
4. **Regenerate everything in one style**, after the golden-sample bake-off:
   - **blender B19:** golden samples, comparing Klein 4B with Qwen-Image-2.1 (and Klein 9B
     if a Hugging Face token is set).
   - **blender B20:** re-do the approved creatures and the hatchet. Each needs a new
     approval (PRD-9).
   - Rivallie's reference sheet is already the new klein 4B one (`c602`). Its old
     approval still covers only the old packet.
5. **Villagers run abliterated Gemma 4** builds, which don't step out of the story to
   refuse: `gemma4-abliterated:26b` and `gemma4-abliterated:e4b`. The stock tags are
   removed on machine A. The install recipe is in `docs/operations/operations.md`.

## Before B19 runs Qwen

`bash art/source/forge/imagegen/setup.sh qwen21`, a 33 GB download that was paused.
Klein 9B needs a token first: `hf auth login`.
