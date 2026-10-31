---
name: environment-forge
description: >-
  Produces 3D-baked environment sprites (buildings, large props, trees) through the
  Sprite Forge with the environment depth stretch, separate roof and canopy layers,
  and footprint checks. Use for village buildings, landmarks, trees, docks, bridges
  and other grid-placed objects on machine A. Not for terrain tiles, which are 2D.
---

# Environment forge (doctrine ART-2.3, ART-11, AMB-3.2)

Same gate and loop as `sprite-forge` (read it first), with the asset kind
`environment`:

```
F="uv run --project art/source/forge python art/source/forge/forge.py"
$F next --asset env:<id>
```

## Rules that differ from actors

- **Depth stretch** of 1/sin(30°) on world Y is applied by the forge for
  `environment` assets (ART-2.3). Footprints then match the 32-px top-down grid.
  Don't stretch or squash models yourself.
- **Layers:** buildings export `base` plus `roof`; trees export `trunk` plus
  `canopy`. Roof and canopy must be separate so the player stays visible
  (ART-11.1). The recipe lists which mesh parts go to which layer.
- **Footprint:** the recipe declares the collision footprint in tiles. QA fails if
  the base layer's ground contact differs from it. Visual overhang is fine; a
  changed footprint is not (ART-11.4).
- **Light sources** (lanterns, windows, forges) get a `lightPool` tag in the
  recipe so the engine can add night light pools (AMB-3.2). Don't bake glow into
  the sprite.
- **Contact shadow:** buildings and large props bake a short contact shadow
  (ART-3.4); the forge does it for `environment` assets.
- Colour budget is 32 per sprite (ART-4.4); ordered dithering only on large
  surfaces (ART-11.3).

## Inputs

Reference: a concept or prop-style sheet from the communicator (three-quarter view
or front plus side), made with the `prop v1` template, or crops of an approved
concept painting. Region identity per ART-13 (Aqualia timber, teal slate roofs,
lanterns, rope).

## Not this skill

Terrain materials, shorelines, cliffs, ramps and autotile masks are **2D** and
belong to the communicator (ART-11.2, ART-15).
