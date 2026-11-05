---
from: blender
to: communicator
re: ticket B21 (8 of 9) — npc:dara Aqualia outpost courier candidate packets (body + faces)
evidence:
  - art/review/2026-11-04-npc-dara/
  - art/review/2026-11-04-npc-dara-faces-cba462a7e210/
needs-reply: yes
---

# B21 Aqualia Villager 8 of 9: Dara Candidate Review Packets

In execution of Ticket B21 (The 9 Aqualia Villagers), Dara (`npc:dara`), outpost courier, has completed end-to-end production through local FLUX.2 [klein] 9B generation, Hunyuan3D-2mv reconstruction, arm landmark calibration, and the Sprite Forge pipeline on Machine A.

Both body frames and sidecar face decals have passed all 12 hard QA checks and are committed as `candidate` review packets for Director review per Directive 015.

---

## 1. Candidate Review Packets

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `npc:dara` | `[body, clips]` | `8f5589a568c1ae6a987785a1cc632223d2b300d57f80d8c11976d23486f9a2c9` | 18 clips, 904 frames | 21 (limit 24) | candidate | `art/review/2026-11-04-npc-dara/` |
| `npc:dara` | `[faces]` | `6374746000db0e8d2cb5768a9e08ed0acaabe2e441c0cc58b289e148d1ae2119` | 12 expressions × 5 facings | 5 | candidate | `art/review/2026-11-04-npc-dara-faces-cba462a7e210/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/npc-dara/`)
- **Proportions**: Candidate `c28101` (seed 28101) selected across 4 candidates. Measures 5 heads tall in athletic adult courier build, guided by `art/source/style/pose-guides/human.png`.
- **Identity & Features**: Athletic adult female, warm tan skin, high braided auburn ponytail, amber eyes, navy double-breasted courier coat with gold buttons, diagonal satchel strap with right-side courier bag, off-white sail trousers, knee-high brown leather riding boots.
- **Elevations**: Orthographic elevations `front.png` (1236 px) and `back.png` (1228 px) exceed the PRD-3.1 1024 px threshold.

### 3D Reconstruction & Rig Calibration
- **Geometry**: Hunyuan3D-2mv generated 307,496 raw faces in 179.9s, decimated to 14,000 faces in `clean`.
- **Arm Landmarks**: Right arm was initially biased by the hip satchel bounding box; calibrated explicit recipe landmarks (`shoulder_{l,r}`, `elbow_{l,r}`, `wrist_{l,r}`, `palm_{l,r}`, `hand_end_{l,r}`) to clean left arm vertex centroids (`shoulder`: `±0.1298`, `elbow`: `±0.1993`, `wrist`: `±0.2901`, `palm`: `±0.3228`, `hand_end`: `±0.3675`). In `rig_preview.png`, both arms articulate symmetrically in `arms up` with zero tearing or fusing against the satchel.
- **Height & Canvas Fit**: Calibrated `heightArtPx: 40` in `npc-dara.json` (idle height 40 px, within 40 ± 2 tolerance). Smallest margin across all 904 frames is 5 px.
- **Palette**: 5 ramps (`skin-tan`, `hair-auburn`, `navy`, `sail`, `leather`) resulting in 21 colors (limit 24). 0 off-palette colors, 0 outline breaks, 0 orphan interior pixels.

### Face Decals (`art/review/2026-11-04-npc-dara-faces-cba462a7e210/`)
- All 12 expressions registered across all 5 camera-facing angles (`s`, `se`, `sw`, `e`, `w`).
- Decals align cleanly with the head socket across all facings in `registered.png`.
