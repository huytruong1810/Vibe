---
from: blender
to: communicator
re: ticket B21 (3 of 9) — npc:reed Aqualia grain farmer candidate packets (body + faces)
evidence:
  - art/review/2026-11-04-npc-reed/
  - art/review/2026-11-04-npc-reed-faces-f7a9b5e8997b/
needs-reply: yes
---

# B21 Aqualia Villager 3 of 9: Reed Candidate Review Packets

In execution of Ticket B21 (The 9 Aqualia Villagers), Reed (`npc:reed`), grain farmer, has completed end-to-end production through local FLUX.2 [klein] 9B generation, Hunyuan3D-2mv reconstruction, arm landmark calibration, and the Sprite Forge pipeline on Machine A.

Both body frames and sidecar face decals have passed all 12 hard QA checks and are committed as `candidate` review packets for Director review per Directive 015.

---

## 1. Candidate Review Packets

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `npc:reed` | `[body, clips]` | `bc77aa61a4b861fce5d3f9212151ebc313652adcbf13d595bc89c1ca70b166b1` | 18 clips, 904 frames | 21 (limit 24) | candidate | `art/review/2026-11-04-npc-reed/` |
| `npc:reed` | `[faces]` | `b0064443850085b4525f23055d81ba94a22c16a53d5203f4ae6b5aaf6976728a` | 12 expressions × 5 facings | 5 | candidate | `art/review/2026-11-04-npc-reed-faces-f7a9b5e8997b/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/npc-reed/`)
- **Proportions**: Candidate `c17331` (seed 17331) selected across 4 candidates. Measures 5 heads tall in standard adult build, guided by `art/source/style/pose-guides/human.png`.
- **Identity & Features**: Directly reflects the grain farmer identity: practical, optimistic demeanor, tousled honey-blonde hair matching portrait, warm sun-tanned skin, off-white linen work shirt with rolled sleeves, sturdy brown leather overalls with symmetrical Y-back strap, and mud-resistant cuffed timber boots.
- **Elevations**: Orthographic elevations `front.png` (1229 px) and `back.png` (1222 px) exceed the PRD-3.1 1024 px threshold.

### 3D Reconstruction & Rig Calibration
- **Geometry**: Hunyuan3D-2mv generated 304,532 raw faces in 174.6s, decimated to 14,000 faces in `clean`.
- **Arm Landmarks**: Calibrated explicit recipe landmarks (`shoulder_{l,r}`, `elbow_{l,r}`, `wrist_{l,r}`, `palm_{l,r}`, `hand_end_{l,r}`) to exact mesh centroids (`shoulder`: `±0.141`, `elbow`: `±0.227`, `wrist`: `±0.290`, `palm`: `±0.342`, `hand_end`: `±0.394`). In `rig_preview.png`, the `arms up` pose articulates symmetrically with zero mesh tearing.
- **Height & Canvas Fit**: Calibrated `heightArtPx: 40` in `npc-reed.json` (idle height 41 px with outline, within 40 ± 2 tolerance). Margin headroom across all 904 frames satisfies `smallest margin >= 2 px` (3 px on horizontal `downed/n` poses). Outline continuity passed with 0 unoutlined edge pixels.

### Face Decals (`art/review/2026-11-04-npc-reed-faces-f7a9b5e8997b/`)
- All 12 expressions (`neutral`, `warm`, `amused`, `curious`, `thoughtful`, `concerned`, `fearful`, `angry`, `sad`, `hurt`, `sleep`, `blink`) registered across all 5 camera-facing angles (`s`, `se`, `sw`, `e`, `w`).
- Decals align cleanly with the head socket across all facings in `registered.png`.
