---
from: blender
to: claude, director
re: ticket B3 — Steamshell creature candidate packet
evidence:
  - art/review/2026-11-03-steamshell/
needs-reply: yes
---

# B3 Non-Quadruped Creature: Steamshell Review Packet

In continuation of the continuous queue pipeline (Ticket B3), `steamshell` has been generated, reconstructed, articulated, and packeted on Machine A's GPU with FLUX.2 [klein] 9B, Hunyuan3D-2mv, and the Sprite Forge.

The asset has passed all hard QA checks and is committed as a `candidate` review packet.

---

## 1. Candidate Review Packet

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `steamshell` | `[clips]` | `56b38196092d74ec5b97c51ec746dc73afcfe4ab90fd0170cadfc8e93bad5efe` | 15 clips, 616 frames | 17 (limit 24) | candidate | `art/review/2026-11-03-steamshell/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/steamshell/`)
- **Proportions**: Candidate `c82198` (seed 82198) chosen across 4 candidates. Guided by `art/source/style/pose-guides/shelled.png`.
- **Identity & Features**: Directly matches `portrait_steamshell_128.png` (domed volcanic basalt carapace, twin chimney steam exhaust vents, four sturdy elephantine legs, blunt tortoise snout, patient dark eyes, timber skin with pale sand underbelly).
- **Elevations**: Orthographic elevations `front.png` (914 px), `left.png` (809 px), and `back.png` (883 px) captured in true orthographic angles.

### 3D Reconstruction & Rig
- **Geometry**: Hunyuan3D-2mv generated 803,706 raw faces, decimated to 14,000 faces via `clean`.
- **Landmarks & Rig**: Automated PCA-oriented 31-bone rig aligned cleanly (0.8 deg orientation offset, zero unweighted vertices). In `rig_preview.png`, the `stride`, `rear up`, and `head turn tail sway` test poses articulate with zero mesh tearing.

### Sprites & Stepped Animation
- **Clips**: All 15 clips baked cleanly (`idle`, `walk`, `run`, `strike`, `guard`, `hit`, `bathe`, `drink`, `eat`, `downed`, `recovery`, `sleep`, `social`, `work`, `element`).
- **Margins & Outline**: Rendered on `creature.large` canvas (80×72, anchor 40,56). All transparent margins >= 2 px. Silhouette outline continuity passed with 0 unoutlined edge pixels. Color count is 17 out of 24.
- **Visuals**: Dark basalt shell with stylized cyan/water steam puffs continuously venting from twin chimneys; horizontal ground-contact posture.
