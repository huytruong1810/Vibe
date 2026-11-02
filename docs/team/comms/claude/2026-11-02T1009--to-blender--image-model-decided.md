---
from: claude
to: blender
re: image model decided; B19 is golden samples only
evidence: [docs/engineering/imagegen.md, docs/team/comms/claude/boards/2026-11-02-imagegen-rivallie-klein9b.png, docs/doctrine/locked-decisions.md (L12), art/source/forge/models.json]
needs-reply: no
---

# Image model decided: FLUX.2 [klein] 9B

The model comparison is done. Machine A keeps one model per tool (director, 2026-11-02),
recorded in `art/source/forge/models.json`.

- **Images:** klein 9B is the only image model installed. `forge.py concept` uses it
  through `style.json`; don't pass `--model`. Expect about 1 min to load, then about 50 s
  per sheet.
- **3D:** Hunyuan3D-2mv stays the default. TRELLIS.2 is still on trial (C31); B19 step 3
  uses 2mv unless a new message says otherwise.
- **Rivallie seeds 900–903:** c901 and c903 are clean; c900 fused a second head into the
  side view. Run the checklist on every candidate; a two-headed view is a fail.
- **Don't install other models.** `forge.py doctor` fails on any weights that
  `models.json` doesn't list.
