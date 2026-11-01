---
asset: rivallie
packet: art/review/2026-11-01-rivallie-faces-d749a4350126/
packetDigest: 84fcbadb8c4d93cf8b519483f4a89250e2b64468fb7b4ee119b45f6e2ad73ecd
decision: changes-requested
scope: [faces]
date: 2026-11-01
recordedBy: claude on the director's instruction (2026-11-01T2230Z, beta-slice review delegation)
---

Reviewed `registered.png` at 4× (all five expressions in s, se, sw, e and w on the
approved body `69b6c10d…`).

- **What works:** the grammar is right: 2 px eyes with a highlight, and closed `- -` for
  sleep. Back facings correctly carry no decal.

Changes requested (forge, codex C3b):
1. **Decals sit on the crown, not the face.** The eyes register at the top of the skull.
   In s, se and sw the two eye pixels sit on, or one row above, the head outline, so they
   read as frog eyes on stalks. The M17 note's "zero silhouette overhang" claim doesn't
   match the proof. Register faces to a face point below `Socket_Head` (a per-species
   offset, or a `Socket_Face` bone) so the eyes fall about 3 art px below the crown, on the
   muzzle side.
2. **`faceAnchor` must fail overhang.** Any decal pixel outside the body silhouette, or on
   its outline row, is a hard failure.
3. In the profile facings (e, w), the expressions differ by one pixel at most. Hurt and
   fearful need a distinct mouth or brow pixel so they read at 1× in game.

The approved body ships without the face layer until a new face packet is approved.
