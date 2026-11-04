---
from: blender
to: communicator
re: ticket B21 (1 of 9) — npc:caelum Aqualia hydrologist and canal master candidate packets (body + faces)
evidence:
  - art/review/2026-11-04-npc-caelum/
  - art/review/2026-11-04-npc-caelum-faces-ac3d524b4397/
needs-reply: yes
---

# B21 Aqualia Villager 1 of 9: Caelum Candidate Review Packets

In execution of Ticket B21 (The 9 Aqualia Villagers), Caelum (`npc:caelum`), hydrologist and canal master, has completed end-to-end production through local FLUX.2 [klein] 9B generation, Hunyuan3D-2mv reconstruction, arm landmark calibration, and the Sprite Forge pipeline on Machine A.

Both body frames and sidecar face decals have passed all 12 hard QA checks and are committed as `candidate` review packets for Director review per Directive 015.

---

## 1. Candidate Review Packets

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `npc:caelum` | `[body, clips]` | `4b93b666744ff09f0e0a36260db3f4510621ec099e22549c4b34f67ba18949d2` | 18 clips, 904 frames | 17 (limit 24) | candidate | `art/review/2026-11-04-npc-caelum/` |
| `npc:caelum` | `[faces]` | `c9a31145c2bb1e3cf8aa05904a723549be31d1b599dd312afa6b98da0c1ddd33` | 12 expressions × 5 facings | 5 | candidate | `art/review/2026-11-04-npc-caelum-faces-ac3d524b4397/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/npc-caelum/`)
- **Proportions**: Candidate `c71017` (seed 71017) selected across 4 candidates. Measures 5 heads tall in standard adult build, guided by `art/source/style/pose-guides/human.png`.
- **Identity & Features**: Directly reflects the hydrologist and canal master identity: calm, measured demeanor, short ink-black hair with clean temples, tanned weathered skin, timber-brown oiled coat with notched lapel and belted back over a deep navy tunic, rugged canvas trousers, and tall waterproof wading boots with cuffed tops.
- **Elevations**: Orthographic elevations `front.png` (1216 px) and `back.png` (1208 px) exceed the PRD-3.1 1024 px threshold.

### 3D Reconstruction & Rig Calibration
- **Geometry**: Hunyuan3D-2mv generated 330,428 raw faces in 158.6s, decimated to 14,000 faces in `clean`.
- **Arm Landmarks**: Calibrated explicit recipe landmarks (`shoulder_{l,r}`, `elbow_{l,r}`, `wrist_{l,r}`, `palm_{l,r}`, `hand_end_{l,r}`) to exact mesh centroids. In `rig_preview.png`, the `arms up` pose articulates symmetrically with zero mesh tearing or spikes.
- **Height & Canvas Fit**: Calibrated `heightArtPx: 40` (idle height 41 px with outline, within 40 ± 2 tolerance). Margin headroom across all 904 frames satisfies `smallest margin >= 2 px` (including wide action poses `downed`, `guard`, `spear_thrust`). Outline continuity passed with 0 unoutlined edge pixels.

### Face Decals (`art/review/2026-11-04-npc-caelum-faces-ac3d524b4397/`)
- All 12 expressions (`neutral`, `warm`, `amused`, `curious`, `thoughtful`, `concerned`, `fearful`, `angry`, `sad`, `hurt`, `sleep`, `blink`) registered across all 5 camera-facing angles (`s`, `se`, `sw`, `e`, `w`).
- Decals sit naturally on the facial plane below the hair fringe with zero silhouette overhang.
