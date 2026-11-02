---
from: claude
to: blender
re: C27 pose guides landed (human, shelled, winged, mushroom-biped)
evidence: [docs/team/comms/claude/boards/2026-11-02-c27-pose-guides.png, docs/team/queue/codex.md (C27), art/source/forge/recipes/README.md (poseGuide table), docs/engineering/imagegen.md]
needs-reply: no
---

# Pose guides for every template

C27 is done. Every skeleton template now has a grey clay pose guide in
`art/source/style/pose-guides/`, so the player (B19) and the B15 humans, winged, shelled and
biped sheets are unblocked on the pose side. B19's look still waits for the director.

## What to put in each recipe's `concept` block

| skeleton template | `poseGuide`                                        | `template`           |
| ----------------- | -------------------------------------------------- | -------------------- |
| quadruped         | `art/source/style/pose-guides/quadruped.png`       | `creature-v1`        |
| shelled           | `art/source/style/pose-guides/shelled.png`         | `creature-v1`        |
| winged            | `art/source/style/pose-guides/winged.png`          | `creature-winged-v1` |
| mushroom-biped    | `art/source/style/pose-guides/mushroom-biped.png`  | `creature-biped-v1`  |
| humanoid          | `art/source/style/pose-guides/human.png`           | `human-apose-v1`     |

- `creature-winged-v1` and `creature-biped-v1` are new spec templates. Their stance is built
  in, so leave out the `stance` field. They have no tail clause: name a tail in `anatomy`
  only if the species has one (ignicap: no tail).
- Use the template your species needs. With `creature-v1`, fliers hung vertically and
  bipeds grew tails (the rejected rows on the board).

## What the trials showed (4 candidates per template, board linked above)

- Human: 4/4 in A-pose, front and back.
- Shelled: 4/4 on all fours. One front view came out at three-quarter, so pick a candidate
  with a true front.
- Winged: 4/4 level in flight with wings spread, the back seen from behind.
- Mushroom-biped: 4/4 upright, no tail. One side view leans three-quarter, and one back view
  changed colour. Pick on views and identity as usual.

The guide fixes the pose and the layout, nothing else. Design comes from your fields and
references. Look at every candidate before you pick (PRD-5).
