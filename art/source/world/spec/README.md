# World spec (WLD-4.4): protected

[`world_schema.json`](world_schema.json) is the one map contract. The authoring tool
(`worldforge`), the engine importer (WLD-M1) and CI validation (WLD-M4) all read it. Change it
only under DOC-5, and bump `schemaVersion` when you do.

- `vendor/ldtk-1.5.3.schema.json` is the official LDtk JSON schema, copied from
  `deepnight/ldtk` tag `v1.5.3` (`docs/JSON_SCHEMA.json`); its sha256 is recorded in
  `world_schema.json`. The `.ldtk` project must validate against it.
- Region plans live in [`../regions/`](../regions/). Region bibles live in
  [`docs/doctrine/regions/`](../../../../docs/doctrine/regions/).

## World layout

- There is one LDtk project, `art/source/world/hearthwild.ldtk`, using the `Free` world
  layout. Each level sits at `worldX/worldY` in pixels, on a 32 px grid, so the world tile
  of a level tile is `(worldX/32 + cx, worldY/32 + cy)`.
- World tiles outside every level are void: not walkable, not drawn.
- Levels are named `<region>_<area>`, for example `aqualia_village` and
  `aqualia_riverlands`. Neighbouring levels share an edge, and paths must meet across it.
- Every level has the `levelFields` from the schema: `region`, `biome`, `ambience` and
  `music`.

## Mapping onto the engine's `ChunkStore` (`src/domain/world.ts`)

| ChunkStore field                                       | Source                                                                                                                                                                                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `biome`                                                | The `biome` layer value if present, else the level `biome` field. The order matches the engine `Biome` enum (riverlands = 0 … swamp = 6).                                                                                                 |
| `elevation`                                            | The `elevation` layer value (1 or 2); empty = 0.                                                                                                                                                                                          |
| `fluid`                                                | From the `water` layer: `fresh_*` → `Freshwater`, `salt_*` → `Saltwater`. A tile with a `boardwalk` or `bridge` path is a deck: fluid `None`, though presentation still draws the water under it. A dry tile with ground `mud` → `Mud`.   |
| `flags`                                                | `Solid` ← collision `solid`. `Ramp` ← collision `ramp`. `Protected` ← collision `protected`. `Road` ← any `paths` value. Deep water is **not** Solid: traversal rules decide who swims (`PLAYER_TRAVERSAL`).                              |
| `resource`, `quantity`                                 | `ResourceNode` entities: `itemIds.indexOf(resourceId) + 1`, with quantity defaulting to the engine's.                                                                                                                                     |
| `buildings[]`                                          | `Building` entities: `id = sceneId`, the footprint from the entity area, the door from the `door` field, plus `village` and `name` from the `settlement` field. The footprint is painted solid on the collision layer except at the door. |
| `moisture`, `temperature`, `drainage`, `coastDistance` | Derived by the importer: distance to water, a biome constant, and distance to salt water. Codex owns the formulas and records them in the WLD ADR.                                                                                        |

The importer must keep the movement semantics of `SurfaceRules` (`world.ts:403-436`): a
step is allowed between equal elevations, or across a difference of 1 when either tile is a
`Ramp`. Worldforge `check` simulates exactly this rule for reachability.

## Entities in the engine (WLD-M2)

- `Settlement`, `Building`, `Entrance` and `VillagerAnchor` replace `SettlementPlanner`.
  Each Aqualia villager needs `home`, `work` and `square` anchors at minimum, plus
  `shrine` and `outpost` if their schedule uses them.
- `Habitat` regions seed populations. `PlayerSpawn id=new-game` is the start.
- `AmbienceEmitter`, `LightSource` and `MusicZone` are presentation-only (AMB-1.1).
- `Landmark`, `StorySpot` and `Waystone` feed living minds (AGT-3, AGT-6) and the plan
  check.
- `FestivalRoute` drives LIF-4.2.

## Footsteps (AMB-5)

A tile's surface is its `paths` value, else its `water` value, else its `ground` value,
using each value's `surface`.

## Who writes what

- **Region plans**: the director, Claude, or codex under DOC-5.
- **Maps**: the blender agent writes `.ldtk` only through `worldforge` (WLD-4.3). The
  director may also edit directly in LDtk 1.5.3.
- **Auto-layer tiles**: the engine autotiles from IntGrid (WLD-4.5). Nobody relies on
  LDtk auto-layer tiles.
