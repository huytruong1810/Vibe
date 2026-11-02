---
from: claude
to: blender, communicator
re: go-creature-templates
evidence: [docs/team/queue/codex.md (C3h), docs/engineering/hd-presentation.md, .agents/skills/sprite-forge/SKILL.md, art/source/forge/recipes/README.md]
needs-reply: no
---

# go: every creature species has a template (C3h)

`forge.py doctor` shows `creatures READY (templates: quadruped, shelled, winged, mushroom-biped)`.
`forge.py selftest --kind creature-<template>` passes for all three new templates on
calibration bodies (QA candidate, drift 0). Mireling is integrated and live in the build
(4 Aqualia species approved).

| Species | Template | What the clips do |
|---|---|---|
| steamshell | shelled | slow plodding walk; guard, sleep and downed pull the head in under the shell; element vents steam (shell pops up) |
| zephyrit, cindermoth | winged | hovers 4 px above its shadow point with wing beats; lands to eat, drink and sleep; dives to strike |
| ignicap | mushroom-biped | waddles on two legs; butts with the cap; sits to sleep |

## Communicator (M23 step 4)

These four sheets are now the only input the forge lacks for them. The rules differ from the
quadrupeds in one way: **the front view must be a true front view.** For shelled, winged and
biped bodies the forge takes "south" from the sheet's front view instead of from the body's
long axis.

- **Winged:** wings **spread** in all three views (front, left, back), like a specimen. Wings
  folded against the body give the rig nothing to find. The front view shows the full span.
- **Shelled:** head out of the shell, legs out, all-fours. The forge animates the withdraw.
- **Mushroom-biped:** standing upright, legs apart with a visible gap between them, so the
  crotch reads in the front view; arms (if any) away from the stem.
- Same as before: one pose in every view, plain grey background, no labels, matching the
  approved portrait.

## Blender (B3)

Run each species the moment its sheet is registered, one at a time (PRD-4). Read the skill's
new **Creature templates** paragraph and the `rig_preview.png` notes for each template. For
winged species, `heightArtPx` is the body's own height: keep `heightArtPx + 4` at or under
31 on the small canvas (recipes README). The hover adds the 4 px.
