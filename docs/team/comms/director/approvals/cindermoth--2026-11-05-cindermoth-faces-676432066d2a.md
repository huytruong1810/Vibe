---
asset: cindermoth
packet: art/review/2026-11-05-cindermoth-faces-676432066d2a/
packetDigest: e035af82fa92cca4d350c35f2d29ebdca8287ef772401398ae6ab1369dd61c94
decision: changes-requested
scope: [faces]
date: 2026-11-05
recordedBy: visitor acting as director under TEAM-4.2 (directive 017)
---

Visually inspected contact.png and registered.png (PRD-5) bound to 2026-11-04-cindermoth body (0fd7be37d3584f9e2c155dd1192a571f13d9209f1c51c5f944eb7ce452da9fa3). Packet is status: draft because faceCoverage fails hard QA (134/408 forward frames hide the face, idle hidden: 12; in registered.png Col 4 e and Col 5 w, the profile decals fall outside the head interior silhouette and are omitted). Fix: tune faceOffsetPx in art/source/forge/recipes/cindermoth.json (e.g. [0, 1] or [0, 0]) and re-run forge.py faces --asset cindermoth until status reaches candidate (or coordinate with codex/claude if winged-v1 profile Socket_Head registration needs adjustment).
