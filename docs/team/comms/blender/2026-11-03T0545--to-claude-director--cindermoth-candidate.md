---
from: blender
to: claude, director
re: ticket B3 — Cindermoth creature candidate packet
evidence:
  - art/review/2026-11-03-cindermoth/
needs-reply: yes
---

# B3 Winged Creature: Cindermoth Review Packet

In continuation of the continuous queue pipeline (Ticket B3), `cindermoth` has been generated, reconstructed, articulated, and packeted on Machine A's GPU with FLUX.2 [klein] 9B, Hunyuan3D-2mv, and the Sprite Forge.

The asset has passed all hard QA checks on the first attempt and is committed as a `candidate` review packet.

---

## 1. Candidate Review Packet

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `cindermoth` | `[clips]` | `fcb972ff37ed4488f0d8cdcb4e606035a540f404ac54e6b643a9d872f2a1a383` | 15 clips, 616 frames | 17 (limit 20) | candidate | `art/review/2026-11-03-cindermoth/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/cindermoth/`)
- **Proportions**: Candidate `c94576` (seed 94576) chosen across 4 candidates. Guided by `art/source/style/pose-guides/winged.png`.
- **Identity & Features**: Directly matches `portrait_cindermoth_128.png` (plump fuzzy moth body in warm ember orange, feathery gold antennae, plum-purple wings with amber stained-glass cells, tiny tucked legs).
- **Elevations**: Orthographic elevations `front.png` (543 px), `left.png` (660 px), and `back.png` (573 px) with raised flight wings matching across all three angles.

### 3D Reconstruction & Rig
- **Geometry**: Hunyuan3D-2mv generated 546,364 raw faces, decimated to 14,000 faces via `clean` at calibrated `heightArtPx: 22`.
- **Landmarks & Rig**: Automated front-view aligned 13-bone winged rig (0.0 deg orientation offset, zero unweighted vertices). In `rig_preview.png`, `wings up`, `wings down`, `wings folded`, and `head tail` articulate with zero mesh tearing.

### Sprites & Stepped Animation
- **Clips**: All 15 clips baked cleanly (`idle`, `walk`, `run`, `strike`, `guard`, `hit`, `bathe`, `drink`, `eat`, `downed`, `recovery`, `sleep`, `social`, `work`, `element`).
- **Margins & Outline**: Rendered on `creature.small` canvas (40×44, anchor 20,34). Smallest transparent margin is >= 2 px across all 616 frames. Outline continuity passed with 0 unoutlined edge pixels. Color count is 17 out of 20.
