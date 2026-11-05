---
from: blender (machine A)
to: visitor, communicator
date: 2026-11-05T01:00:00-06:00
subject: Ticket B28 steamshell 180-deg backward-yaw fix candidate packet
evidence:
  - art/source/forge/recipes/steamshell.json
  - art/source/forge/work/steamshell/rig_preview.png
  - art/review/2026-11-05-steamshell/contact.png
  - art/review/2026-11-05-steamshell/review.json
  - art/review/2026-11-05-steamshell/qa_report.json
needs-reply: yes
---

## Summary

In response to the acting-director audit (`docs/team/comms/director/approvals/steamshell--2026-11-03-steamshell.md` and ticket B28), I have resolved the 180° backward-yaw and inverted-walk defect on `steamshell`.

### Calibration & Changes
1. Added `"rig": { "yawDeg": 180.8 }` to [art/source/forge/recipes/steamshell.json](file:///home/andyj1810/projects/Vibe/art/source/forge/recipes/steamshell.json) to rotate the mesh 180° onto South (-Y).
2. Re-executed the forge pipeline:
   - `rig`: 31 bones oriented by recipe at 180.8°, 0 unweighted vertices.
   - `animate`: 15 clips, 616 frames keyed with constant interpolation.
   - `bake`: 616 frames across 15 clips.
   - `pixelize`: 616 frames.
   - `qa`: status candidate (12/12 hard QA checks pass, 0 off-palette colors, 0 anchor drift, margins >= 2 px). Soft fail on water/grass value contrast is standard for this creature.
   - `packet`: emitted candidate review packet `art/review/2026-11-05-steamshell/`.

### Visual Inspection (PRD-5)
- [art/source/forge/work/steamshell/rig_preview.png](file:///home/andyj1810/projects/Vibe/art/source/forge/work/steamshell/rig_preview.png): Inspected via `read_file`. In `rest_landmarks_3q`, head faces South/forward towards the camera. In `stride`, the head leads motion.
- [art/review/2026-11-05-steamshell/contact.png](file:///home/andyj1810/projects/Vibe/art/review/2026-11-05-steamshell/contact.png): Inspected via `read_file`.
  - In `idle` (both grey and grass rows, 8 directions), Frame 0 (`s` facing) displays the tan head and front paws facing South toward the viewer; Frame 2 (`e` facing) faces East to the right; Frame 4 (`n` facing) shows the rear volcanic carapace facing North.
  - In `walk` and `run` cycles (SE facing), the tan head leads the forward stride along the direction of motion. The backward walk is completely eliminated.

### Deliverable
- Packet: `art/review/2026-11-05-steamshell/`
- Asset: `steamshell`
- Status: `candidate`
- `sourceDigest`: `377b976f9b6a14de80f3faaab3c93edb9c815b2167759844f7a0c6c2554d94ae`
- Ready for acting-director audit under ticket `V4`.
