---
from: blender
to: communicator
re: ticket B21 (9 of 9) — npc:finn Aqualia canal apprentice candidate packets (body + faces)
evidence:
  - art/review/2026-11-04-npc-finn/
  - art/review/2026-11-04-npc-finn-faces-989d5e97e3b4/
needs-reply: yes
---

# B21 Aqualia Villager 9 of 9: Finn Candidate Review Packets

In execution of Ticket B21 (The 9 Aqualia Villagers), Finn (`npc:finn`), canal apprentice, has completed end-to-end production through local FLUX.2 [klein] 9B generation, Hunyuan3D-2mv reconstruction, and the Sprite Forge pipeline on Machine A.

Both body frames and sidecar face decals have passed all 12 hard QA checks and are committed as `candidate` review packets for Director review per Directive 015.

With Finn complete, all 9 of the 9 Aqualia villagers under Ticket B21 (`npc:caelum`, `npc:marina`, `npc:reed`, `npc:willa`, `npc:oren`, `npc:mira`, `npc:lark`, `npc:dara`, `npc:finn`) have reached `candidate` status with full body clip matrices (18 clips, 904 frames each) and registered sidecar face layers (12 expressions × 5 facings each).

---

## 1. Candidate Review Packets

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `npc:finn` | `[body, clips]` | `a96db3852d21e6f7a5b29ef51015f579bd24c34b3d0d9e0fe0e79aad385384dc` | 18 clips, 904 frames | 17 (limit 24) | candidate | `art/review/2026-11-04-npc-finn/` |
| `npc:finn` | `[faces]` | `13369611d3462024554dbc4ae6d4171783e13b601afe95886d8b4269b74a97b2` | 12 expressions × 5 facings | 5 | candidate | `art/review/2026-11-04-npc-finn-faces-989d5e97e3b4/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/npc-finn/`)
- **Proportions**: Candidate `c29361` (seed 29361) selected across 4 candidates. Measures 5 heads tall in youthful canal apprentice build, guided by `art/source/style/pose-guides/human.png`.
- **Identity & Features**: Young adult male, warm freckled skin, tousled chestnut-brown hair, expressive hazel-green eyes, teal work shirt with popped collar and rolled-up sleeves, knotted light sky-blue neckerchief, brown leather crossed suspenders, brown trousers with cuffed hems, and laced leather work boots.
- **Elevations**: Orthographic elevations `front.png` (1251 px) and `back.png` (1230 px) exceed the PRD-3.1 1024 px threshold.

### 3D Reconstruction & Rig
- **Geometry**: Hunyuan3D-2mv generated 290,944 raw faces in 217.4s, decimated to 14,000 faces in `clean`.
- **Rig & Articulation**: Clean symmetric A-pose allowed automatic bone placement (69 bones, 0 unweighted vertices). In `rig_preview.png`, `arms up` raises smoothly with zero tearing or shoulder stretching, stride pose steps cleanly, and torso bend/head turn deform without pinching.
- **Height & Canvas Fit**: Calibrated `heightArtPx: 40` in `npc-finn.json` (idle height 41 px with outline, within 40 ± 2 tolerance). Smallest margin across all 904 frames is 4 px.
- **Palette**: 5 ramps (`skin-warm`, `hair-brown`, `shirt: teal`, `neckerchief: sky`, `leather`) resulting in 17 colors (limit 24). 0 off-palette colors, 0 outline breaks, 0 orphan interior pixels.

### Face Decals (`art/review/2026-11-04-npc-finn-faces-989d5e97e3b4/`)
- All 12 expressions registered across all 5 camera-facing angles (`s`, `se`, `sw`, `e`, `w`).
- Decals align cleanly with the head socket across all facings in `registered.png`.
