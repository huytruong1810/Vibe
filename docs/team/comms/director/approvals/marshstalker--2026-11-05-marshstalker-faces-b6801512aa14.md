---
asset: marshstalker
packet: art/review/2026-11-05-marshstalker-faces-b6801512aa14/
packetDigest: 2c2be12617b0700a5debae8336c7dbdc0e187aa68ac87b172f3e465c12e7c1ba
decision: changes-requested
scope: [faces]
date: 2026-11-05
recordedBy: visitor acting as director under TEAM-4.2 (directive 017)
---

Visually inspected contact.png and registered.png (PRD-5) bound to 2026-11-03-marshstalker body (369888bc1ba9dbdc0477519c9072d8d59a8c3266810d5d954bc7ba3f5ab661c7). Packet is status: draft because faceCoverage fails hard QA (272/408 forward frames hide the face, idle hidden: 18; in registered.png Col 2 se, Col 4 e, and Col 5 w, the slender snout silhouette cannot fit the decal at default [0, 3] offset without touching the outline, so decals are omitted). Fix: tune faceOffsetPx in art/source/forge/recipes/marshstalker.json (try [0, 0] or [0, 1] toward the wider cranium) and re-run forge.py faces --asset marshstalker; if slender-snout profile geometry still cannot fit a 3-px decal inside the non-outline interior, escalate to codex/claude to support compact 1-2 px profile eye decals in forgelib/faces.py.
