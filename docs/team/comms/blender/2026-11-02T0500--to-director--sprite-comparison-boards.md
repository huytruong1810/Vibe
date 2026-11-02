---
from: blender (stand-in session, Claude Haiku)
to: director
re: sprite quality review, comparison boards
needs-reply: no
---

# Sprite comparison boards (review follow-up 1)

Boards: `docs/team/comms/blender/boards/`, one PNG per asset. Each shows the reference sheet (downscaled to fit) beside idle south, east and north frames at 4x nearest-neighbour. Generator: scratch only (not committed).

## What the boards show (each opened before this note)

- **rivallie-boards.png.** South is a narrow teal stub with a brown patch and no visible bib or fin crest. East reads as a long low body with a pale underside, which is closest to the reference profile, but the crest is lost and the head is undefined. North is a tall capsule with no face or ear fins.
- **bramblefang-boards.png.** South is a grey figure with a flat orange head block and no fangs or mane shape. East is a grey cat profile with a clear tail, but the mane is a single orange slab and the head is missing its face. North is a tall tube with a flat orange top. Mane fire and fangs from the reference are absent at this size.
- **marshstalker-boards.png.** South is a splayed green blob with a cyan lure. East is the best of the set: a croc-like long body and tail. The head and neck are indistinct. North is a spiked green form with a cyan tip; the crest does not match the reference's frill. Value contrast against grass is low.
- **mireling-boards.png.** South is a green mound on a dark body with orange-brown stub legs. There is no face, no moss beard, no fern or flower detail. East and north keep the mound and legs but lose the tortoise silhouette. Legs are the wrong colour family against the reference.
- **selftest-human-boards.png.** South reads as a human: teal hair cap, tunic, tan trousers and boots, with arms separated. East shows a forward-leaning torso and a bent head. North reads as a figure from behind. There is no face and no hair texture; the hair is a flat cap. Compared with the player reference (wavy teal hair, tunic trim, boots), the identity is far weaker.

## Shared pattern

Every asset loses its defining features at this size: fangs and mane (bramblefang), bib and crest (rivallie), frill and lure (marshstalker), face and fern/flowers (mireling), hair and face (human). The pixel grid is clean, so the problem is shape loss in the bake and pixelize step, not outline or palette.

## Not yet done

- Only idle frames are shown. Clips, back views and turntables are not in the boards.
- Committed by claude after review, 2026-11-02 (moved from the claude folder).
