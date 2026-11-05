---
from: blender
to: communicator
re: ticket B21 (4 of 9) — npc:willa Aqualia wetland herbalist candidate packets (body + faces)
evidence:
  - art/review/2026-11-04-npc-willa/
  - art/review/2026-11-04-npc-willa-faces-dd497665323e/
needs-reply: yes
---

# B21 Aqualia Villager 4 of 9: Willa Candidate Review Packets

In execution of Ticket B21 (The 9 Aqualia Villagers), Willa (`npc:willa`), wetland herbalist, has completed end-to-end production through local FLUX.2 [klein] 9B generation, Hunyuan3D-2mv reconstruction, arm landmark calibration, and the Sprite Forge pipeline on Machine A.

Both body frames and sidecar face decals have passed all 12 hard QA checks and are committed as `candidate` review packets for Director review per Directive 015.

---

## 1. Candidate Review Packets

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `npc:willa` | `[body, clips]` | `e0c558c009bef75581a0b23475a88b80ca52dde83d7bba3ca9474a0aad776393` | 18 clips, 904 frames | 17 (limit 24) | candidate | `art/review/2026-11-04-npc-willa/` |
| `npc:willa` | `[faces]` | `b72bdb69f3c49324dfe9a765f96e3c5b70a3281fcdae5cd65eedbf01d8cd4e61` | 12 expressions × 5 facings | 5 | candidate | `art/review/2026-11-04-npc-willa-faces-dd497665323e/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/npc-willa/`)
- **Proportions**: Candidate `c18454` (seed 18454) selected across 4 candidates. Measures 5 heads tall in slender adult build, guided by `art/source/style/pose-guides/human.png`.
- **Identity & Features**: Directly reflects the wetland herbalist identity: poised, observant demeanor, straight dark ink hair tied into a neat low knot, tan skin, layered moss-green wrap-robe with deep pockets and spiral hem pattern, embroidered plum sash with gold vine knot, dark leggings, and cuffed brown leather field boots.
- **Elevations**: Orthographic elevations `front.png` (1222 px) and `back.png` (1216 px) exceed the PRD-3.1 1024 px threshold.

### 3D Reconstruction & Rig Calibration
- **Geometry**: Hunyuan3D-2mv generated 346,082 raw faces in 261.2s, decimated to 14,000 faces in `clean`.
- **Arm Landmarks**: Calibrated explicit recipe landmarks (`shoulder_{l,r}`, `elbow_{l,r}`, `wrist_{l,r}`, `palm_{l,r}`, `hand_end_{l,r}`) to exact mesh centroids (`shoulder`: `±0.149`, `elbow`: `±0.213`, `wrist`: `±0.289`, `palm`: `±0.336`, `hand_end`: `±0.384`). In `rig_preview.png`, the `arms up` pose articulates symmetrically with wide sleeves draping naturally and zero mesh tearing.
- **Height & Canvas Fit**: Calibrated `heightArtPx: 38` in `npc-willa.json` (idle height 40 px with outline, within 38 ± 2 tolerance). Margin headroom across all 904 frames satisfies `smallest margin >= 2 px` (2 px on horizontal `downed/n` poses). Outline continuity passed with 0 unoutlined edge pixels.

### Face Decals (`art/review/2026-11-04-npc-willa-faces-dd497665323e/`)
- All 12 expressions (`neutral`, `warm`, `amused`, `curious`, `thoughtful`, `concerned`, `fearful`, `angry`, `sad`, `hurt`, `sleep`, `blink`) registered across all 5 camera-facing angles (`s`, `se`, `sw`, `e`, `w`).
- Decals align cleanly with the head socket across all facings in `registered.png`.
