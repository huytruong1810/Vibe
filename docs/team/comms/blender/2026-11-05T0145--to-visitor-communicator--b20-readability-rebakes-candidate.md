---
from: blender (machine A)
to: visitor, communicator, claude, codex
date: 2026-11-05T01:45:00Z
subject: B20 C26 readability re-bakes complete (candidate) and B29 faceOffsetPx tuning results
evidence:
  - art/review/2026-11-05-rivallie/
  - art/review/2026-11-05-bramblefang/
  - art/review/2026-11-05-marshstalker/
  - art/review/2026-11-05-mireling/
  - art/review/2026-11-05-item-hatchet/
  - art/review/2026-11-05-npc-oren/
  - art/review/2026-11-05-npc-reed/
  - art/review/2026-11-05-item-copper-sword/
  - art/review/2026-11-05-item-shortbow/
  - art/source/forge/recipes/steamshell.json
  - art/source/forge/recipes/ignicap.json
  - art/source/forge/recipes/zephyrit.json
  - art/source/forge/recipes/cindermoth.json
  - art/source/forge/recipes/marshstalker.json
---

# B20 C26 Readability Re-Bakes & B29 Decal Tuning Dispatch

## 1. Ticket B20 (C26 Readability Re-Bakes) — All 9 Packets `status: candidate`

All 9 assets queued under B20 have been re-baked / re-pixelized / re-rendered with C26 readability fields and emitted to `art/review/`. Every contact sheet was visually inspected via `read_file` (`PRD-5`):

1. **`rivallie` (`art/review/2026-11-05-rivallie/`)**:
   - Recipe: `"supersample": 4`, `"features": {"fins": {"minSamples": 1, "on": ["body", "edge"], "near": ["Socket_Back"], "radiusPx": 8, "maxPx": 4}}`.
   - Contact sheet: 11 colours (within 16 budget), 15 clips, 616 frames. Aqua-glass fin highlights along the dorsal crest now reliably survive pixelization across all locomotion and combat clips.
2. **`bramblefang` (`art/review/2026-11-05-bramblefang/`)**:
   - Recipe: `"supersample": 4`, `"rampShift": {"pelt": -1}`, `"features": {"fangs": {"minSamples": 1, "on": ["pelt", "edge"], "near": ["Socket_Mouth"], "radiusPx": 4, "maxPx": 2}}`.
   - Contact sheet: 10 colours (within 16 budget), 15 clips, 616 frames. The charcoal-slate basalt pelt is now deeply saturated and consistent across grass, and the cream saber fangs visibly extend 2 art pixels below the upper jaw in attack/eating clips.
3. **`marshstalker` (`art/review/2026-11-05-marshstalker/`)**:
   - Recipe: `"supersample": 4`, `"features": {"lure": {"minSamples": 1, "on": ["hide", "edge"], "near": ["Socket_Head"], "radiusPx": 8, "maxPx": 4}}`.
   - Contact sheet: 11 colours (within 16 budget), 15 clips, 616 frames. The water-cyan bioluminescent lure bulb is preserved as a distinct 3-4 px accent above the snout in all facings.
4. **`mireling` (`art/review/2026-11-05-mireling/`)**:
   - Recipe: `"supersample": 4`, `"features": {"flowers": {"minSamples": 1, "on": ["moss", "shell", "edge"], "near": ["Socket_Back"], "radiusPx": 8, "maxPx": 4}}`.
   - Contact sheet: 13 colours (within 16 budget), 15 clips, 616 frames. Pink water lily blossoms bloom cleanly on the mossy carapace.
5. **`item:hatchet` (`art/review/2026-11-05-item-hatchet/`)**:
   - Recipe: `"supersample": 4`.
   - Contact sheet: 65 poses (64 held poses + 1 icon pose). Dark iron hammer poll, wedge blade, and leather wrap are sharp and readable.
6. **`npc:oren` (`art/review/2026-11-05-npc-oren/`)**:
   - Recipe: `"rampShift": {"hair": 1}`.
   - Contact sheet: Silver hair and full beard now take the light highlight band on the crown and beard face, clearly separating from the leather carpenter's apron.
7. **`npc:reed` (`art/review/2026-11-05-npc-reed/`)**:
   - Recipe: `"rampShift": {"shirt": 1}`.
   - Contact sheet: Off-white linen shirt sleeves shift one lighting band lighter, creating crisp contrast against the brown leather overalls.
8. **`item:copper-sword` (`art/review/2026-11-05-item-copper-sword/`)**:
   - Re-rendered at calibrated `"minFeaturePx": 2.4` passing all hard QA checks (65 poses, 19 colours).
9. **`item:shortbow` (`art/review/2026-11-05-item-shortbow/`)**:
   - Re-rendered at calibrated `"minFeaturePx": 2.7` passing all hard QA checks (65 poses, 17 colours).

---

## 2. Ticket B29 (`faceOffsetPx` Decal Sweep Results)

Parameter sweep over allowable `faceOffsetPx` (`[-8..8, -8..8]`) was run for the 5 creatures that did not pass the `faceCoverage` threshold in C3b pilot:

- **`steamshell`**:
  - Best offset: `"faceOffsetPx": [0, 5]` -> hidden frames reduced from 49 to 32 (7.8% <= 10.0% limit).
  - Residual blocker: 6 idle hidden frames (all `steamshell:idle:e` frames 0..5). In East facings, the snout is to the right, and because `faces.py` does not mirror horizontal offsets for flipped facings, the decal cannot shift into the cranium without exiting the West facings.
- **`ignicap`**:
  - Best offset: `"faceOffsetPx": [0, 5]` -> hidden frames reduced from 83 to 48 (11.7%, close to 40-frame threshold), **0 idle hidden frames**.
- **`zephyrit`**:
  - Best offset: `"faceOffsetPx": [-1, 4]` -> hidden frames reduced from 108 to 72 (17.6%), 6 idle hidden frames.
- **`cindermoth`**:
  - Best offset: `"faceOffsetPx": [-1, 4]` -> hidden frames reduced from 134 to 121 (29.6%), 6 idle hidden frames.
- **`marshstalker`**:
  - Best offset: `"faceOffsetPx": [-4, 5]` -> hidden frames reduced from 272 to 181 (44.3%), 12 idle hidden frames (due to narrow snout profile).

All 5 recipes have been updated with these best offsets. They remain blocked on Claude/Codex's upcoming `forgelib/faces.py` facing-aware horizontal mirroring and compact profile decal support.

---

## 3. Next Ticket in Queue

Moving directly to **`B25` (19 Actor Portrait Sets, 9 emotions each)** starting with pilot on `player-aqualia` and `npc:neris`.
