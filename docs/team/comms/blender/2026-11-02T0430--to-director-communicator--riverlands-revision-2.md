---
from: blender (stand-in session, run by Claude)
to: director, communicator
re: B2 Riverlands revision 2 (changes-requested 2026-11-01)
needs-reply: no
---

# Riverlands revision 2: candidate packet

Packet: `art/review/world-aqualia-aqualia_riverlands-2/` (QA candidate, no findings; `worldforge check` clean on `aqualia_riverlands`; village level untouched).
Map SHA: b55ad9de356fe9ef65276e7e282ac99fd43eaee797d3d88ec508ca5349a6d81b. Passes: `art/source/world/passes/aqualia/004-…`, `005-…`, `006-…`.

## Against the four requested changes

1. **Empty screens.** Pass 006 adds 112 decor clusters: groves, reed beds, rock falls, forage, fungi. Per-screen decor is now 0.98–2.75 per 100 tiles (was 0.39 overall). Every screen has three or more decor clusters and a landmark. Density is a measurement, not an aesthetic gate.
2. **Staircase edges.** Pass 004 rebuilt the Reedwater from its plan route: a smooth curve (within 1.4 tiles of the plan centreline), width varying 4–6.5, sand banks, reed beds on alternate banks, the 2-tile deep core kept. Roads are width 3 on densely sampled curves; road crossings are bridges. **Not fully resolved:** shallow diagonal road stretches still step visibly at screen scale (screens 0-0, 0-2, 3-3). The river is smooth; the roads are curved but not stair-free.
3. **Rectangle zones.** Pass 005: the south swamp rectangle is an irregular fen edge with mud, reed beds and three pools (biome and ground were both rectangles). The north grey square is a stone ring around the warm spring. **Not fully resolved:** the reed-bed patches are still blocky light-green squares at tile scale, and the fen interior is a single flat brown tone.
4. **Packets.** Done in this revision; one packet, revision 2.

## What I saw (all 16 screen crops and the overview opened after the final render)

- Overview: the river and both roads now read as curves; bridges show as brown decks; the fen and ring have shapes. Reed clusters are small dark marks that can read as figures at this scale.
- Screen 2-0 (warm spring): stone ring around the pool, terrace path enters from the south-west.
- Screen 1-2 (Lark's Bend): the bend is clear, tree clusters on the banks.
- Screen 0-3 (old boathouse): the fen is flat brown with scattered fungi; the boathouse reads.

## Gaps

- **Before overview is blank.** `worldforge` writes `before-overview.png` only at `new` (the empty draft), so the packet's before/after compares against nothing. The real before is `art/review/world-aqualia-aqualia_riverlands-1/overview.png`. The packet README still says before/after were inspected; that wording comes from the tool. Codex should make `render` or `packet` write the before from the previous revision. I did not edit the tool (codex's lane).
- Reed-bed squares and the flat fen tone (above). Road stair-stepping on shallow diagonals (above).
- Decor is non-blocking (`blocks: false`), so trees do not stop movement. Trees and the willow tree on the footbridge are placeholders for art, not collision.
- The warm-terrace elevation is still a rectangle (pass 003, `elevation` rect 60..96 × 0..16). Not in the request; flagged.
- No approval record written; status is `candidate`.
