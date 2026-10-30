# Hearthwild Aqualia art contract, version 1

This is the shared production boundary for the HD Aqualia milestone. The reference
viewport is 1920×1080; one logical terrain tile occupies 64 presentation pixels.
Human frames use approximately 96×144 untrimmed pixels. These dimensions do not
change world coordinates, collision, navigation, combat ranges or save-v3 data.
Hearthwild's creature anatomy and portrait identities remain the visual reference.

The first delivery is a native-resolution Aqualia target scene, Aqualia player and
Rivallie pose proofs. Submit these for visual review before producing the remaining
slice. An engineering validator cannot approve anatomy, style or visual quality.
An exported `quality: "hd"` value is a production declaration, not automatic art
approval. Do not upscale prototype frames and count them as native HD coverage.

## Ownership and files

Art owns untrimmed source PNGs, registration metadata, pose/scene proofs, and
approved isolated UI views. Engineering owns simulation, worker interfaces,
renderer, controller logic, asset tooling and generated runtime bundles. Source
files belong under `art/source/`; `art/source/manifest.json` declares them. Run
`npm run assets:build` to compile into `public/assets/generated/`. Do not hand-edit
the generated catalog or page JSON. Art PRs target `eng/hd-presentation`, not main.
Keep secrets, local settings and caches out of commits.

## Canonical identities

Bindings use the game's actual content identifiers, not image filenames or village
array indices. NPC IDs have a colon: `npc:caelum`, not `npc_caelum`. Aqualia's ten
IDs are `npc:caelum`, `npc:marina`, `npc:neris`, `npc:reed`, `npc:willa`, `npc:oren`,
`npc:mira`, `npc:lark`, `npc:dara`, `npc:finn`. Neris, Reed, Willa, Oren, Lark, Dara
and Finn have no matching prototype sprite. Never substitute another named human.

Origin IDs are `pyrador`, `aqualia`, `zephyria`; the first production player is
`origin/aqualia`. Species IDs are `ignicap`, `rivallie`, `zephyrit`, `mireling`,
`cindermoth`, `steamshell`, `bramblefang`, `marshstalker`. Human elemental variants
do not change a human's biological species or canonical NPC identity. Item IDs
come from `itemIds` in [content definitions](../../src/content/definitions.ts),
including `tool-head`. Every named portrait must match its appearance binding.

## Shared data contracts

[AssetCatalogSchema and AnimationClipSchema](../../src/presentation/assets/catalog.ts)
are authoritative. Build generates [runtime JSON Schema](asset-catalog.schema.json)
and [source JSON Schema](source-manifest.schema.json). All objects reject unknown
fields. The runtime loader validates the catalog again before allocating textures.

The artist-owned manifest has `schemaVersion: 1`, `frames`, `appearances`, `clips`,
and optional `portraits`. Each source frame has a globally unique portable `id`,
a PNG `path` relative to `art/source`, and normalized `anchor: {x,y}` measured in
the complete untrimmed frame. Paths are case-sensitive even on Windows. Absolute
paths and parent-directory escapes are rejected. Use native-sized, transparent
RGBA PNGs; preserve at least one transparent registration pixel around HD actor
content. Terrain material tiles may be opaque.

An appearance has `id`, `kind`, `contentId`, `quality`, `clipIds`, optional static
`frameId`, and optional `fallbackId`. Kinds are `species`, `npc`, `origin`, `item`,
`environment`, `fallback`. `id` is a catalog identifier; `kind` plus `contentId`
is the unique gameplay binding. A source appearance replaces the complete legacy
appearance and its clips atomically. Declare the complete new clip set; merging
partial HD clips with undeclared old ones would hide coverage gaps.

Each clip declares `id`, `appearanceId`, `state`, `facing`, ordered `frameIds`,
`fps`, `playback`, optional `stride`, optional `moveId`, optional `phases`.
Facings are `n, ne, e, se, s, sw, w, nw`, measured clockwise with screen-down south.
Playback is `loop`, `once`, `distance`, or `combat`. A distance clip requires a
positive `stride`, in world tiles per full cycle. Locomotion is advanced by actual
distance, not elapsed rendering frames. A combat clip requires `moveId` and
exclusive-end frame ranges `windup`, `active`, `recovery` partitioning the entire
clip. Example for twelve frames: `[0,4]`, `[4,7]`, `[7,12]`. These ranges select
artwork during authoritative simulation phases; artwork never sets hit timing.

The compiler owns frame `rect` in its page, `sourceSize`, `trim` and page IDs.
Trimming is an optimization; it must not move the untrimmed ground anchor. Frame
IDs remain independent from page names so one animation can span pages.

## Required clip matrix

The executable matrix is [CLIP_MATRIX](../../src/presentation/assets/coverage.ts).
Each row applies to the Aqualia player, ten villagers and all eight species;
dash is player-only. Cardinal sets may use four authored directions. Eight-way
sets require real diagonal artwork. Mirroring or rotating a cardinal pose does
not count as a new authored diagonal.

| State                               | Frames per facing | Facings | Playback     |
| ----------------------------------- | ----------------: | ------- | ------------ |
| idle                                |                 6 | 8       | loop         |
| walk / run                          |            8 each | 8       | distance     |
| attack / strike and element moves   |       12 per move | 8       | combat       |
| guard / hit                         |            4 each | 8       | once         |
| player dash                         |                 6 | 8       | once         |
| eat / drink / bathe / work / social |            6 each | 4       | loop or once |
| sleep                               |                 4 | 4       | loop         |
| downed / recovery                   |            6 each | 4       | once         |

Keep protected downed/recovery visibly distinct from wildlife carrion. Corpses do
not sleep, recover HP or animate as living actors. Carrion food quantities remain
simulation-owned. Attack frames may vary presentation by species, while move IDs
remain `strike` and `element` until the authoritative move registry adds others.

Supply identity-matched portrait PNGs at 96×96 and 128×128 via source `portraits`
records (`kind`, `contentId`, `hud96`, `hud128` source paths). Retain optional
master paintings as source only; the runtime does not load 1024px masters for HUD.

## Environment bundle

The executable minimum is `REQUIRED_ENVIRONMENT_IDS` in the coverage module:
ground grass/dirt/sand/freshwater; freshwater shoreline; grass cliff and ramp;
oak canopy and tree; Aqualia house, well, waystone and hearth; and all six plant
resource families in healthy, harvested and burnt states. Bind with kind
`environment` and the exact exported IDs. Additional roofs, workstations,
foreground vegetation, variations and transition materials use explicit extra
IDs. The renderer must preserve existing collision and essential routes.

Ground tile exports align to the 64px grid. Elevated walk surfaces use the central
projection's elevation displacement. Buildings, trunks, resources and bodies share
their untrimmed ground anchor; roofs and foreground canopies are separate layers
so the player remains visible. Proofs must show shore junctions, cliffs, ramps,
roof/canopy occlusion, day/night and rain. Authored visual detail may extend beyond
the collision footprint; it cannot silently change that footprint.

## Packing, loading and budgets

[assets-build.ts](../../scripts/assets-build.ts) uses the official
[@assetpack/core texture-packer](https://pixijs.io/assetpack/docs/guide/pipes/texture-packer/)
with 2px padding, no rotation, preserved trim registration and maximum 2048²
pages. It emits full and nearest-neighbor half variants. Every emitted Pixi atlas
has its own actual PNG in `meta.image` and no automatic cross-page references.
The typed catalog resolves clips across pages. Low-resolution page layout can
differ, so a full page's `variants` may list multiple half pages; budget accounting
deduplicates atlas URLs.

[AssetManager](../../src/presentation/assets/manager.ts) validates a catalog,
reserves bounded page memory, awaits `Assets.load`, then exposes textures behind
leases. Releasing a lease invalidates its texture access; zero-reference pages
remain a bounded cache until budget eviction or disposal. High/Balanced/Low
budgets are 512/256/128 MiB decoded RGBA, with Balanced default. Compressed PNG
file size is not GPU memory. Old and replacement bundles must fit during an
overlapping swap; an over-budget swap is rejected for an explicit fallback/retry.
Cancellation cannot abort Pixi's shared underlying decode, but it immediately
rejects the obsolete caller and never publishes its textures. Catalog generations
and disposal prevent late callbacks from reviving old presentation state.

## Checks and review evidence

### Terrain material registration

Ground materials `ground_grass`, `ground_dirt`, `ground_sand` and
`ground_freshwater` are 64×64 full-tile images. Freshwater corner transitions use
explicit environment content IDs `shore_freshwater_mask_1` through
`shore_freshwater_mask_14`: 64×64 transparent overlays, with NW=1, NE=2, SW=4,
SE=8. Mask 0 draws nothing; mask 15 uses the full freshwater material. These
are content bindings, not filename inference. Mask previews belong in the gallery.
The original generic `shore_freshwater` proof may remain as reference but cannot
substitute for the fourteen transition masks.

`cliff_grass` is a 64×16 repeatable strip per elevation step; `ramp_grass` is
64×64. Houses, trees and canopy exports retain untrimmed foot registration. The
renderer layers materials without changing collision or protected access routes.
Strides are positive world-tile distances for walk/run clips and must use
`playback: "distance"`; source pixel dimensions must not determine movement speed.

```sh
npm run assets:build
npm run check:assets
npm run check:assets:hd
npm test -- tests/assets.test.ts
```

General checks enforce exact filename case, existence, canonical identities,
unique IDs and clip bindings, frame bounds, no rotation, trim/anchor registration,
independent pages, full/half coverage, portrait sizes and decoded memory estimates.
HD actor exports additionally require transparent registration margins. The HD
gate fails for missing native-detail appearances, directions, frame counts, move
phase mappings, matched portraits and environment states. Generated
[coverage.json](coverage.json) reports specific unmet requirements. It currently
reports prototype coverage only; no native HD appearance is approved.

The development gallery (`/?gallery=1`) is independent from playable-game Ollama
entry. Review frame stepping, facing comparisons, anchor overlays and environment
lighting there. Attach gallery captures and native source proofs to the art PR.
Automated coverage proves structural completeness, not artistic approval or
measured integrated-GPU performance.

## Legacy and dependency notes

The supplied collection contains 101 static sprites and a custom 1006-rectangle
catalog across 55 image sheets. Its `meta.image: "atlas.json"` makes it unsuitable
for direct Pixi Spritesheet loading. The adapter reads each rectangle's explicit
`image`, validates bounds and compiles only canonically bound, referenced frames.
The original collection stays intact. Missing named humans use an explicit generic
prototype fallback, never another named person's art.

AssetPack 1.7 is build-only. Its dependency graph includes image/font tools beyond
the PNG texture-packer pipe used here. Narrow overrides use sharp 0.35.5, which
includes the [librsvg security fix](https://github.com/advisories/GHSA-wq5f-xc86-pv6w),
and minimatch 10.2.6, beyond the patched
[10.2.3 ReDoS release](https://github.com/advisories/GHSA-23c5-xmqv-rm74).
The PNG build and validator run against these exact overrides. `npm audit` still
reports the unused font-converter chain's Zod 3 advisory; its consumers have no
compatible patched Zod 3 release, and automatic fixes propose an incompatible
AssetPack downgrade. The
pipeline accepts reviewed repository PNG inputs and fixed tool-owned glob
patterns, not runtime or user-uploaded conversion jobs. Runtime dependencies do
not include those converters. Track upstream updates and revalidate before
expanding to untrusted input formats or additional pipes.
