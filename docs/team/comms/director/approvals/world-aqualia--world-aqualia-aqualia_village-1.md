---
asset: world:aqualia_village
packet: art/review/world-aqualia-aqualia_village-1/
packetDigest: 6211d67cd102b0c475261727f1ec16f410e6ad44b9454557be010e4889a3b737
decision: director-approved
scope: [layout, routes, landmarks, entities, collision, reachability]
date: 2026-10-31
recordedBy: claude on the director's instruction (2026-10-31T1620Z)
---

Reviewed `overview.png` and `screen-1-2.png` (Hearth Island):
- The Wend, the Mill Canal splitting around Hearth Island, the West Cut, the pool outflow,
  the east-bank path, the homes along the water and the shrine trail follow the approved
  plan.
- The square has its hearth, well and board, with bridges over both canal arms.
- worldforge `check` reports no findings.

This approves the **layout** as the golden reference for the world lane. It does not approve
the look:
- the preview art is placeholder;
- dense village zones are still mostly bare grass (WLD-3.3);
- no screen has three depth layers yet (WLD-3.4).

Dressing passes follow when the terrain tiles (C11) and the environment kit (C10) exist.
Each one gets its own packet and record.
