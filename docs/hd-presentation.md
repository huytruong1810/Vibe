# HD Aqualia slice: engineering and visual acceptance

The production target is a 1920×1080 reference viewport, 64-pixel terrain units,
approximately 96×144 human frames, and eight authored movement/combat directions.
Aqualia's ten canonical villagers, adjoining riverlands and all eight species form
the first visual acceptance region. All other settlements remain playable.

**Native-detail approval remains pending.** Imported prototype sprites are explicitly
tagged `prototype`. Enlarging them enables integration testing, not visual sign-off.
The initial target scene and player/Rivallie pose proofs must be reviewed before bulk
production. See the [art contract](art/contract.md), generated coverage report and
[review gallery](art/review-gallery.md). Missing characters retain an explicit generic
prototype; an unrelated named character must never stand in for them.

## Ownership and integration

Engineering owns domain/worker interfaces, renderer, adapters, generated catalogs,
build tooling and HUD controllers. Art owns `art/source/`, visual specifications and
approved changes to the isolated [view](../src/presentation/ui/view.ts) and
[styles](../src/presentation/ui/hud.css). Coordinate view API changes first.
Do not modify simulation code to accommodate a sprite.

The engineering branch is `eng/hd-presentation`. Art branches from the published
contract commit as `art/hd-aqualia-slice`; its PR targets the engineering branch.
Small validated commits stay reviewable. No force push or automatic main merge.

## Runtime contracts

| Component                                                                     | Owns / lifecycle                                                                                           | Invariants and failure behavior                                                                                                          |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [RenderProfile / WorldProjection](../src/presentation/projection.ts)          | Immutable display dimensions; camera projection, client scaling, ground feet and inverse surface transform | Tile coordinates never change; arbitrary client viewport sizes retain coverage; inverse picking includes elevation                       |
| [AssetCatalog / AppearanceResolver](../src/presentation/assets/catalog.ts)    | Validated canonical identity/clip/frame/page indices                                                       | References, dimensions, anchors, phase ranges and IDs validated before use; prototype fallback never counts toward HD coverage           |
| [AssetManager](../src/presentation/assets/manager.ts)                         | Awaited page leases, cancellation epochs, texture references and decoded-byte budget                       | No texture before successful acquisition; late loads cannot resurrect a disposed manager; unloaded pages must not remain referenced      |
| [ActorPresentation / PresentationCue](../src/domain/presentation-contract.ts) | Disposable worker projections and sequenced bounded effect facts                                           | Stable integer IDs, absolute combat deadlines; cues are transient, not commands or saved facts                                           |
| [PoseResolver / AnimationController](../src/presentation/animation.ts)        | One renderer clock and bounded per-visible-actor cadence                                                   | Downed/sleep/combat/movement use committed facts; stride uses distance; art phase ranges cannot redefine hit timing; no per-actor ticker |
| [QualitySettings](../src/presentation/quality.ts)                             | Measured rendering degradation with hysteresis                                                             | High/Balanced/Low: 512/256/128 MiB; effects reduce before resolution 1→.75→2/3; camera coverage and gameplay stay fixed                  |
| [HudViewState / UiIntent](../src/presentation/ui/state.ts)                    | Immutable projection and typed interaction translation                                                     | Exactly two slots; commands still pass worker validation; DOM focus and live text survive updates                                        |
| [HudPresenter](../src/presentation/hud.ts)                                    | Input modes, focus, modal lifecycle and view updates                                                       | Native modal focus trapping; map/settings/journal release menu pause only when no menu remains; dialogue remains authoritative           |

All hot actor selection uses bounded visible sets; clip/frame lookup uses catalog
indices. Renderer cache regions are 16×16 logical tiles, independent of simulation
32×32 chunks. Height is one walk surface per tile, with existing explicit ramps.
Decorative placement must never create collision or block protected routes.

Simulation ticks drive pose, water/weather/effect timing. Dialogue pause freezes
world animation; acceleration advances ordinary ticks. UI focus and modal animation
do not advance gameplay. Reduced motion retains active attack readability.

## Controls and verification

Retain WASD/arrows, E interaction, R gather, C craft, Q swap, 1/2 use, J/K attacks,
Space dash, M map and Esc settings. Add I inventory, F inspection and L journal.
Inventory and inspection are nonmodal overlays; map, journal and settings pause.
Human needs, rest controls, portraits and contextual prompts remain accessible.

Run `npm run assets:build`, `npm run check:assets`, `npm run check`, and
`npm run test:browser`. `npm run check:assets:hd` is the intentional visual-completion
gate; it must fail while required slice artwork is missing. It must not be weakened
to make a prototype milestone green. Run `npm run benchmark` for headless simulation
and `npm run soak` after worker-interface changes. GPU/render measurements and real
Ollama contention are separate qualifications; do not infer either from a Node test.

See [verification](verification.md) for measurements and limitations. Approved source
art, complete animation coverage, visual review and measured hardware evidence are
required before declaring the HD slice complete.
