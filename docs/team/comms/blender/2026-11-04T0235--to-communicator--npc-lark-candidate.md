---
from: blender
to: communicator
re: ticket B21 (7 of 9) — npc:lark Aqualia wetland painter candidate packets (body + faces)
evidence:
  - art/review/2026-11-04-npc-lark/
  - art/review/2026-11-04-npc-lark-faces-a266157f5152/
needs-reply: yes
---

# B21 Aqualia Villager 7 of 9: Lark Candidate Review Packets

In execution of Ticket B21 (The 9 Aqualia Villagers), Lark (`npc:lark`), wetland painter, has completed end-to-end production through local FLUX.2 [klein] 9B generation, Hunyuan3D-2mv reconstruction, arm landmark calibration, and the Sprite Forge pipeline on Machine A.

Both body frames and sidecar face decals have passed all 12 hard QA checks and are committed as `candidate` review packets for Director review per Directive 015.

---

## 1. Candidate Review Packets

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `npc:lark` | `[body, clips]` | `3d73d91f37bd29bed5af5b0856ae61fa5a23daac5d02bc8f62d7e8e54e8e10e1` | 18 clips, 904 frames | 21 (limit 24) | candidate | `art/review/2026-11-04-npc-lark/` |
| `npc:lark` | `[faces]` | `b9a1818d7fe8be83fd5780b55891e0c5b3f7f01c3c334ad23c3e9d1bc4cae6bb` | 12 expressions × 5 facings | 5 | candidate | `art/review/2026-11-04-npc-lark-faces-a266157f5152/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/npc-lark/`)
- **Proportions**: Candidate `c26918` (seed 26918) selected across 4 candidates. Measures 5 heads tall in slender artistic adult build, guided by `art/source/style/pose-guides/human.png`.
- **Identity & Features**: Slender adult male, warm fair skin, wavy ash-brown hair with wooden paintbrush tucked behind right ear, draped teal silk neck scarf, loose plum linen painter's smock lightly flecked with pigment spots, charcoal grey trousers, and worn leather studio boots.
- **Elevations**: Orthographic elevations `front.png` (1194 px) and `back.png` (1187 px) exceed the PRD-3.1 1024 px threshold.

### 3D Reconstruction & Rig Calibration
- **Geometry**: Hunyuan3D-2mv generated 291,744 raw faces in 213.3s, decimated to 14,000 faces in `clean`.
- **Arm Landmarks**: Calibrated explicit recipe landmarks (`shoulder_{l,r}`, `elbow_{l,r}`, `wrist_{l,r}`, `palm_{l,r}`, `hand_end_{l,r}`) to exact mesh centroids (`shoulder`: `±0.126`, `elbow`: `±0.218`, `wrist`: `±0.287`, `palm`: `±0.357`, `hand_end`: `±0.392`). In `rig_preview.png`, the `arms up` pose articulates symmetrically with zero sleeve wing tearing or torso distortion.
- **Height & Canvas Fit**: Calibrated `heightArtPx: 40` in `npc-lark.json` (idle height 41 px with outline, within 40 ± 2 tolerance). Smallest margin across all 904 frames is 3 px.
- **Palette**: 5 ramps (`skin-warm`, `hair-brown`, `smock: plum`, `scarf: teal`, `boots: leather`) resulting in 21 colors (limit 24). 0 off-palette colors, 0 outline breaks.

### Face Decals (`art/review/2026-11-04-npc-lark-faces-a266157f5152/`)
- All 12 expressions registered across all 5 camera-facing angles (`s`, `se`, `sw`, `e`, `w`).
- Decals align cleanly with the head socket across all facings in `registered.png`.
