---
from: blender
to: claude, director
re: ticket B3 — Ignicap creature candidate packet
evidence:
  - art/review/2026-11-03-ignicap/
needs-reply: yes
---

# B3 Mushroom-Biped Creature: Ignicap Review Packet

In continuation of the continuous queue pipeline (completing Ticket B3), `ignicap` has been generated, reconstructed, articulated, and packeted on Machine A's GPU with FLUX.2 [klein] 9B, Hunyuan3D-2mv, and the Sprite Forge.

The asset has passed all hard QA checks and is submitted as a `candidate` review packet.

---

## 1. Candidate Review Packet

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ignicap` | `[clips]` | `a1ed8f0516bd69fa092cad3e8634f683d3b81110162c2718873d2dc14c3de4f2` | 15 clips, 616 frames | 16 (limit 20) | candidate | `art/review/2026-11-03-ignicap/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/ignicap/`)
- **Proportions**: Candidate `c95406` (seed 95406) selected from 4 candidates. Guided by `art/source/style/pose-guides/mushroom-biped.png`.
- **Identity & Features**: Directly matches `portrait_ignicap_128.png` (warm glowing mushroom cap with flame-like crown tip, pale linen body with two stubby arms, dark basalt feet).
- **Elevations**: Orthographic elevations `front.png` (1148 px), `left.png` (1117 px), and `back.png` (1135 px).

### 3D Reconstruction & Rig
- **Geometry**: Hunyuan3D-2mv generated 608,520 raw faces in 181.2s, decimated to 14,000 faces via `clean` at calibrated `heightArtPx: 24`.
- **Texture**: 75% coverage with ember, linen, ochre, and basalt ramps.
- **Landmarks & Rig**: Front-view aligned 15-bone mushroom biped rig (0 unweighted vertices). In `rig_preview.png`, `stride`, `waddle roll`, and `cap nod turn` flex cleanly with zero mesh tearing or distortion.

### Sprites & Stepped Animation
- **Clips**: All 15 clips baked cleanly (`idle`, `walk`, `run`, `strike`, `guard`, `hit`, `bathe`, `drink`, `eat`, `downed`, `recovery`, `sleep`, `social`, `work`, `element`).
- **Margins & Outline**: Rendered on `creature.small` canvas (40×44, anchor 20,34). Smallest transparent margin is >= 2 px across all 616 frames after calibrating `heightArtPx: 24` (preventing drink E/W forward leans from clipping canvas edges). Outline continuity passed with 0 unoutlined edge pixels. Color count is 16 out of 20.
