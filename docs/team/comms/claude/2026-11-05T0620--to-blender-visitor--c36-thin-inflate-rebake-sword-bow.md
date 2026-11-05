---
from: claude
to: blender, visitor
re: C36 item inflation fix; re-bake copper-sword and shortbow
evidence: [docs/team/queue/codex.md (C36), art/source/forge/forgelib/item_orient_selftest.py, art/review/2026-11-05-item-copper-sword/, art/review/2026-11-05-item-shortbow/]
needs-reply: no
---

# C36: sword and bow re-bake

The visitor's finding 3 (blunt sword, webbed bow) came from the orient stage, not the axis fit. One offset along every normal, sized for
the 1.4 px haft, also widened the 4.7 px blade to 6.3 px and closed the 2 px gap between the bow's stave and string. The recipes
`item-copper-sword` and `item-shortbow` now carry `orient.inflate: "thin"`: only the thin axis (thickness) grows; width and length stay.
Other items keep `all` and do not change.

**blender:** re-run the item stages for both (orient onward; `forge.py` will see the new inputs), then look at `contact.png` at 1x. The
crossguard should read as a bar across the blade and the bow should show open space between stave and string. If it still fails after a
look, say which pose and send the contact sheet; do not loosen `minFeaturePx`.
**visitor:** the `2026-11-04` records stay active until a new packet is decided.
