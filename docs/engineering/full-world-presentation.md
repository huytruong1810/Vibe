# Full-world presentation, equipment and scene expansion

This specification extends the [HD Aqualia milestone](hd-presentation.md) to the whole playable world. Aqualia remains the first style and registration proof. Final full-world acceptance includes all nine settlements, their existing 42 buildings, three cave interiors, 33 human appearances and all eight nonhuman species. The contracts and runtime integrations described below do **not** establish that native art is complete or visually approved. Prototype fallback coverage, candidate production coverage and approved visual coverage must be reported separately.

The reference viewport remains 1920×1080, terrain units are 64 presentation pixels, and human animation frames are approximately 96×144 untrimmed pixels. Movement and combat require eight authored directions. Logical tile coordinates, terrain generation, settlement entrances, collision and essential outdoor routes remain authoritative. In particular, Aqualia's river setting does not authorize drawing new internal canals or changing its fluid/navigation layers.

## Production method and content scope

Use the updated **hybrid authoring and deterministic ingestion** workflow. Authored master sheets, settlement plates and portraits establish anatomy, palette and identity. Stylized Blender meshes and animation rigs may supply coherent eight-direction pixel bakes for humans, creatures and their compatible equipment layers. Pillow remains useful for controlled cleanup, palette/registration work, effects and repeatable export assembly; mathematical primitive drawing is no longer the exclusive production-art method. Preserve approved masters, `.blend` files, source scripts, pinned toolchain metadata and native-resolution exports under `art/source/`. Do not enlarge legacy sprites and label them native HD art.

Blender is an offline authoring tool, not a game runtime dependency or a change to the game's two-dimensional collision/height model. Render real directional poses from the rig; rotating a cardinal bitmap does not provide missing diagonal artwork. The initial human proof uses a 96×144 canvas with foot anchor `(48,132)`; Rivallie's proof uses 96×96 with anchor `(48,86)`. Other rigs require their own declared canvases/anchors and reviewed silhouettes rather than assuming Rivallie's proportions fit every species.

Keep authoring and CI ingestion separate. Neural matting/segmentation, when used, belongs to the authoring stage. Check in approved isolated cutouts or native bakes and their provenance so normal builds can run offline without downloading weights, calling an image service, requiring a GPU or launching Blender. Pin the actual Blender/export configuration and Python/image-processing dependency versions; record input hashes, generation settings, component masks and artifact hashes. Rebuild checks compare outputs against those committed inputs. They cannot independently reproduce an unrecorded master image or certify the quality of a model animation.

Registration checks must isolate the intended component, preserve long tails/limbs, measure actual ground contact rather than bounding-box centers, and reject edge contact. The current art handoff targets at least two transparent pixels around actor borders. Breathing generation must not introduce scanline holes, but a six-frame breathing cycle does not replace eight-direction walk/run, authored attacks, reactions or activity clips. Portraits still require the same identity/expression review regardless of whether a master is illustrated, generated, painted over or baked.

The [art architecture report](https://github.com/huytruong1810/Vibe/blob/art/hd-aqualia-slice/docs/art/art-engineering-handoff.md) and [latest handover context](https://github.com/huytruong1810/Vibe/blob/art/hd-aqualia-slice/docs/art/handover-context.md) describe this change on [art PR #2](https://github.com/huytruong1810/Vibe/pull/2). Their 742/790-frame and single-page measurements describe particular prototype/art-branch exports, not complete approved animation coverage or this integration's passing checks. One compact page is useful evidence for that batch; it does not replace the engine's multi-page catalog, per-page 2048×2048 limit or measured resident-texture budgets. Revalidate the actual imported source digest, generated catalog and coverage before recording integration results.

The canonical [content registries](../../src/content/definitions.ts) define identities. The settlement coverage is:

| Region | Capital  | Outposts             |
| ------ | -------- | -------------------- |
| Fire   | Pyrador  | Ashwatch, Mossforge  |
| Water  | Aqualia  | Reedhaven, Tidecross |
| Wind   | Zephyria | Breezerest, Sunmill  |

The 33 human appearances are the three player-origin variants and 30 named villagers. A game session still contains one player and 30 villagers; origin variants do not add two more simulated people. Every NPC uses its canonical `npc:` identifier, never a filename, array position or another named character's appearance.

Human portraits require nine expressions: neutral, warm, thoughtful, curious, concerned, amused, angry, sad and fearful. The vocabulary is shared by [dialogue validation](../../src/domain/dialogue.ts), [agent responses](../../src/domain/agents.ts) and [portrait lookup](../../src/presentation/assets/catalog.ts). At two runtime portrait sizes, 96×96 and 128×128, the delivery count is:

| Portrait delivery                   | Runtime exports |
| ----------------------------------- | --------------: |
| 33 humans × 9 expressions × 2 sizes |             594 |
| 8 nonhuman species × 2 sizes        |              16 |
| Total                               |             610 |

This count excludes master/source images, proof sheets and animation frames. The nonhuman row preserves the existing two-tier species portraits; it does not silently require nine expressions for every species.

## Shared contracts and approval stages

Use the versioned [source manifest](../../src/presentation/assets/source.ts) and [runtime catalog schemas](../../src/presentation/assets/catalog.ts). Source v2 describes untrimmed dimensions, pixel ground anchors, rig bindings and optional attachment sockets. Engineering converts these to packed page rectangles, trim registration and normalized runtime anchors. The compiler generates independent PixiJS pages with no rotation, full/half variants and a 2048×2048 page limit.

The same schemas define rigs, build profiles, layer sets, appearance recipes, portrait sets, effect definitions, furniture definitions and scene assets. Reuse these definitions and their generated JSON Schema instead of duplicating code listings in an art brief. IDs refer to canonical game content; source paths only locate files.

| Stage     | Meaning                                                            | Runtime/acceptance consequence                                                                  |
| --------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Proof     | A pose, anatomy, palette or scene experiment for review            | Review material; not production coverage                                                        |
| Candidate | Registered native exports proposed for integration                 | Structural validation can pass while visual approval remains pending                            |
| Approved  | Reviewed artifact matched to its source digest and approval record | Eligible for approved coverage when its required dependencies and clip matrix are also complete |

An artist cannot self-approve by changing `quality` or `stage`. Source manifests propose proofs/candidates; engineering owns the tracked approval records and generated artifacts. A changed source/dependency digest invalidates the corresponding approval. Missing or partial expression art must fall back to neutral art for **the same identity**, then to that identity's legacy neutral portrait, then to an explicit pending portrait. An unrelated person is never an acceptable fallback.

The [review gallery](../art/review-gallery.md) runs without Ollama in development. Actor clips, static environment/item frames, anchors and missing coverage remain inspectable. The gallery and structural validator support review; neither can automatically certify an appealing, coherent visual result. See the tracked [art contract](../art/contract.md), generated coverage report and approval records for the current production state.

## Modular humans and real equipment

[EquipmentService](../../src/domain/equipment.ts) owns the six explicit worn slots: head, torso, hands, legs, feet and back. The player retains exactly two nullable carried item instances. Worn garments occupy their authored slot, not a hidden storage bag. A carried garment can swap with its worn counterpart atomically. Unequipping requires a free carried slot, or the player must explicitly choose to drop the garment. Item instance identity and finite charges must survive these transfers and save/load.

Appearance recipes bind a human's body/build, face, hair and eligible garment/held layers to one rig. Layers share the frame's untrimmed registration and ground anchor; attachment sockets position weapons/effects without changing world collision or attack reach. Required missing layers fail coverage. The renderer must not flatten every possible clothing combination into a new production identity or allocate a separate ticker for each layer. See [presentation contracts](../../src/domain/presentation-contract.ts), the [renderer](../../src/presentation/renderer.ts) and [asset loading](../../src/presentation/assets/manager.ts).

Sword, spear and bow are actual carried combat equipment. Innate attacks remain available according to the combat rules. A bow uses a finite 12-charge arrow bundle in the other carried slot; a bundle is one item instance, not a general stack or an ammunition stash. Reserving a shot, releasing it, interruption and cancellation must conserve ammunition. Projectiles have authoritative scene identity, travel and collision; drawing an arrow cannot apply damage.

Villagers retain no personal resource inventories. Any NPC combat loadout is limited to its visible worn/held equipment and finite ammunition. Replenishment consumes actual supplies under deterministic rules. An invisible stockpile, unlimited arrows or cosmetic equipment that disagrees with attack capabilities is outside this design.

The [HUD controller](../../src/presentation/hud.ts) presents six worn slots and the two carried slots, including finite ammunition. Existing controls remain. Hold G to guard; release on key-up, blur, hidden-tab handling or modal entry. In inventory, focus a carried slot and press E to equip or Delete to drop; focus a worn slot and press U to unequip or Delete to explicitly drop. The buttons support ordinary keyboard focus and activation too. These intentions pass through the same validated worker command boundary as pointer actions.

## Pocket scenes and permissions

[SceneRegistry](../../src/domain/scenes.ts) registers one overworld, 42 building interiors and three caves: 45 pocket scenes, 46 scenes including the overworld. Stable scene IDs are separate from numeric storage codes. A scene owns its local terrain/navigation/resources, drops and relevant changes. Entities and projectiles have explicit scene membership; proximity, perception, attacks, interactions and environmental queries must not cross unrelated coordinate spaces.

Interior art covers floors, walls, entrances, beds, tables, work surfaces, pantries, basins, roof/canopy occlusion and region-specific materials. Cave art covers entrances, rock/floor transitions, resources and readable combat space. Furniture and decoration follow authored footprints and services. They cannot invent collision or obstruct an essential portal approach. Local maps render authoritative scene terrain, walls, props and portal locations. A world breadcrumb supplies context; a remembered world map is explicitly distinguished from the current local scene.

Private homes require deterministic permission. **Ask to visit** stages an invitation during the frozen conversation; permission is revalidated and committed when dialogue closes. A model's friendly wording is not an invitation credential. Entry checks current actor, scene, range, permission and destination access. Closing dialogue, opening a map or finishing an asset request does not grant invulnerability.

The [shared interaction selector and portal controller](../../src/presentation/ui/interaction.ts) keep contextual prompts and E consistent. Eligible interactive furniture and allowed portals are considered within 1.5 tiles; villagers are considered within three. The closest candidate wins. Exact ties prefer portal, furniture, then villager, with stable IDs breaking ties within each category. Noninteractive decoration is ignored. A furniture interaction submits its prop ID through the worker boundary for rest, work, washing, eating or equipment service; the UI cannot apply physical effects by changing presentation state. Required destination assets load asynchronously before an `enterPortal` command is submitted. While waiting, normal simulation continues. A changed session, scene, target, permission or range discards the request; the worker validates again before transferring the actor.

## Dialogue expressions and presentation authority

The latest spoken NPC line supplies the current dialogue expression. Subsequent player/system lines and a pending inference request do not reset it. An initial or migrated NPC line without emotion uses neutral. Portrait lookup preserves the same character identity throughout loading and fallback. The displayed dialogue input, focus and accessible control names remain stable during snapshots. See [the pure expression selector](../../src/presentation/ui/dialogue.ts) and [HUD read model](../../src/presentation/ui/state.ts).

Worker action deadlines still govern windup, active and recovery phases. Movement cadence follows actual accumulated distance; interrupted attacks, sleep, defeat and recovery select explicit states. Shared simulation/presentation clocks drive weather and ambient effects. Pausing freezes world animation, and reduced motion retains essential combat readability. Neither an expression nor an effect can authorize a command or move a hit window.

## Persistence and compatibility

This expansion targets save schema **v4**, content **v3** and catalog **v2**. The generator version and outdoor geography remain stable. [Save validation and migration](../../src/domain/save-schema.ts) must preserve IDs, positions, inventory, progression, relationships, companions, memories and commitments while initializing scene/equipment metadata deterministically. Older worlds begin with their existing population; presentation changes do not regenerate terrain or create extra actors.

Persist scene membership through stable scene bindings; do not rely on a code remaining the same array index after content changes. Scene deltas, finite resources/drops, item identity/charges, equipment, active combat/projectiles and invitation state need explicit restore handling. Disposable cue queues, decoded textures, browser focus and portrait-loading promises are not authoritative saved state. Restore changes the world session so obsolete asynchronous work cannot submit into the new world.

## Ownership and delivery backlog

Engineering owns simulation/worker/save interfaces, controllers, renderer, asset compilation, generated catalogs and approval records. Art owns source artwork, Pillow generators, registration metadata, visual specifications, review sheets and coordinated isolated views/styles. Keep those surfaces separate in dedicated worktrees/branches. The engineering integration checkout is `.cache/hd-integration`; it is an integration workspace, not an art output directory or an invitation to modify another worktree's source. Root integration owns Git actions; contributors do not force-push or merge main automatically.

Forward this production brief with the published contract commit and PR references supplied by engineering:

> Base the art work on the published full-world contract commit. Follow the tracked source-v2 manifest, rigs, clip matrix, coverage and approval rules. Preserve Hearthwild's existing anatomy and canonical identities. Use approved master artwork and Blender pixel bakes where appropriate, with pinned offline ingestion, deterministic registration/export checks and committed source inputs. Pillow supports cleanup and reproducible export assembly; do not reduce the visual target to primitive programmer art.
>
> Begin with native 1920×1080 target scenes and player/Rivallie registration and pose proofs before bulk production. Use 64-pixel terrain units, approximately 96×144 untrimmed human frames, eight authored movement/combat directions and shared rig/socket metadata. Do not upscale prototypes or rotate cardinal sprites to manufacture diagonal coverage.
>
> Deliver all three capitals and six outposts, the existing 42 buildings and three cave interiors, all 33 human appearance recipes, eight creature species, equipment and move/effect sets. Human portraits need all nine canonical expressions at 96 and 128 pixels: 594 human exports plus 16 creature exports, 610 total. Preserve outdoor geography; do not add canals to Aqualia.
>
> Deliver source PNGs/scripts, registration metadata, complete manifest references, review sheets and gallery captures. Keep proof and candidate stages honest. Do not edit simulation, worker, save logic, generated catalogs or approval records. Missing identities, frames or expressions must be listed explicitly; never substitute another named character. Run the source/asset checks specified by engineering and request review of a concrete, reproducible export set.

Production can proceed in reviewable groups: rig/registration proofs; regional ground/architecture; all scene entrances and interiors; modular human identities and equipment; creatures and action clips; expression sets; furniture and effects; then full-world visual and performance review. Every group needs canonical bindings and failure/fallback evidence before its art is treated as approved.

## Verification and remaining evidence

The required checks include schema rejection and approval-digest changes, missing identities/layers/expressions, trim/socket alignment, cross-page animation, combat phase synchronization, projectile/ammunition conservation, gear/full-hand behavior, guarded modal transitions, permission changes during portal loading, scene-local queries, save migration and stale restore callbacks. The [UI unit suite](../../tests/ui-v2.test.ts) and [equipment/guard browser journey](../../tests/browser/ui-v2.spec.ts) exercise the corresponding interfaces; their presence does not claim that every current integration check has passed.

Final evidence must include the full automated suite and browser journeys, native art approval/coverage, stable rendering at the reference and smaller desktop viewports, scene/map/portrait captures, measured integrated-GPU loading/residency/render/UI costs, separation of mocked inference from real Ollama contention, and a 28-day ecology soak after final simulation/worker changes. Keep the High/Balanced/Low 512/256/128 MiB texture budgets and measured adaptive quality rules. No universal 1080p/60 FPS or model-latency guarantee follows from the architecture alone.

Native production art, complete clip coverage, full-world approval, final benchmarks and final soak evidence remain acceptance gates until their concrete results are recorded. A passing prototype build or an implemented interface is not a substitute for those deliverables.
