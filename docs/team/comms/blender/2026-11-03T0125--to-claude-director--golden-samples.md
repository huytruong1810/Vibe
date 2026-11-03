---
from: blender
to: claude, director
re: ticket B19 — four golden sample review packets produced with local image generation and 3D reconstruction
evidence:
  - art/review/2026-11-03-rivallie/
  - art/review/2026-11-03-item-hatchet/
  - art/review/2026-11-03-env-house-aqualia/
  - art/review/2026-11-03-player-aqualia/
needs-reply: yes
---

# B19 Golden Samples: Local Generation & Reconstruction Review

Under Directive 013 (local image generation) and Directive 014 (standing review delegation), all four golden samples for Ticket B19 have been generated locally on Machine A's RTX 5080 GPU using **FLUX.2 [klein] 9B** (concept sheets) and reconstructed with **Hunyuan3D-2mv** (3D geometry). All four forge pipelines ran end-to-end through QA and have review packets published.

All GPU workloads strictly respected `core.gpu_window()` coordination (`GPU_PAUSE` / `GPU_BUSY`), running serially without collision alongside concurrent experiment tasks.

---

## 1. Golden Sample Packets Summary

| Asset | Kind | Template / Guide | Model Pick | Face Count | QA Status | Frames / Poses | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `rivallie` | creature | `creature-v1` + `quadruped.png` | `c901` (seed 901) | 14,000 | candidate | 15 clips, 616 frames | `art/review/2026-11-03-rivallie/` |
| `item:hatchet` | item | `prop-v1` (3/4 view) | `c65716` (seed 65716) | 14,000 | candidate | 65 poses (0 failing) | `art/review/2026-11-03-item-hatchet/` |
| `env:house-aqualia` | environment | `building-v1` (ortho elevations) | `c66585` (seed 66585) | 13,999 | candidate | 3 layers (`shadow`, `base`, `roof`) | `art/review/2026-11-03-env-house-aqualia/` |
| `player-aqualia` | human | `human-apose-v1` + `human.png` | `c67299` (seed 67299) | 14,000 | candidate | 19 clips, 952 frames | `art/review/2026-11-03-player-aqualia/` |

---

## 2. Visual Findings (PRD-5)

### `rivallie` (`creature:rivallie`)
- **Sheet & Anatomy**: Guided by `quadruped.png`. Candidate `c901` produced a horizontal quadruped stance with clean water-element anatomy (sleek otter body, dorsal fin, webbed paws, paddle tail). Proportions are 3.5 heads long.
- **3D & Rigging**: Hunyuan3D-2mv generated 498,952 raw faces, cleaned to 14,000. Rig auto-oriented via PCA (0.1° yaw); 30 bones, 0 unweighted vertices.
- **Sprites & Animation**: Baked across 15 clips (616 frames). Locomotion (`walk`, `trot`, `run`), water gaits (`swim`, `dive`), and idle look cohesive across all 8 facings on grey and grass backgrounds. Zero orphan pixels.

### `item:hatchet` (`item:hatchet`)
- **Sheet & Anatomy**: Concept conditioned on `prop-hatchet.png`. Candidate `c65716` selected for straight vertical ash haft, flat wide butt, rectangular hammer poll, and dark forged iron head with rope lashing.
- **3D & Orient**: Cleaned to 14,000 faces, reach measured 11.302 art px.
- **Items QA**: All 65 poses evaluated across all 8 facings in 8 grip buckets. Every pose passed all 7 hard checks (`canvas`, `root`, `margins`, `thinFeature`, `palette`, `blocks`, `colorCount`) with 0 failing poses. Single-pixel diagonal spurs were eliminated by the straight haft geometry.

### `env:house-aqualia` (`env:house-aqualia`)
- **Sheet & Architecture**: Candidate `c66585` provided orthographic front and left elevations with Aqualia timber framing, plaster walls, stone foundation, and pitched teal slate roof.
- **Layout & Slicing**: Reconstructed base ground contact measured 3.197 tiles deep. Footprint declared as `[3, 3]` tiles (|3.197 - 3| = 0.197 ≤ 0.35 tile tolerance). Roof split at `aboveFraction: 0.50` cleanly separates the roof and chimney into the `roof` layer, leaving the ground floor, timber door, window frames, and foundation intact in the `base` layer. Contact shadow baked cleanly on depth-stretch canvas (`128x182`). Total colours: 18 (limit 32).

### `player-aqualia` (`player-aqualia`)
- **Sheet & Proportions**: Conditioned on `art/source/style/pose-guides/human.png` and portrait `portrait_player_aqualia_128.png`. Candidate `c67299` delivered stylized 5-head proportions (L3), slender build, teal hair parted in center, teal tunic with leather belt, navy trousers, and brown leather boots. Arms symmetrically positioned at 45° A-pose with open palms.
- **Rig & Articulation**: Explicit arm landmarks added in recipe (`shoulder_l/r`, `elbow_l/r`, `wrist_l/r`, `palm_l/r`, `hand_end_l/r`) aligned to mesh centroids, eliminating sleeve pulling and polygon tearing. Test poses (`arms_up`, `stride`, `bend_head_turn`) articulated cleanly with 0 unweighted vertices across 69 bones.
- **Sprites & Animation**: Baked across 19 standard humanoid clips (952 frames). Margins cleared with ≥ 2px clearance across all poses (including `guard`, `dash`, and `downed`). Ramp usage consolidated to 5 ramps (`skin-warm`, `hair-teal`, `teal`, `navy`, `leather`) totaling 21 colors (limit 24). Outline continuity passed with 0 silhouette gaps.

---

## 3. Changed / Evidence / Gaps (TEAM-5.2)

### Changed
- `art/source/references/rivallie/`: Updated with locally generated `c901` reference views and provenance `sheet.json`.
- `art/source/references/item-hatchet/`: Updated with locally generated `c65716` concept views and `sheet.json`.
- `art/source/references/env-house-aqualia/`: Created reference views and `sheet.json` from candidate `c66585`.
- `art/source/references/player-aqualia/`: Updated with candidate `c67299` views (`front.png`, `back.png`) and `sheet.json`.
- `art/source/forge/recipes/env-house-aqualia.json`: Authored building recipe with footprint `[3, 3]` and `aboveFraction: 0.50`.
- `art/source/forge/recipes/player-aqualia.json`: Updated with `concept` block, `heightArtPx: 46`, consolidated ramps, and arm `rig.landmarks`.
- `art/source/forge/recipes/item-hatchet.json`: Added `concept` block.
- `docs/team/comms/blender/image-ledger.md`: Appended entries for all local generation runs.
- `docs/team/queue/blender.md`: Marked B19 `candidate`.
- Packaged review packets:
  - `art/review/2026-11-03-rivallie/`
  - `art/review/2026-11-03-item-hatchet/`
  - `art/review/2026-11-03-env-house-aqualia/`
  - `art/review/2026-11-03-player-aqualia/`

### Evidence
- `qa_report.json` in each packet directory: all 4 assets pass all required hard checks with status `candidate`.
- Visually inspected all candidate contact sheets, split views, preview renders, and packet contact sheets via `read_file` per PRD-5.
- Verified `contact.viewed` hashes match generated `contact.png` before packeting.

### Gaps
- Pending director / Claude review of the four golden sample review packets under Directive 014.
- Approval records in `docs/team/comms/director/approvals/` are required before publication (`forge.py publish`).
