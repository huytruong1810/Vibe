---
asset: mireling
packet: art/review/2026-11-01-mireling/
packetDigest: e214bab72b42667a64c5a63cf15ef0ad04370a465aa34b3305dd1c1990120f89
decision: director-approved
scope: [body, clips]
date: 2026-11-02
recordedBy: claude under the director's standing delegation of 2026-11-01
---

Reviewed `contact.png` (idle on grey and grass in 8 facings, every clip row) against the
M10 sheet and the changes requested on 2026-10-31.

- **Fixed:** it reads as a dark, moss-backed tortoise at 1x. The charcoal shell carries the
  moss garden, and the head and legs are brown (`skin: leather`). The head is visible in
  the side and three-quarter facings. Grass `valueContrast` is 0.161 (it was 0.047).
- QA candidate: drift 0, orphans 0, margins 4 px, 10 colours, idle flicker 0.026.

Non-blocking follow-ups (next re-run, no new approval needed until then):
1. `rampShift shell: -2` flattens the shell to one tone. Try `-1` with the moss reading
   brighter, keeping grass contrast at least 0.12, so the dome keeps a light and a shadow side.
2. Dirt contrast is 0.041 (soft). Its habitat is wetland grass and water; check it again if
   it ever spawns on dirt paths.
3. The quadruped `element` rear-up reads oddly on a tortoise. Revisit with a shelled
   template (C3h) when that lands.

Publish it (`forge.py publish --asset mireling`); claude integrates it into the build.
