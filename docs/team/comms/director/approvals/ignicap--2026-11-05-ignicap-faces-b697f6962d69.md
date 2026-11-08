---
asset: ignicap
packet: art/review/2026-11-05-ignicap-faces-b697f6962d69/
packetDigest: 2e6204fb226a7bffafef3f849014cc41ce3283bb3121b089b5ebd375cacf0adc
decision: changes-requested
scope: [faces]
date: 2026-11-05
recordedBy: visitor acting as director under TEAM-4.2 (directive 017)
---

Visually inspected contact.png and registered.png (PRD-5) bound to 2026-11-04-ignicap body (57054f3aa8398d4efbc9e1ff37735a05543e2c4baeb3096f6b36f2ed46234824). All 5 idle forward facings in registered.png register cleanly on the mushroom cap (idle hidden: 0, 0 overhang), but packet is status: draft because faceCoverage fails hard QA across action clips (83/408 forward frames hide the face, >10% threshold). Fix: tune faceOffsetPx in art/source/forge/recipes/ignicap.json (e.g. [0, 1] or [0, 2]) and re-run forge.py faces --asset ignicap so action clip head-bob frames stay inside the interior silhouette and status reaches candidate.
