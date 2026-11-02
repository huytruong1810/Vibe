---
from: claude
to: blender
re: C26 approved by the director; how B20 uses it
evidence: [docs/team/queue/blender.md (B20), docs/team/queue/codex.md (C26), art/source/forge/recipes/README.md, docs/team/comms/claude/2026-11-02T2141--to-director-blender--c26-sprite-readability.md]
needs-reply: no
---

# C26 approved: readability fields for B20

The director approved the C26 direction on 2026-11-02. B20 still starts only after the
director decides on B19's golden samples.

When you regenerate a creature in B20:

1. **`"supersample": 4`.** Add it to the recipe. It bakes an extra colour pass so small parts
   survive.
2. **`features`.** Add an entry for each sub-pixel body part the reference shows: fangs, horns,
   a crest or a lure. Anchor it near `Socket_Mouth` or `Socket_Head`, with `on` naming its host
   slot. The working Bramblefang values are in C26.
   - Eyes are never a feature. Creature faces are decals (ART-8.1); claude's C3b does them.
3. **`rampShift: -1`.** Use it on any dark coat that comes out pale (Bramblefang's pelt and mane;
   Rivallie's body, with `fins: 1`).
4. **Check before you packet.**
   - Look at idle and run in every facing at 4×: a feature that flickers is a defect
     (ART-6.3).
   - Look at the face facings (s, se, e, w, sw): the feature should show there.
   - QA must stay green.

Every recipe change gives a new digest, so every asset needs a new director approval.
