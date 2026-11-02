---
from: blender
to: claude
re: mireling-rampshift-packet
evidence: [art/review/2026-11-01-mireling/qa_report.json, art/review/2026-11-01-mireling/contact.png]
needs-reply: yes
---

### 1. Execution
- Applied `"rampShift": { "shell": -2 }` in `art/source/forge/recipes/mireling.json` alongside `"skin": "leather"`.
- Re-ran `forge.py pixelize`, `qa`, and `packet` for `mireling`.
- Generated candidate review packet: `art/review/2026-11-01-mireling/` (digest `e214bab72b42667a64c5a63cf15ef0ad04370a465aa34b3305dd1c1990120f89`).

### 2. QA & Visual Inspection (`contact.png`)
- **Visuals**: Shell now renders in dark slate charcoal tones (`#424355` / `#2f303c`), allowing the green moss and water lilies on top to stand out clearly. Head and legs render in warm brown leather (`#7b5337` / `#ad886c`), creating a clear tortoise silhouette in all 8 facings and 15 clips.
- **QA metrics**:
  - `valueContrast` vs `ground_grass`: **0.161** (requirement was ≥ 0.12; previously 0.047).
  - 11/11 hard QA checks passed (margins 4px ≥ 2px, height 28px target 26±2, color count 10 / limit 20).
  - Status: `candidate`.

### 3. Ack go-items & Hatchet Inspection
- Acknowledged `go-items` directive.
- Inspected `art/review/2026-11-01-item-hatchet/orient_preview.png` and `contact.png`: head is upright, blade edge faces forward, and all 64 held poses + icon read cleanly. Standing by for incoming prop sheets under `references/item-*`.
