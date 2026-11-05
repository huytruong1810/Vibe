---
from: blender
to: communicator
re: ticket B21 (6 of 9) — npc:mira Aqualia river wildlife surveyor candidate packets (body + faces)
evidence:
  - art/review/2026-11-04-npc-mira/
  - art/review/2026-11-04-npc-mira-faces-578b995683a6/
needs-reply: yes
---

# B21 Aqualia Villager 6 of 9: Mira Candidate Review Packets

In execution of Ticket B21 (The 9 Aqualia Villagers), Mira (`npc:mira`), river wildlife surveyor, has completed end-to-end production through local FLUX.2 [klein] 9B generation, Hunyuan3D-2mv reconstruction, arm landmark calibration, and the Sprite Forge pipeline on Machine A.

Both body frames and sidecar face decals have passed all 12 hard QA checks on the first pass and are committed as `candidate` review packets for Director review per Directive 015.

---

## 1. Candidate Review Packets

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `npc:mira` | `[body, clips]` | `abea5010ada30ddf18fdeeff8a619d80fcf5862282b456cb18fc6bab591ddb4b` | 18 clips, 904 frames | 21 (limit 24) | candidate | `art/review/2026-11-04-npc-mira/` |
| `npc:mira` | `[faces]` | `02d2e1d7ae21f2906721c6c3f7f6d09752458013cd57b504100daf8cc22cce8f` | 12 expressions × 5 facings | 5 | candidate | `art/review/2026-11-04-npc-mira-faces-578b995683a6/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/npc-mira/`)
- **Proportions**: Candidate `c25513` (seed 25513) selected across 4 candidates. Measures 5 heads tall in slender nimble adult build, guided by `art/source/style/pose-guides/human.png`.
- **Identity & Features**: Slender young adult female, porcelain skin, neat chin-length dark ink hair with teal feather clips behind ear, bright blue eyes, wearing a teal river surveyor vest with utility flap pockets over a light tunic, pale sand canvas trousers, and flexible brown leather field boots.
- **Elevations**: Orthographic elevations `front.png` (1226 px) and `back.png` (1223 px) exceed the PRD-3.1 1024 px threshold.

### 3D Reconstruction & Rig Calibration
- **Geometry**: Hunyuan3D-2mv generated 269,896 raw faces in 277.9s, decimated to 14,000 faces in `clean`.
- **Rigging**: Auto-rig detected clean arm chains (`shoulder`: `±0.124`, `elbow`: `±0.160`, `wrist`: `±0.226`, `palm`: `±0.269`, `hand_end`: `±0.284`). In `rig_preview.png`, the `arms up` pose articulates symmetrically with zero tearing or torso distortion.
- **Height & Canvas Fit**: Calibrated `heightArtPx: 40` in `npc-mira.json` (idle height 40 px with outline). Smallest margin across all 904 frames is 3 px.
- **Palette**: 5 ramps (`skin-porcelain`, `hair-ink`, `vest: teal`, `trousers: sand`, `boots: leather`) resulting in 21 colors (limit 24). 0 off-palette colors, 0 outline breaks.

### Face Decals (`art/review/2026-11-04-npc-mira-faces-578b995683a6/`)
- All 12 expressions registered across all 5 camera-facing angles (`s`, `se`, `sw`, `e`, `w`).
- Decals align cleanly with the head socket across all facings in `registered.png`.
