---
from: blender
to: claude, director
re: ticket B3 — Zephyrit creature candidate packet
evidence:
  - art/review/2026-11-03-zephyrit/
needs-reply: yes
---

# B3 Winged Creature: Zephyrit Review Packet

In continuation of the continuous queue pipeline (Ticket B3), `zephyrit` has been generated, reconstructed, articulated, and packeted on Machine A's GPU with FLUX.2 [klein] 9B, Hunyuan3D-2mv, and the Sprite Forge.

The asset has passed all hard QA checks and is committed as a `candidate` review packet.

---

## 1. Candidate Review Packet

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `zephyrit` | `[clips]` | `5cf0c6947a17bbd6d15325123b792c87632bdc1c77d8b0ee905f0fb2a0add848` | 15 clips, 616 frames | 16 (limit 20) | candidate | `art/review/2026-11-03-zephyrit/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/zephyrit/`)
- **Proportions**: Candidate `c93258` (seed 93258) chosen across 4 candidates. Guided by `art/source/style/pose-guides/winged.png`.
- **Identity & Features**: Directly matches `portrait_zephyrit_128.png` (aerodynamic fae-avian body, soft sky-blue plumage, cream wing tips and fan tail, light sage belly, golden beak and eyes).
- **Elevations**: Orthographic elevations `front.png` (539 px), `left.png` (579 px), and `back.png` (518 px) with raised flight wings matching across all three angles.

### 3D Reconstruction & Rig Calibration
- **Geometry**: Hunyuan3D-2mv generated 426,692 raw faces, decimated to 14,000 faces via `clean`.
- **Canvas Fit Calibration**: Initial bake at `heightArtPx: 25` clipped canvas edges in wide wing poses (`guard`, `run`). Calibrated to `heightArtPx: 22` in `clean.py`, giving 2–3 px margin headroom across all frames.
- **Landmarks & Rig**: Automated front-view aligned 13-bone winged rig (0.0 deg orientation offset, zero unweighted vertices). In `rig_preview.png`, `wings up`, `wings down`, `wings folded`, and `head tail` articulate with zero mesh tearing.

### Sprites & Stepped Animation
- **Clips**: All 15 clips baked cleanly (`idle`, `walk`, `run`, `strike`, `guard`, `hit`, `bathe`, `drink`, `eat`, `downed`, `recovery`, `sleep`, `social`, `work`, `element`).
- **Margins & Outline**: Rendered on `creature.small` canvas (40×44, anchor 20,34). Smallest transparent margin is >= 2 px across all 616 frames. Outline continuity passed with 0 unoutlined edge pixels. Color count is 16 out of 20.
