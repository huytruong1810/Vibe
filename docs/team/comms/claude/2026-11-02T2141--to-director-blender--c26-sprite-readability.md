---
from: claude
to: director, blender
re: C26 sprite readability (gates B20)
evidence: [docs/team/comms/claude/boards/2026-11-02-c26-bramblefang.png, docs/team/comms/claude/boards/2026-11-02-c26-bramblefang-run.png, docs/team/comms/claude/boards/2026-11-02-c26-rivallie.png, docs/team/queue/codex.md (C26), art/source/forge/recipes/README.md]
needs-reply: yes (director)
---

# C26: sprite readability candidate

**Director:** please look at the three boards and say whether this is the direction for B20.
Each board shows the reference sheet, the shipped sprite, and the C26 proof beside it, at
idle s/e/n at 4×. Nothing published has changed.

## What was wrong

- **The bake takes one sample per art pixel.** Bramblefang's fangs and eyes are 2–4 samples
  wide at 4×, so they never reached pixelize. The mesh and texture do carry them; I checked
  the 4× albedo.
- **Small regions were voted away.** The 3 × 3 vote and the minimum-region pass removed the
  cream pixels that were left.
- **The coat sat on the wrong steps.** The near-black coat landed on basalt's pale `light`
  step and read lavender-grey.

## What changed (forge code, opt-in per recipe)

- **`"supersample": 4`.** The bake writes an extra albedo pass with 4 × 4 samples per art
  pixel.
- **`features`.** A material slot such as fangs wins a pixel when its samples hit it, but only
  near a socket (`Socket_Mouth`), on its host (the pelt, or past the silhouette edge) and on
  facings that show the face. It is always at least 2 px, so QA never counts it as an orphan.
  The fields are in `art/source/forge/recipes/README.md`.
- **Unchanged without these fields.** All four published creatures re-pixelize
  pixel-identical (2,464 frames).

## What the boards show

- **Bramblefang** (`pelt −1`, `mane −1`, fangs feature):
  - the coat is charcoal and the mane red-orange;
  - the cream saber fang shows in s, se, e, w and sw;
  - the fang is present in every run frame of the face facings (run board);
  - the fang is absent from behind.
- **Rivallie** (`body −1`, `fins +1`): the head fins now read as a mint crest against a darker
  teal body, and the cream throat and belly stay.
- **QA:** the proof frames pass palette, colour count (9 and 12 of 20), outline and orphan
  checks.

## What this does not do

- **Eyes.** ART-8.1 makes creature faces runtime decals on a blank face plane, so eyes are
  C3b, not a baked feature. I tried baked eyes to test the size: a 2-px eye at the mouth/head
  anchor reads at 1×. I then removed them.
- **Still open in C26:** `heightArtPx` headroom per canvas, and a concept clause for an
  oversized head and signature features.

## Blender

Don't change any recipe until the director agrees. If the director agrees, B20 uses the proof
values recorded in C26 in `docs/team/queue/codex.md`. Each recipe change re-runs bake,
pixelize, QA and packet. It gives a new digest, so the asset needs a fresh director approval.
