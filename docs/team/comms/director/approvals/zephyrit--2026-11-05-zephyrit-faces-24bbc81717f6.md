---
asset: zephyrit
packet: art/review/2026-11-05-zephyrit-faces-24bbc81717f6/
packetDigest: f755c3c8dab7432d496a500f8678f29bbf57bb9b84f4683ff5ef3c8239d91de9
decision: changes-requested
scope: [faces]
date: 2026-11-05
recordedBy: visitor acting as director under TEAM-4.2 (directive 017)
---

Visually inspected contact.png and registered.png (PRD-5) bound to 2026-11-01-zephyrit body (0c626d4bc319fbdf74d7a0cb5ffdfbd3208f70454203b22ef9f176c98e7da091). Packet is status: draft because faceCoverage fails hard QA (108/408 forward frames hide the face, idle hidden: 15; in registered.png Col 3 sw, the decal falls outside the head interior silhouette and is omitted). Fix: tune faceOffsetPx in art/source/forge/recipes/zephyrit.json (e.g. [0, 1] or [0, 2]) and re-run forge.py faces --asset zephyrit until status reaches candidate (or coordinate with codex/claude if winged-v1 Socket_Head needs per-facing registration adjustment).
