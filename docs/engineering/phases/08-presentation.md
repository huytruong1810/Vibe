# Phase 8 — lighting, weather, audio, accessible HUD

## Components and interfaces

Complete source: [renderer.ts](../../../src/presentation/renderer.ts), [art.ts](../../../src/presentation/art.ts), [hud.ts](../../../src/presentation/hud.ts), [audio.ts](../../../src/presentation/audio.ts), [style.css](../../../src/style.css), and [composition root](../../../src/main.ts).

| Component            | Owns / responsibility                                                             | Interface, limits, lifecycle                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WorldRenderer`      | Pixi application, visible chunks/props/entities, camera, indicators               | Initialize, set terrain, apply snapshot, select, settings, stats, dispose. Never owns a physics clock or inventory.                                      |
| `PixelArt`           | Cached original code-drawn textures                                               | People, eight nonhuman creatures, houses, resources, trees, cliffs, landmarks, and lights. Nearest-neighbor source textures; replaceable asset boundary. |
| `LightingRenderer`   | Ambient overlay and bounded warm lights                                           | Derive night darkness from authoritative hour; render limited nearby settlement lights. No gameplay visibility calculation depends on GPU pixels.        |
| `ParticlePool`       | Fixed 160-entry position/phase arrays                                             | Reuse weather particle state; no unbounded emission. Cosmetic updates use the shared simulation-derived presentation clock.                              |
| `WeatherRenderer`    | Weather graphics and pooled particles                                             | Consume authoritative weather/season; quality/reduced-motion control counts. Snow, rain, petals/leaves, clear-day motes are presentation.                |
| `AudioDirector`      | Web Audio context, gain, ambient source, short synthesized cues                   | Explicit user-gesture enable/mute. No autoplay requirement. Stop sources and close context on dispose.                                                   |
| `HudPresenter`       | Native dialog lifecycle, tabs, selection, input forms, map image, status messages | Send typed commands; render escaped text and public snapshots; never authorize game effects.                                                             |
| `Quality` / settings | Low, medium, high; reduced motion; developer overlay                              | Visual effects may change without changing authoritative state or random streams.                                                                        |

## Rendering data flow

The worker publishes compact numeric entity packets and bounded UI records. The renderer copies coordinates into its presentation cache and interpolates toward the next packet. The composition root then transfers the disposable buffer back to the worker pool. Main-thread UI code uses explicit metadata rather than reading a detached array.

Visible entities, resource sprites, structures, landmarks, and cliff faces are created only near the player. Far-away creatures stay simulated but do not each receive a Pixi sprite. A 3×3 chunk neighborhood uses cached textures; changed tiles dirty the corresponding cache. Stable foot-depth keys let roofs, foliage, and cliff faces cover actors behind them.

The reference viewport is 1920×1080 with 64-pixel terrain units. WorldProjection owns feet/elevation, camera conversion, picking and fitting. Adaptive framebuffer scale preserves camera coverage and DOM clarity. The [HD specification](../hd-presentation.md) and [art contract](../../art/contract.md) supersede the original placeholder dimensions.

Day/night lighting uses an ambient overlay and additive cached warm-light textures. This is the reference's bounded 2D lighting implementation, not a physically based shadow renderer. The art assets are original geometric pixel placeholders, not scraped reference-game assets.

## UI and usability

- Required local-model setup screen with model discovery, origin, seed, capability errors, and explicit start/resume.
- Play surface, clock, location, pause state, world map, elemental villages/outposts, and waystones.
- Two visible carried slots with use/drop controls, recipe journal, and atomic combine action.
- Journey milestones persisted independently of the bounded world event log.
- Creature inspection, hidden wild durable stats, visible trust/diet/media, and companion care buttons/stats.
- Nearby villagers, roles, current schedule activities, range-aware Talk buttons, and permanent-partner indicators.
- Native conversation dialog, bounded transcript, pending-model state, deferred-action notice, close, and eligible battle action.
- Save/load/export/import, visual quality, reduced motion, opt-in audio, and developer diagnostics.

LLM dialogue and imported text use HTML escaping or `textContent`. The model cannot inject arbitrary UI markup. Native labels, buttons, tab semantics, status regions, focus-visible styles, and Escape handling keep key workflows keyboard accessible. The canvas is complemented by DOM descriptions and controls; the reference does not claim complete screen-reader navigation of an action RPG.

## Audio and effects

Audio starts only after the player presses Enable sound. A quiet generated ambient source and short triangle-wave cues provide offline placeholders; production music/SFX can replace this adapter. Presentation randomness is deliberately outside domain code and never saved as gameplay state.

Low quality suppresses weather and dynamic light work. Reduced motion suppresses weather/bobbing/interpolation effects and honors the CSS media preference for UI animations. These settings must not alter needs, cooldowns, perception, or inference budgets.

Developer diagnostics include collision outlines, cyan villager paths, green creature paths, gold goal vectors, and five colored need bars. Settings also displays the selected/nearest creature's utility scores and commitment timer, the nearest villager's plan/tomorrow overrides, structured promises, and memory kinds/source IDs. Simulation time, population/path/entity/chunk counts, FPS, and inference budgets remain visible there. Diagnostic path packets are capped at 24 paths × 48 points and are published only when enabled. These are read-only inspection tools; a graphical content editor is not included.

## Verification and performance

[Browser journeys](../../../tests/browser/journey.spec.ts) use a real WebGL browser, real worker, and IndexedDB with loopback model routes mocked. They check entry rejection, world generation, movement, time freeze, staged gifts, map, care/taming, and save/resume. The screenshot at `artifacts/hearthwild.png` is a QA artifact, not an external dependency.

GPU/browser FPS and headless simulation p95 are separate metrics. Record the browser, viewport, GPU/backend, quality, and whether a model is running when evaluating FPS. Rendering time, native display scaling, and shader/cache costs cannot be inferred from a Node simulation benchmark.

## Unified inspection and sleep controls

The HUD displays five player needs and the player's human affinity/Nature, finite pantry/spring actions, fatigue warnings, Rest/Wake and safe 8× sleep. Villager inspection presents the same physiology; companion inspection includes Rest and Nature. Carrion and the two predator sprites are presentation-only views of authoritative entities/resources. Diagnostics expose population deaths/births/pending vacancies, Nature and sleep status. Persistent IDs travel in a Uint32 view beside Float32 presentation columns inside the same recycled disposable buffer. See [unified_entities.md](../unified-entities.md).

## HD asset and view interfaces

[AssetCatalog](../../../src/presentation/assets/catalog.ts) validates canonical content identities, independent atlas page references, trim registration and clip phases. [AssetManager](../../../src/presentation/assets/manager.ts) awaits texture leases and bounds decoded memory. [AnimationController](../../../src/presentation/animation.ts) samples visible actors with distance cadence and authoritative combat ticks; it has no entity ticker subscriptions. [Projection](../../../src/presentation/projection.ts) removes display units from domain configuration. [HUD state](../../../src/presentation/ui/state.ts), [isolated view](../../../src/presentation/ui/view.ts), and [DOM patcher](../../../src/presentation/ui/patch.ts) preserve control focus during live updates. I/F/L open inventory, inspection and journal; native modal menus pause and restore focus.

Prototype imports keep the full world runnable but do not satisfy eight-direction HD coverage. Run the independent development [review gallery](../../art/review-gallery.md) and the strict HD completion gate before visual sign-off. Approved native source art remains a separate review dependency.
