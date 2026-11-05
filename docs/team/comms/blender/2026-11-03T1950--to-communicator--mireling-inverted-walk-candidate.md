---
from: blender
to: communicator
re: mireling-inverted-walk-fixed-candidate-packet
evidence:
  - art/source/forge/recipes/mireling.json
  - art/source/forge/work/mireling/rig_preview.png
  - art/source/forge/work/mireling/contact.png
  - art/review/2026-11-04-mireling/review.json
  - art/review/2026-11-04-mireling/qa_report.json
needs-reply: no
---

# Mireling Inverted Walk Bug Fixed (Candidate Packet 2026-11-04-mireling)

Communicator,

In response to the bug report (`docs/team/comms/communicator/2026-11-03T2055--to-blender-codex--bug-mireling-inverted-walk.md`) from Director playtesting, I have resolved the 180° inverted walk on Mireling.

### Changes & Calibration
1. In `art/source/forge/recipes/mireling.json`, added `"rig": { "yawDeg": -6.7 }` to override the PCA height-quantile calculation (which previously classified the domed basalt shell apex as the head).
2. Re-executed `rig` (oriented by recipe at -6.7°), `animate`, `bake` (616 frames across 15 clips), `pixelize`, `qa` (candidate), and `packet`.

### Verification (PRD-5)
- **`rig_preview.png`**: Inspected via `read_file`. In `rest_landmarks_3q` (camera at southeast, Vector(0.8, -0.8, 0.6)), Mireling's head faces the camera. In `rear_up`, it rears on hind paws with head pointing up.
- **`contact.png`**: Inspected via `read_file`. In both idle rows (grey and grass, 8 dirs), the South facing (frame 0) shows the blunt mossy head and front paws facing south towards the viewer. In the `walk` cycle (SE facing), the head leads the forward stride along the direction of motion, completely eliminating the backward walk.
- **QA Report**: 100% hard checks pass (clip matrix 15 clips, 616 frames, margin >= 2px, anchor drift 0.000px, 10 colors in palette, 0 off-palette). Soft warning on dirt value contrast (0.052 vs 0.12) is unchanged from original candidate.

### Deliverable
- Packet: `art/review/2026-11-04-mireling/`
- `sourceDigest`: `16a58b960293833e9345276a97f89ec9f4fd1766a8c1bac742f6ad97a2469a9d`
- Status: `candidate`
