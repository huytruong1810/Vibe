# 03 — Art bible

The art bible defines how Hearthwild looks. The numbers here are quoted from
[`render_spec.json`](../../art/source/forge/spec/render_spec.json),
[`palette.json`](../../art/source/forge/spec/palette.json) and
[`body_types.json`](../../art/source/forge/spec/body_types.json). If prose and
spec disagree, the spec wins (DOC-2).

## ART-1 Pixel scale and resolution (L1)

- **ART-1.1** Native art resolution is 960×540. One art pixel is 2×2 screen
  pixels at the 1920×1080 reference. A terrain tile is 32×32 art pixels.
- **ART-1.2** Pixel art is never rotated, never scaled by a non-integer factor
  and never filtered. Mixed pixel sizes on screen ("mixels") are a defect. The
  only exemptions are particles and screen effects designed for it (ART-12.4).
- **ART-1.3** Sprites are positioned on the art-pixel grid (even display
  pixels). Camera smoothing may use sub-art-pixel offsets only if the whole
  composited frame moves together.
- **ART-1.4** Art is authored at art-pixel resolution and exported with exact
  2× nearest-neighbour upscaling to the asset contract v2 display canvases (human
  96×144 at root (48,132), Rivallie 96×96 at root (48,86); L1). The forge does the
  upscale; nobody hand-scales.

## ART-2 Camera and projection (L2)

- **ART-2.1** Every 3D-baked asset uses one orthographic camera at 30°
  elevation, looking north (screen-up is world north).
- **ART-2.2** Facings are `s, se, e, ne, n, nw, w, sw`, measured clockwise
  with screen-down as south. Eight-way sets need real diagonal renders. Mirroring
  `e` to make `w` is allowed only for perfectly symmetric assets _with no held
  items_. Runtime held-item layers make most bodies mirror-safe, but the forge
  decides per asset and records it.
- **ART-2.3** Grid-placed environment assets get a depth stretch of 1/sin(30°)
  on world Y before rendering. Actors never do.
- **ART-2.4** Terrain tiles are painted top-down in 2D. Vertical faces (cliffs,
  walls) use the engine's elevation step: 8 art px (16 display px).

## ART-3 Light

- **ART-3.1** One key light from screen upper-left (from the west-north-west and
  above). Every baked asset, painted tile, portrait and UI bevel agrees with it.
- **ART-3.2** Bakes use neutral daylight. Time of day, weather and interior
  mood are applied at runtime as colour grading and additive light pools
  (AMB-3), never baked into sprites.
- **ART-3.3** Shading uses **3 bands** (shadow, mid, light), plus an optional
  **highlight** band only on materials flagged glossy in the palette (hair,
  metal, wet surfaces, eyes). Band thresholds are in the spec. No gradients, no
  soft shading, no ambient-occlusion smudges.
- **ART-3.4** Actors cast no baked ground shadow. The engine draws a dithered
  ellipse contact shadow under each actor. Buildings and large props bake a
  short contact shadow into their sprite.

## ART-4 Palette

- **ART-4.1** All colours come from the master palette's named ramps. Each ramp
  has five steps: `deep` (outline and crevice), `shadow`, `mid`, `light`,
  `highlight`.
- **ART-4.2** Hue shifting: shadows move toward blue-violet and gain a little
  saturation; lights move toward warm yellow and lose a little saturation. A
  ramp that only changes lightness is a defect.
- **ART-4.3** Never pure black (#000000) or pure white (#FFFFFF). The darkest
  value on screen is an outline `deep` step. The brightest is a `highlight` step.
- **ART-4.4** Each actor uses **at most 24 colours**, outline included. Each
  creature uses at most 20. Each environment sprite uses at most 32.
- **ART-4.5** Saturation and value hierarchy, from most to least prominent:
  interactables and threats → actors → props → buildings → ground. Ground
  materials stay low to medium contrast so actors pop (ART-7.3).
- **ART-4.6** Region accents: Aqualia `teal`, `navy`, `reed`, `timber`,
  `sand`; Pyrador `ember`, `ochre`, `basalt`, `glass`; Zephyria `sky`,
  `cream`, `sage`, `sail`. A villager's costume carries at least one accent
  ramp of their village.

## ART-5 Outline

- **ART-5.1** Every actor, creature and prop has a 1-art-pixel **selective
  outline**: each outline pixel takes the `deep` step of the material it
  borders, not one global outline colour.
- **ART-5.2** On top-lit edges (the outline's upper-left quadrant) the outline
  may use the bordering material's `shadow` step instead of `deep`, so the form
  turns into the light.
- **ART-5.3** Interior lines appear only where depth jumps (an arm in front of a
  torso, a hat brim over a face) and use the `deep` step of the farther
  material.
- **ART-5.4** Outlines are clean single-pixel lines: no doubled pixels, no
  L-shaped corners on diagonals, no orphan pixels.
- **ART-5.5** Terrain tiles have no outline. Buildings and trees are outlined
  only where their silhouette meets ground or sky.

## ART-6 Proportions and anatomy (L3)

- **ART-6.1** Adult humans are 4.5–5 heads tall. Target crown heights (feet to
  top of skull, art pixels) per build profile are in `body_types.json`, using the
  contract v2 build-profile names: standard 56, sturdy 57, slender 55, plus an
  elder posture variant at 52. Hair and headwear may add up to 6 px. Builds come from
  explicit authored choices, never inferred from pronouns.
- **ART-6.2** Head height is 11–12 px. Eyes are runtime decals (ART-8). Hands
  read as 2–3 px mitts, feet as 3–4 px wedges.
- **ART-6.3** Minimum feature width is **2 art px** at final size. Thinner
  features (staff shafts, straps, whiskers) either thicken in the model or are
  dropped. A feature that flickers in and out across facings is a defect.
- **ART-6.4** Shape language by element: **water** = circles and flowing
  S-curves; **fire** = triangles and upward points; **wind** = diagonals,
  crescents and thin trailing shapes. Personality adds to this: a gruff
  armourer is blocky, a dreamy painter is soft and long.

## ART-7 Silhouette and readability

- **ART-7.1** Every named character is identifiable at 1× from the south facing,
  in **silhouette alone** or in **palette alone**. Two villagers sharing both
  silhouette class and dominant colour is a defect (the forge QA measures this
  as cast distinctness).
- **ART-7.2** Each character has one **signature shape** (hat, hair mass,
  cloak, prop) that stays readable in every facing.
- **ART-7.3** In greyscale, an actor's mid value differs from every ground
  material it can stand on by at least the spec's value-contrast threshold.

## ART-8 Faces and expressions (L4)

- **ART-8.1** Faces are 2D decals drawn as a runtime layer on the head anchor the
  bake exports per frame. The baked head has a blank face plane.
- **ART-8.2** Facings with a face: `s`, `se`, `sw`, `e`, `w`. Back facings
  (`n`, `ne`, `nw`) show no face decal.
- **ART-8.3** Sprite faces use the same nine emotions as dialogue portraits
  (contract v2): `neutral`, `warm`, `thoughtful`, `curious`, `concerned`,
  `amused`, `angry`, `sad`, `fearful`, plus three gameplay states: `blink`,
  `sleep`, `hurt`. Creatures have at least `neutral`, `warm`, `fearful`, `hurt`,
  `sleep`. A portrait and the sprite face show the same emotion at the same time.
- **ART-8.4** Faces follow the face grammar authored in the forge: eyes 2 px
  tall with a 1-px highlight on the light side; brows 1 px; mouth 1–2 px.
  Faces are palette-indexed so skin and eye ramps recolour per character.

## ART-9 Animation

- **ART-9.1** Frame counts per state follow the contract's clip matrix, at 2×
  canvas sizes from the spec.
- **ART-9.2** Pose-to-pose with stepped (constant) interpolation. Hold
  anticipation and impact poses; never in-between evenly.
- **ART-9.3** Idle: a 1-px breathing rise on the torso and head; blinks come from
  the face layer, not the body clip. Walk: 8 frames, a 1-px bob on the contact
  frames. Run: 8 frames, a 2-px bob with a lean into the motion.
- **ART-9.4** Secondary motion (hair, capes, ponchos, tails) trails the body by
  one frame and settles over two.
- **ART-9.5** Combat timing follows CMB-3. Art frames illustrate the
  authoritative windup, active and recovery phases; they never define them.

## ART-10 Creatures

Every species reads at 1× as its element and its temperament. Anatomy follows
the approved portraits (the first-proof review made the portrait anatomy canon
for Rivallie).

| Species      | Elements     | Size class | Signature read                                                                        |
| ------------ | ------------ | ---------- | ------------------------------------------------------------------------------------- |
| Rivallie     | water        | medium     | Rounded otter body, cream belly, aqua crest fins, paddle tail; playful upright stance |
| Ignicap      | fire         | small      | Smouldering mushroom cap as the main mass; stubby legs; ember glow on the cap rim     |
| Zephyrit     | wind         | small      | Light, bright, sea-breeze sprite; wing- or fin-like trailing crescents                |
| Mireling     | water + wind | medium     | Mossy, soft, low; fungal tufts; wetland camouflage greens                             |
| Cindermoth   | fire + wind  | small      | Moth with ember-edged wings; spark motes                                              |
| Steamshell   | fire + water | large      | Gentle grazer under a domed shell; a small cloud puff above the shell                 |
| Bramblefang  | fire + wind  | large      | Ember-maned predator; lean, forward-leaning; thorned mane silhouette                  |
| Marshstalker | water + wind | large      | Low, rippling wetland hunter; long body; patient crouch                               |

Predators (Bramblefang, Marshstalker) use sharper, more angular silhouettes and
higher-contrast accents than grazers, so threat reads before stats.

## ART-11 Environment

- **ART-11.1** Buildings, large props and trees are 3D-baked (L5) with the depth
  stretch (ART-2.3). Roofs and tree canopies are **separate layers** so actors
  stay visible beneath them.
- **ART-11.2** Terrain materials, shorelines, cliffs, ramps and autotile masks
  are 2D-painted at 32-px tiles, with seamless edges and at most 4 values per
  material.
- **ART-11.3** Ordered 2×2 dithering is allowed only on large environment
  surfaces (water depth, sky, distant foliage), never on actors.
- **ART-11.4** Visual detail may overhang a collision footprint. It may never
  change the footprint or block a protected route.

## ART-12 VFX

- **ART-12.1** Element colour keys: **water** = teal → white foam;
  **fire** = yellow-white core → orange → red edge; **wind** = pale mint and
  white crescents. Neutral impacts use warm white sparks.
- **ART-12.2** Effects are frame-by-frame pixel animation or particles made of
  pixel sprites, on the art grid.
- **ART-12.3** Effects never hide enemy telegraphs (CMB-4). Large effects are
  translucent or dithered at their centre after the active frame.
- **ART-12.4** Exempt from ART-1.2: screen-space flashes, colour grading,
  additive light pools.

## ART-13 Village identities

- **Aqualia (water):** canals and timber boardwalks, teal slate roofs, reeds,
  lily pads, lanterns, rope and nets, willow trees. Dawn-to-evening palette leans
  teal, sand and warm timber.
- **Pyrador (fire):** basalt and ochre stone, glowing forges, glass kilns,
  charcoal stacks, ember shrine. Leans ochre, ember and basalt grey.
- **Zephyria (wind):** whitewashed walls, sky-blue trim, sails, windmills,
  kites, wind bells, sage meadows. Leans cream, sky and sage.

## ART-14 Portraits

- **ART-14.1** HUD portraits are 96×96 and 128×128 screen pixels, painted in
  2D (image generation allowed per PRD-7, then cleaned up). Light from the upper
  left; costume colours taken from the character's ramps.
- **ART-14.2** A portrait must match its sprite's identity: hair shape and colour,
  signature item, skin ramp, dominant costume colours.

## ART-15 Asset classes and methods

| Class                                       | Method                                                                     | Owner (TEAM-2)                                  |
| ------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| Humans (body, outfit, hair)                 | Image-to-3D kit → rig → bake → pixelize                                    | Blender agent                                   |
| Creatures                                   | Image-to-3D → class skeleton → bake → pixelize                             | Blender agent                                   |
| Held items and their inventory icons        | Image-to-3D prop → bake per facing and grip angle; icon from the same mesh | Blender agent                                   |
| Buildings, large props, trees               | Image-to-3D or kit → bake with depth stretch; roof and canopy layers       | Blender agent                                   |
| Faces and expressions                       | Forge face grammar (palette-indexed pixel grids)                           | Authored in the forge; recoloured per character |
| Terrain, shorelines, cliffs, masks          | 2D pixel painting                                                          | Communicator (2D)                               |
| UI frames, icons without a 3D source, fonts | 2D pixel painting (UI)                                                     | Communicator (2D)                               |
| VFX                                         | 2D frame-by-frame or pixel particles                                       | Communicator (2D)                               |
| Portraits                                   | 2D paint (image generation plus cleanup)                                   | Communicator (2D)                               |
| Reference sheets                            | Image generation to the PRD-3 standard                                     | Communicator                                    |

## Engineering mandates

| ID     | Mandate                                                                                                                                                                                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ART-M1 | No texture filtering on pixel art; no non-integer scaling of sprites, tiles or UI frames.                                                                                                                                                                                   |
| ART-M2 | Snap sprite, tile and UI draw positions to even display pixels (the art-pixel grid), with the camera offset applied to the whole composited frame.                                                                                                                          |
| ART-M3 | Contract display canvases and rigs stay as published (96×144 at (48,132); 96×96 at (48,86)). Art arrives pre-upscaled 2×. Optionally reject exports containing non-uniform 2×2 blocks in `check:assets`.                                                                    |
| ART-M4 | Composite each actor as contract v2 layers: contact shadow → body → runtime garment layers (L4) → face (head socket) → held items (hand sockets, in front of or behind the body per frame flag). Engineering's compositor already covers most of this; extend it as needed. |
| ART-M5 | Runtime colour grading per time of day and weather, plus additive light pools, applied after sprite composition (AMB-3).                                                                                                                                                    |
| ART-M6 | Roof and canopy layers fade when the player is beneath them.                                                                                                                                                                                                                |
| ART-M7 | Support multi-page atlases streamed by region (the full slice clip matrix cannot fit one 16 MiB page).                                                                                                                                                                      |
| ART-M8 | Resolved: one elevation step is 16 display px (engineering baseline) = 8 art px. Keep this in the contract.                                                                                                                                                                 |
