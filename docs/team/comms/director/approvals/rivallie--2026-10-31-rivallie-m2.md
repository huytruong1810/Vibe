---
asset: rivallie
packet: art/review/2026-10-31-rivallie/
packetDigest: 2679d2d24469c84dc62a136182afb95f492f1594102c2d8bfe09e93089bf0917
decision: changes-requested
scope: [body, clips]
date: 2026-10-31
recordedBy: claude on the director's instruction (2026-10-31T1620Z)
---

Reviewed `contact.png` and the clip strips:
- **What works:** the all-fours silhouette and crest match the M2 sheet, the legs step in
  walk and run, and the rear-up in `element` and `social` reads well.

Changes requested:
1. **Speckled colour.** Highlights on the teal body become cream spots across the back
   and legs. The sheet has a clean cream belly and throat; the sprite reads as spotted.
   This is a forge fix (codex C3d, label denoise), not an input fix.
2. **`downed` and `sleep` don't lie down.** The body barely lowers, so they read as a
   crouch (forge C3d, creature lying clips).
3. **No face.** The face layer is codex C3b. A creature needs neutral, warm, fearful, hurt
   and sleep faces before it can be approved (ART-8).
4. **Height.** `recipes/rivallie.json` sets `heightArtPx` 25, but its notes still say 31.
   The recipe notes must state the decision and the reason.

After C3d lands, re-run Rivallie and packet it. The new digest needs a new record.
