---
from: blender
to: claude, director
re: ticket B4 / B16 — Neris human golden companion candidate packets (body + face decals)
evidence:
  - art/review/2026-11-03-npc-neris/
  - art/review/2026-11-03-npc-neris-faces-9eda4cbedf2f/
needs-reply: yes
---

# B4 Golden Human Companion: Neris Review Packets

In continuation of the continuous queue pipeline (B16 / B4), Neris (`npc:neris`) has been generated, reconstructed, articulated, and packeted on Machine A's GPU with FLUX.2 [klein] 9B, Hunyuan3D-2mv, and the Sprite Forge.

Both body frames and sidecar face decals have passed all hard QA checks and are committed as `candidate` review packets.

---

## 1. Candidate Review Packets

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `npc:neris` | `[body, clips]` | `4262b8bf2f1bd6a1424a124f4365325cb10875729fb37bb347874da75d96cab2` | 18 clips, 904 frames | 21 (limit 24) | candidate | `art/review/2026-11-03-npc-neris/` |
| `npc:neris` | `[faces]` | `4df2fcecb1f10d50dd46439141d220c32e6efa932060b3fb8ff054d89c2c5c0a` | 12 expressions × 5 facings | 5 | candidate | `art/review/2026-11-03-npc-neris-faces-9eda4cbedf2f/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/npc-neris/`)
- **Proportions**: Candidate `c72285` (seed 72285) chosen across 4 candidates. Measures 5 heads tall in elder build with stoic posture, guided by `art/source/style/pose-guides/human.png`.
- **Identity & Features**: Directly matches `portrait_npc_neris_128.png` (high collar, asymmetrical double-breasted quilted moss vest with chest key clasp, neat silver hair with low bun, navy sleeves, brown leather boots).
- **Elevations**: Orthographic elevations `front.png` (1175 px) and `back.png` (1168 px) exceed the PRD-3.1 1024 px floor.

### 3D Reconstruction & Rig Calibration
- **Geometry**: Hunyuan3D-2mv generated 302,624 raw faces, cleaned to 13,998 faces.
- **Landmarks**: Auto-detection placed arm bones slightly asymmetrical; explicit recipe landmarks (`shoulder_{l,r}`, `elbow_{l,r}`, `wrist_{l,r}`, `palm_{l,r}`, `hand_end_{l,r}`) were calibrated from mesh centroids. In `rig_preview.png`, the `arms up` pose articulates cleanly with zero mesh tearing.
- **Height Target**: Set `heightArtPx: 44` (matching elder build's 52 px crown ratio vs standard 56 px). Resulting idle height is 45 px with outline (within target 44 ± 2).

### Sprites & Stepped Animation
- **Clips**: All 18 clips baked cleanly (locomotion: `walk`, `run`; combat: `strike`, `bow_shot`, `spear_thrust`, `sword_slash`, `guard`, `hit`; living: `idle`, `bathe`, `drink`, `eat`, `downed`, `recovery`, `sleep`, `social`, `work`, `element`).
- **Margins & Outline**: Transparent margin minimum across all 904 frames is 2 px. Silhouette outline continuity passed with 0 unoutlined edge pixels. Color count is 21 out of 24.

### Face Decals (`art/review/2026-11-03-npc-neris-faces-9eda4cbedf2f/`)
- All 12 expressions (`neutral`, `warm`, `amused`, `curious`, `thoughtful`, `concerned`, `fearful`, `angry`, `sad`, `hurt`, `sleep`, `blink`) registered across all 5 camera-facing angles (`s`, `se`, `sw`, `e`, `w`).
- Decals sit below the silver hair fringe on the facial volume with zero silhouette overhang.
