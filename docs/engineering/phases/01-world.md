# Phase 1 — seeded world, height, autotiles, camera

## Reference implementation and component contracts

The complete generator, logical grid and surfaces are in [world.ts](../../../src/domain/world.ts). Presentation is in [renderer.ts](../../../src/presentation/renderer.ts) and [art.ts](../../../src/presentation/art.ts).

| Component            | Responsibility / owned state                                    | Interface, invariants, dependencies, lifecycle                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WorldGenerator`     | Deterministic generation pipeline                               | `generate(seed) → ChunkStore`. Same seed/version yields identical layers. Uses seeded samplers, hydrology, classifier, resource pass, settlement planner. Fail if required settlement roads cannot connect. |
| `ClimateSampler`     | Seeded permutation table                                        | `noise` and `octave` sample continuous 2D simplex noise; three octaves with weights 1, .5, .25. Sampling does not consume simulation randomness.                                                            |
| `HydrologyGenerator` | Parameterized connected drainage/coast model                    | `sample(x,y,seed) → river distance, coast distance`. The reference uses continuous meandering river/tributary fields and a coastal boundary, not a physically eroding watershed.                            |
| `BiomeClassifier`    | Explicit biome precedence                                       | Coast → volcano → river/swamp → elevation → forest → meadow. Pure climate noise cannot guarantee rivers, volcanoes, or required settlement biomes.                                                          |
| `ChunkStore`         | Layered arrays, changed indices, buildings, navigation revision | `index`, `contains`, `chunk`, `touch`, `deltas`, `restore`. Chunks are bounded views over a finite global grid. Logical state never contains sprites.                                                       |
| `SettlementPlanner`  | Guaranteed settlement reservations, structures, roads           | Reserve/flatten sites, place starter resources/wells, carve protected corridors, prove road connectivity. See Phase 5 for semantic activity locations.                                                      |
| `SurfaceRules`       | Traversal and media predicates                                  | `walkable`, `canStep`, `medium`. Borders/solid cells block movement; elevation differences require one-level ramps; lava requires capability. Shared by player, creatures, and pathfinding.                 |
| `TerrainNavigation`  | Cardinal neighbor expansion                                     | Enumerate only walkable transitions using the same rules as actual movement. No diagonal corner cutting.                                                                                                    |
| `DualGridAutotiler`  | Sixteen bitmask configurations and cached pixel patterns        | `mask`, `pattern`. NW=1, NE=2, SW=4, SE=8; global corner samples give consistent chunk edges. Logical data is independent of texture artwork.                                                               |
| `CameraController`   | Continuous camera coordinates                                   | Exponential follow, initialized directly at the target. Rendering rounds the result to pixels; simulation positions remain continuous.                                                                      |
| `WorldRenderer`      | Chunk/entity presentation caches                                | Initialize, set terrain, apply frame, render, settings, select, dispose. Only nearby objects receive sprites.                                                                                               |
| `PixelArt`           | Original cached placeholder textures                            | Generate sprites through canvas drawing; texture identity is stable and replaceable without changing world logic. Explicit teardown destroys owned textures.                                                |

## Generation algorithm and data

1. Create independent deterministic climate/resource streams.
2. For every tile, sample elevation, moisture, temperature, distance to river/tributary, coast, and volcanic region.
3. Classify the biome using the explicit precedence above. Store climate fields independently of biome IDs.
4. Assign one of four elevation levels, fluid type, border collision, and habitat-appropriate resource type/quantity.
5. Mark selected one-level natural contour transitions as ramps.
6. Reserve three capital and six outpost sites, flatten their logical surfaces, place structures and guaranteed starter resources.
7. Connect sites with three-tile-wide protected Manhattan corridors. Keep central road corridors separate from housing footprints.
8. Flood the reserved road graph and reject generation if any settlement center is unreachable.

The generated world has separate `Uint8Array` biome/elevation/fluid/flags layers, `Uint16Array` resource/quantity layers, climate `Float32Array` layers, and `Float64Array` regrowth/reaction timers. A changed-index set records only runtime differences for saving. Navigation revision changes when traversal changes, not whenever a berry is picked.

This is a **finite seeded world**. Chunk streaming bounds presentation; it does not unload authoritative creature identities or require procedural infinity.

## Rendering algorithm

The reference viewport is 1920×1080. A logical tile projects to 64 pixels; elevation lifts a surface or foot point by 16 pixels per level. [WorldProjection](../../../src/presentation/projection.ts) owns these display units. [DualGridAutotiler](../../../src/presentation/autotiler.ts) owns presentation boundary geometry. Terrain faces cover vertical differences. Cliffs, buildings, foliage and actors use stable foot-depth ordering; roof/canopy fading preserves player visibility.

Dual-grid water, mud, lava, ice, and road overlays sample globally adjacent logical corners. Cached bilinear-threshold masks generate two-pixel stepped shoreline patterns. Overlay precedence is mud, freshwater, saltwater, lava, ice, road. These rules are explicit so a chunk edge cannot invent a different transition. This is an implementation of the 16-configuration approach, not a dependency on a particular artist's tileset.

Nearby 32×32-tile chunks are cached as textures. At most a 3×3 neighborhood stays resident. Mutated visible chunks invalidate their cached texture. Resource sprites are removed when depleted. Camera and sprite movement interpolate from snapshots and round only at presentation.

The game has one walk surface per `(x,y)` tile. Ramps connect levels. Bridges are protected traversable corridors; walking both above and below the same bridge is outside this representation.

## Complexity and failure handling

- Generation: O(width × height), fixed number of passes, plus bounded settlement roads and connectivity flood.
- Climate sampling and autotile lookup: O(1) per sample/cell.
- Logical world memory: O(world area); explicit compact layers avoid per-tile objects.
- Presentation cache: O(resident chunks × chunk area), independent of total world size.
- Sprite depth sorting: O(visible objects log visible objects), not all simulated creatures.

Generation errors reject initialization without starting a partially playable world. Renderer failures display a WebGL error. Save generator-version mismatches reject restoration rather than regenerating different geography under an old save.

## Verification

[world.test.ts](../../../tests/world.test.ts) checks seed reproducibility, all seven biomes, connectivity across multiple seeds, continuous noise, every dual-grid mask, ramps, fluid capabilities, incremental paths, cache invalidation, and bounded spatial queries. [Browser journeys](../../../tests/browser/journey.spec.ts) check the rendered full world and world map. Visual QA inspects camera scale, foot anchors, shore seams, occlusion, and settlement landmarks; a headless noise test cannot establish visual correctness.

## Unified entity integration

The [shared entity specification](../unified-entities.md) defines body authority, stable identity transport, needs/sleep interrupts, finite supplies, food provenance and generic combat. Terrain generation remains version 1. Resource quantities remain authoritative; model proposals cannot bypass dietary, supply, survival or combat rules.
