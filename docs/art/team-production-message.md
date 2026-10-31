# Copyable briefing for the two art agents

Engineering is ready to receive the Claude game director's priorities through the
project owner. Record each directive's intended result, affected scope, acceptance
evidence and dependencies. Flag contract changes before producing a large batch;
do not guess that an unsupported runtime feature already exists.

## Published baseline and required reading

Merge `origin/eng/hd-presentation` normally into the art integration branch. The
published engineering reference is **a3fc957c43467796a69a8ec57a0d03727def83d2**.
Engineering [draft PR #1](https://github.com/huytruong1810/Vibe/pull/1) targets
`main`; art [draft PR #2](https://github.com/huytruong1810/Vibe/pull/2) targets
`eng/hd-presentation`. Use separate worktrees, coordinate branch ownership, and
avoid force pushes or automatic main merges.

Read these together before exporting:

1. [Full-world brief](../full-world-presentation.md): content, equipment, interiors and UX scope.
2. [Asset contract v2](contract-v2.md): actual supported metadata and approval rules.
3. [Base art contract](contract.md): canonical bindings and animation registration.
4. [Engineering response](engineering-alignment-response.md): unresolved handoff/rebuild issues.
5. [Physical presence](../physical-presence.md): height, mass, recoil, footprints and camera shake.
6. [Source manifest schema](source-manifest.schema.json) and [runtime schema](asset-catalog.schema.json).
7. [Content definitions](../../src/content/definitions.ts) and [villager personas](../../src/content/villagers.ts).

Engineering has implemented nine-emotion dialogue propagation, modular pose
composition, six worn slots, two carried slots, finite bow ammunition, scene
membership, permissioned entrances and save v4. There are 42 building interiors
and three regional cave scenes sharing the world clock and population budget.
Current room layouts and fallback artwork are reference content. Implemented
interfaces do not mean the final native artwork or every authored room is approved.

## Suggested split for two agents

**Agent A — actors, equipment and portraits:** own humanoid/creature source rigs,
pose tables, body/hair/face/clothing layers, attachment artwork, item/weapon views,
expression portraits and their authoring provenance. Act as the sole integrator
of the shared `art/source/manifest.json` unless the director names another owner.

**Agent B — environment, furniture, effects and UI visuals:** own regional tiles,
transitions, buildings/interior modules, cave modules, furniture art, effects and
isolated approved UI views. Supply proposed manifest records in a separate staging
file for Agent A to integrate. Staging files are review material, not automatically
loaded runtime APIs. Coordinate shared palettes and scene compositions with A.

Each agent should use its own branch/worktree if both need concurrent commits.
Reconcile their changes through the art integration branch/PR. Neither edits the
other's source files without coordination. Engineering owns `src/domain`, worker
interfaces, renderer, UI controllers, schemas, compiler, generated catalogs and
approval records. Run the compiler for validation, but leave generated output
changes to engineering integration. Do not edit frozen legacy ledgers to bypass
missing assets. No direct changes to the other agent's worktree.

## Authoring and registration

Hybrid authoring is supported: reviewed master artwork, Blender pixel bakes and
Pillow construction/ingestion. Keep inspectable sources, exact toolchain pins and
immutable bake/master inputs. Production limb motion needs genuine authored or
rig-baked poses; segmented turnarounds and breathing warps alone do not supply a
walking/combat set. Keep the original identity and anatomy references.

- Viewport: **1920×1080**, orthographic world axes, **64×64** display tiles.
- Elevation: **16 display pixels** per existing elevation step. No perspective shrinking.
- Standard human canvas/root: **96×144**, integer **(48,132)**.
- Rivallie proof canvas/root: **96×96**, integer **(48,86)**.
- Other creatures need reviewed anatomy-specific canvases/roots. Expanded attack,
  tail or reclining canvases are allowed with explicitly registered anchors.
- Keep at least two transparent pixels around actor exports for the current art
  QA target. Do not crop limbs, tails or weapons to fit a convenient canvas.
- Supply separate transparent native PNG frames, exact `sourceSize`, `anchorPx`,
  rig/socket metadata and trim-safe registration. Normalized anchors are derived
  from integer coordinates, not rounded approximations such as `0.92`.
- Eight movement/combat facings: **N, NE, E, SE, S, SW, W, NW**. Do not rotate or
  mirror anatomy to manufacture missing directions. Agree on the target-scene
  camera before bulk baking; the proposed 18°/22° pitches are not visual approval.
- Keep shadows, trails, splashes and particles separate from actor body frames.

## Minimum actor coverage

| State                                             | Frames per facing | Facings    |
| ------------------------------------------------- | ----------------: | ---------- |
| Idle                                              |                 6 | 8          |
| Walk / run                                        |            8 each | 8          |
| Innate strike / elemental attack                  |           12 each | 8          |
| Sword slash / spear thrust / bow shot, for humans |           12 each | 8          |
| Guard / hit                                       |            4 each | 8          |
| Player dash                                       |                 6 | 8          |
| Eat / drink / bathe / work / social               |            6 each | N, E, S, W |
| Sleep                                             |                 4 | N, E, S, W |
| Downed / recovery                                 |            6 each | N, E, S, W |

All layers consume one shared pose sample. Supply consistent sockets for dominant
and support hands, back, secondary carried item and any declared effect emission
point. Default humans are right-handed; bow poses hold with the left and draw
with the right. Garment slots are **head, torso, hands, legs, feet, back**. Author
compatible slender/standard/sturdy builds rather than stretching one body. No
bags, quivers or pockets that imply additional functional storage.
Do not infer build or anatomy from pronouns; preserve the reviewed identity and
use explicitly authored physique/build choices.

Walking/running are in-place, distance-driven cycles. Export stride in world
tiles per full cycle and show planted-foot previews; initial human defaults are
1.5 walk / 2.5 run. Combat frame ranges are exclusive-end windup/active/recovery
ranges; simulation controls the deadlines at **30 ticks/second**:

| Move          | Windup / active / recovery ticks |
| ------------- | -------------------------------- |
| Innate strike | 4 / 2 / 9                        |
| Element       | 7 / 3 / 16                       |
| Sword slash   | 6 / 3 / 12                       |
| Spear thrust  | 8 / 2 / 14                       |
| Bow shot      | 12 / 1 / 12                      |

Twelve art frames do not imply twelve game ticks. Preserve distinct living sleep,
living downed/recovery, edible unbonded wildlife remains and depleted remains.
Humans and bonded companions never become edible remains.

Full actor scope is **41 appearances**: three player origins, 30 canonical
villagers and eight species. Aqualia's first acceptance subset remains 19.
Species are Ignicap, Rivallie, Zephyrit, Mireling, Cindermoth, Steamshell,
Bramblefang and Marshstalker. Use profile/species IDs from content, never filenames
or village numbers to infer identity. The Aqualia villagers are Caelum, Marina,
Neris, Reed, Willa, Oren, Mira, Lark, Dara and Finn.

## Portraits, items and environment

Every human identity needs **neutral, warm, thoughtful, curious, concerned,
amused, angry, sad, fearful**, each at **96×96 and 128×128**. Preserve face,
hair, costume identity, lighting and framing across expressions. That is 297
human expression masters / 594 runtime exports; creature base portrait pairs
remain a separate 16 exports. The runtime falls back to the same identity's
neutral portrait, then an explicit placeholder. Never create fake NPC IDs for
expressions or substitute another named character.

Read canonical item IDs from content, including garments, sword, spear, bow and
`arrow-bundle` (12 finite arrows). Supply distinct icon, ground and held views
where used; an inventory icon is not a held weapon. Weapons need grip/clearance
previews, and arrows need separate flight art. NPC equipped weapons/ammunition
are finite; they do not imply a personal resource inventory or unlimited loot.

Environment covers all seven existing biomes, three capitals, six outposts,
42 existing building footprints and three regional caves. Preserve generated
roads, water, collision, ramps, entrances and positions. Do not paint invented
internal canals as a seed-42 layout. Produce modular regional kits with separate
roofs/canopies, foreground occlusion, resource states and service furniture.
Furniture art metadata must match engineering's actual placements and approach
points; artwork cannot create storage, food, access permissions or collision.

Effects declare frames, registration/socket, phase, bounded lifetime/instance
count, layer, blend/tint permissions and reduced-motion behavior. Telegraphs must
match actual move shapes. Fire/water/wind artwork cannot cause damage or reactions.
Keep environmental animation on shared clocks; no timer per leaf or sprite.

UI views must work at 1920×1080 and 1024×768 using readable DOM text. Cover compact
HUD, two carried/six worn slots, inspection, dialogue expressions, generated maps,
journal, entrances, setup/settings and downed recovery. Keep focus stable and
provide keyboard alternatives. Dialogue pauses the global world and stages
physical intentions; inventory is nonmodal. UI art must not invent currencies,
statistics, functional storage or unsupported interactions.

Retain WASD/arrows for movement, E interaction, J primary attack, K elemental,
Space dash, G held guard, Q carried-slot swap, R gathering, C crafting, I
inventory/equipment, F inspection, L journal, M map, 1/2 carried-item use, and
Escape close/back. Keep names, counts, dialogue and stats as DOM text rather
than baking them into decorative images. Item icons use 96×96 artwork; held and
ground representations are separate registered exports.

## New physical feedback: what art must preserve

Height and mass are authoritative durable simulation values. Build-relative
movement/attack/defense factors are bounded; relative mass drives short,
collision-constrained recoil. XP and base maximum HP remain separate. Camera
shake follows committed impacts, is capped and respects reduced motion. Soft
surfaces receive bounded cosmetic footprints; mud can add a small lean.

Do **not** bake camera shake, world displacement, recoil translation or footprints
into actor frames. Keep foot roots and grips registered. Do not stretch artwork
to simulate mass or silently change collision footprints. Show deliberate weight
transfer and stable contacts in the authored poses. Camera/lean feedback supplements
the gait; it does not replace limb animation. Fliers must retain correct hovering
and travelling poses. No new physique fields are required in art manifests.

## Packaging, review and immediate next delivery

The atlas cap is **2048×2048 per page**, with multiple pages supported. Resident
High/Balanced/Low budgets are **512/256/128 MiB**. Sixteen MiB describes one full
2048² RGBA page, not a whole-game limit. Engineering owns official AssetPack
compilation, full/half variants, page metadata and runtime leases.

Use v2 `proof` / `candidate` stages. Supply provenance with exact input hashes,
scripts, palettes, pose/camera settings, model/material dependencies and toolchain
pins. A `.blend` file alone is insufficient if external textures or scripts are
missing. Keep baked inputs separate from derived exports. Fix the old rebuild
path so it cannot overwrite Blender exports with procedural mesh proofs.
`--check` must not create directories, bytecode, downloads, extracted cutouts or
rewritten metadata. Routine CI should use committed inputs without Blender or
neural inference; full bake reproducibility is a separate recorded check.

Deliver the next batch in this order:

1. Merge the engineering baseline and reconcile the manifest/pipeline with v2.
2. Submit one actual-geometry Aqualia target scene plus native player and Rivallie
   registration/pose proofs, with common camera and anatomy review evidence.
3. Complete player/Rivallie locomotion and one combat/weapon layering proof.
4. Continue independent environment, portrait, garment and UI candidates while
   earlier batches are reviewed; coordinate any bulk actor production with the director.

Every batch includes source code/models/masters and pins, deterministic command,
native exports, exact manifest or staged records, contact sheets, moving previews,
root/joint/socket overlays, native 1× and nearest-neighbor enlarged captures,
coverage inventory, known limitations and a concise commit/PR summary.

Run `npm run assets:build`, `npm run check:assets` and relevant tests against the
merged engineering contracts. Use the review gallery at `/?gallery=1`; it is
independent of Ollama entry. Source-only art CI compiles/validates candidates;
engineering integration owns generated-output reproducibility. Ask engineering
to review a concrete commit, with exact asset IDs and preview paths.

Frame counts, repeated files, successful hashes and `quality: "hd"` are not
visual approval. Report **declared assets**, **complete structural clip matrix**
and **approved native art** separately. Current integrated engineering evidence
is 233 tests, 12 Chrome journeys and a passing 28-day soak; these figures do not
approve the art branch. Approval records remain engineering-owned and tied to
the exact reviewed source digest.
