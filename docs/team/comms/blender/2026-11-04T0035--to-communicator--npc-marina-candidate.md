---
from: blender
to: communicator
re: ticket B21 (2 of 9) — npc:marina Aqualia reed weaver & diver candidate packets (body + faces)
evidence:
  - art/review/2026-11-04-npc-marina/
  - art/review/2026-11-04-npc-marina-faces-d62dc6e48b8a/
needs-reply: yes
---

# B21 Aqualia Villager 2 of 9: Marina Candidate Review Packets

In execution of Ticket B21 (The 9 Aqualia Villagers), Marina (`npc:marina`), reed weaver and diver, has completed end-to-end production through local FLUX.2 [klein] 9B generation, Hunyuan3D-2mv reconstruction, and the Sprite Forge pipeline on Machine A.

Both body frames and sidecar face decals have passed all 12 hard QA checks and are committed as `candidate` review packets for Director review per Directive 015.

---

## 1. Candidate Review Packets

| Asset | Scope | Digest | Frame / Clip Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `npc:marina` | `[body, clips]` | `8cac69662aca5ced3dd5e35f1945c4ae323099d42c3a560aa1c8caf0220cd984` | 18 clips, 904 frames | 21 (limit 24) | candidate | `art/review/2026-11-04-npc-marina/` |
| `npc:marina` | `[faces]` | `0e9b9fe4833f368132c4fbb0abb1ac63e546b81a6b8a133de4be5782ad394e49` | 12 expressions × 5 facings | 5 | candidate | `art/review/2026-11-04-npc-marina-faces-d62dc6e48b8a/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/npc-marina/`)
- **Proportions**: Candidate `c15485` (seed 15485) selected across 4 candidates. Measures 5 heads tall in slender adult build, guided by `art/source/style/pose-guides/human.png`.
- **Identity & Features**: Directly reflects the reed weaver and diver identity: agile silhouette, long auburn hair secured in a practical braided ponytail, sun-warmed skin, sleeveless woven reed tunic cinched with a fine cord, teal diving leggings, and sand-toned moccasins.
- **Elevations**: Orthographic elevations `front.png` (1172 px) and `back.png` (1167 px) exceed the PRD-3.1 1024 px threshold.

### 3D Reconstruction & Rig Calibration
- **Geometry**: Hunyuan3D-2mv generated 277,568 raw faces in 158.5s, decimated to 14,000 faces in `clean`.
- **Rigging**: 69 bones auto-rigged cleanly. Sleeveless silhouette enabled smooth arm articulation in `rig_preview.png` with zero tearing.
- **Height & Canvas Fit**: Calibrated `heightArtPx: 40` in `npc-marina.json` (idle height 40 px with outline, within 40 ± 2 tolerance). Margin headroom across all 904 frames satisfies `smallest margin >= 2 px` (2 px on horizontal `downed/n` poses). Outline continuity passed with 0 unoutlined edge pixels.

### Face Decals (`art/review/2026-11-04-npc-marina-faces-d62dc6e48b8a/`)
- All 12 expressions (`neutral`, `warm`, `amused`, `curious`, `thoughtful`, `concerned`, `fearful`, `angry`, `sad`, `hurt`, `sleep`, `blink`) registered across all 5 camera-facing angles (`s`, `se`, `sw`, `e`, `w`).
- Decals align cleanly with the head socket across all facings in `registered.png` without edge bleeding.
