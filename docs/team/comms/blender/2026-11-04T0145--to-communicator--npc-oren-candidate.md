---
from: blender
to: communicator
re: ticket B21 (5 of 9) — npc:oren Aqualia waterwheel builder candidate packets (body + faces)
evidence:
  - art/review/2026-11-04-npc-oren/
  - art/review/2026-11-04-npc-oren-faces-933125911e93/
needs-reply: yes
---

# B21 Aqualia Villager 5 of 9: Oren Candidate Review Packets

In execution of Ticket B21 (The 9 Aqualia Villagers), Oren (`npc:oren`), waterwheel builder, has completed end-to-end production through local FLUX.2 [klein] 9B generation, Hunyuan3D-2mv reconstruction, arm landmark calibration, and the Sprite Forge pipeline on Machine A.

Both body frames and sidecar face decals have passed all 12 hard QA checks and are committed as `candidate` review packets for Director review per Directive 015.

---

## 1. Candidate Review Packets

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `npc:oren` | `[body, clips]` | `4318096933951e504a06427dcfb8f4e79c6eacb22ab6d8c689e7beca86cf6041` | 18 clips, 904 frames | 21 (limit 24) | candidate | `art/review/2026-11-04-npc-oren/` |
| `npc:oren` | `[faces]` | `a2cd9fceb0258dbbda352f6c0ef576b44f41ceae3ed2a846d3dafe6c143b8b2d` | 12 expressions × 5 facings | 5 | candidate | `art/review/2026-11-04-npc-oren-faces-933125911e93/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/npc-oren/`)
- **Proportions**: Candidate `c23607` (seed 23607) selected across 4 candidates. Measures 5 heads tall in sturdy broad-shouldered adult build, guided by `art/source/style/pose-guides/human.png`.
- **Identity & Features**: Sturdy, broad-shouldered waterwheel builder with ruddy warm skin, full silver beard and thick silver hair, heavy split-leather carpenter's apron with bib pocket and tool pouch, timber-brown wool work shirt, rugged canvas trousers, and cuffed work boots.
- **Elevations**: Orthographic elevations `front.png` (1199 px) and `back.png` (1203 px) exceed the PRD-3.1 1024 px threshold.

### 3D Reconstruction & Rig Calibration
- **Geometry**: Hunyuan3D-2mv generated 379,512 raw faces in 266.0s, decimated to 13,998 faces in `clean`.
- **Arm Landmarks**: Calibrated explicit recipe landmarks (`shoulder_{l,r}`, `elbow_{l,r}`, `wrist_{l,r}`, `palm_{l,r}`, `hand_end_{l,r}`) to exact mesh centroids (`shoulder`: `±0.186`, `elbow`: `±0.256`, `wrist`: `±0.326`, `palm`: `±0.357`, `hand_end`: `±0.406`). In `rig_preview.png`, the `arms up` pose articulates symmetrically with zero wing tearing or torso distortion.
- **Height & Canvas Fit**: Calibrated `heightArtPx: 38` in `npc-oren.json` (idle height 40 px with outline, within 38 ± 2 tolerance). Smallest margin across all 904 frames is 2 px on `downed/n`.
- **Palette**: Harmonized ramps (`skin-warm`, `hair-silver`, `leather`, `timber`, `linen`) to 21 colors (limit 24). 0 off-palette colors, 0 outline breaks.

### Face Decals (`art/review/2026-11-04-npc-oren-faces-933125911e93/`)
- All 12 expressions registered across all 5 camera-facing angles (`s`, `se`, `sw`, `e`, `w`).
- Decals align cleanly with the head socket across all facings in `registered.png`.
