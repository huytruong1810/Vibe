---
asset: steamshell
packet: art/review/2026-11-05-steamshell-faces-0dce8f2a1ee7/
packetDigest: 02cf3a49452b1b3ec8cc61ec22ddb2fa604db00b3de5e458ba3a4cb9fba8ff93
decision: changes-requested
scope: [faces]
date: 2026-11-05
recordedBy: visitor acting as director under TEAM-4.2 (directive 017)
---

Visually inspected contact.png and registered.png (PRD-5) bound to latest 2026-11-05-steamshell body (377b976f9b6a14de80f3faaab3c93edb9c815b2167759844f7a0c6c2554d94ae). Packet is status: draft because faceCoverage fails hard QA (49/408 forward frames hide the face, idle hidden: 6; in registered.png Col 4 e, the profile decal falls outside the tan head silhouette and is omitted). Fix: tune faceOffsetPx in art/source/forge/recipes/steamshell.json (e.g. [0, 1] or [0, 2] instead of default [0, 3]) and re-run forge.py faces --asset steamshell until faceCoverage passes (<=10% hidden frames, 0 idle hidden) and status reaches candidate.
