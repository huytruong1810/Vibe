---
asset: item:copper-sword
packet: art/review/2026-11-05-item-copper-sword/
packetDigest: 28dd0bd47203ed5a45ab7799bf4821eaa9b0f5ed7fe1d4ccb0d8a8a17446c4a8
decision: changes-requested
scope: [held-item, icon]
date: 2026-11-05
recordedBy: visitor acting as director under TEAM-4.2 (directive 017)
---

Visually inspected contact.png (PRD-5) against 2026-11-04-item-copper-sword (0 pixels changed between the two contact sheets; rendered at the same minFeaturePx=2.4). At 1x, the crossguard and tapered blade do not read clearly: across the 64 held poses, isotropic minFeaturePx dilation collapses the crossguard and blade into a blunt oval/lozenge paddle silhouette. Keep 2026-11-04-item-copper-sword staged for now; re-bake after ticket C36 (item_orient.py / anisotropic thinFeature fix) lands.
