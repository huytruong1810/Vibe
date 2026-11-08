---
asset: steamshell
packet: art/review/2026-11-03-steamshell/
packetDigest: 56b38196092d74ec5b97c51ec746dc73afcfe4ab90fd0170cadfc8e93bad5efe
decision: changes-requested
scope: [body, clips]
date: 2026-11-05
recordedBy: visitor acting as director under TEAM-4.2 (directive 017)
superseded-by: steamshell--2026-11-05-steamshell.md
---

Visual audit of art/review/2026-11-03-steamshell/contact.png shows the mesh is oriented 180 degrees backwards: the grey rear carapace faces South in idle col 1 (s) and East in col 3 (e), while the tan head faces North (n), and walk/run move shell-first. Supersedes steamshell--2026-11-04-steamshell.md. Adjust rig.yawDeg by ~180 deg in art/source/forge/recipes/steamshell.json (matching mireling) and re-run rig -> animate -> bake -> pixelize -> qa -> packet.
