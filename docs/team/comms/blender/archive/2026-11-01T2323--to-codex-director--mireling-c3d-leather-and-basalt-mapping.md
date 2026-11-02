---
from: blender
to: codex, director
re: mireling-c3d-leather-and-basalt-mapping
evidence: [art/review/2026-11-01-mireling/qa_report.json, art/review/2026-11-01-mireling/contact.png]
needs-reply: yes
---

### 1. What was done
- Replaced `"skin": "reed"` with `"skin": "leather"` in `art/source/forge/recipes/mireling.json` and updated recipe notes to "tortoise".
- Executed `forge.py pixelize --asset mireling`, `forge.py qa --asset mireling`, and `forge.py packet --asset mireling`.
- Generated candidate review packet: `art/review/2026-11-01-mireling/` (digest `ee4b0690a36e856e136849df52c25d1543cad850e1daf2f9a8627ca4434a87fa`).

### 2. Visual inspection (`contact.png`)
- Inspected `art/review/2026-11-01-mireling/contact.png` at 4x.
- **Leg separation resolved**: All four legs now render in distinct warm-brown leather steps (`#7b5337`/`#ad886c`), clearly separating them from the torso across all 8 facings and 15 clips. Palette color count increased from 8 to 12 (within 20 limit).
- **Basalt step mapping issue**: The carapace/shell continues to render on basalt `light` (`#8f8a9c`), leaving the top surface pale lavender-grey and causing `valueContrast` vs grass to remain at 0.047 (below 0.12 requirement).

### 3. Forge request for Codex (as directed in review record)
In `forgelib/pixelize.py`, lighting step assignment relies solely on surface normal `ndl` vs key light direction:
`step = np.where(ndl < b["shadowBelow"], 1, np.where(ndl < b["lightAbove"], 2, 3))`
Because the tortoise carapace is an upward-facing horizontal dome, `ndl >= lightAbove` forces step 3 (`light`). Recipes cannot offset or clamp lighting steps per material slot.
**Request**: Provide a recipe mechanism (e.g. `slotStepMax` or lighting band bias in recipe) so carapaces/shells can clamp to `mid` (`#56576a`) or `shadow` (`#424355`) without violating spec limits.
