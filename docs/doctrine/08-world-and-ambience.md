# 08 — World and ambience

No Name Village (REF-1) is the soul of this doc. Eastward (REF-5) and Sea of
Stars (REF-6) set the lighting bar. The rule of thumb: **every screen has at
least three things moving that the player did not cause.**

## AMB-1 Ambient life

| Biome          | Day                                                                                                  | Night                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Aqualia canals | Dragonflies, fish ripples, drifting willow leaves, water sparkle, bobbing lily pads, laundry swaying | Fireflies, lantern flicker, moon glints on water, frogs |
| Riverlands     | Reed sway, butterflies, rivallie splashes in the distance                                            | Fireflies, glowing fungi, mist bands                    |
| Pyrador        | Heat shimmer near forges, drifting embers, smoke columns                                             | Forge glow pools, ember motes, distant kiln light       |
| Zephyria       | Spinning windmills, kites, blowing petals, cloud shadows                                             | Wind bells (audio), starfield, lantern sway             |
| Wetlands       | Mist, bubbles, mosquito swarms, mireling rustles                                                     | Bioluminescent spores, marsh lights                     |

- **AMB-1.1** Ambient creatures are presentation only; they never become
  simulation entities.
- **AMB-1.2** Ambient density scales with the quality setting. Low keeps at
  least one moving element per screen.

## AMB-2 Foliage and water motion

- **AMB-2.1** Grass and reeds sway with a wind field (shared phase across
  neighbouring tiles, so gusts travel as waves), on the art grid.
- **AMB-2.2** Water has a 4–8-frame shimmer animation and shoreline foam. The
  player and creatures leave ripples when wading or swimming.

## AMB-3 Light and time of day

| Phase | Grade                                      | Shadow ellipse | Light pools                                                           |
| ----- | ------------------------------------------ | -------------- | --------------------------------------------------------------------- |
| Dawn  | Warm peach lift, low saturation in shadows | Long, soft     | Lanterns fading out                                                   |
| Day   | Neutral; the bake reference                | Short          | None                                                                  |
| Dusk  | Gold-orange key, violet shadows            | Long           | Lanterns and windows on                                               |
| Night | Blue-violet grade, value compression       | Faint          | Lanterns, windows, forges, fireflies, glowing fungi as additive pools |

- **AMB-3.1** Grades are colour-lookup operations applied to the composited
  frame. They preserve the readability of actors (ART-7.3) and telegraphs.
- **AMB-3.2** Light pools are additive pixel-art gradients (dithered rings, not
  smooth blurs), placed on light-source props.

## AMB-4 Weather

Clear, cloudy (moving cloud shadows), rain (pixel streaks, puddle ripples, grade
darkens), storm (lightning flash, heavy rain, gusts bend foliage further), fog
(dithered bands). Weather changes ambient sets: no butterflies in rain, frogs
louder.

## AMB-5 Audio mood

Each biome has a day and a night ambience bed. Music is sparse and warm by day,
softer by night, with a combat layer that fades in on engagement and out within
4 seconds of disengagement. Footsteps match surface material (boardwalk, grass,
stone, shallow water).

## Engineering mandates

| ID     | Mandate                                                                                      |
| ------ | -------------------------------------------------------------------------------------------- |
| AMB-M1 | Presentation-only ambient emitter system keyed by biome, time phase, weather and quality.    |
| AMB-M2 | Global wind field driving foliage sway phases.                                               |
| AMB-M3 | Per-phase colour grading on the composited frame, plus additive light pools on tagged props. |
| AMB-M4 | Weather presentation states that adjust ambient emitters and grading.                        |
| AMB-M5 | Surface-material footsteps and biome ambience beds.                                          |
