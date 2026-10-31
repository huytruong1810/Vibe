# HD Aqualia slice: engineering and visual acceptance

The production target is a 1920×1080 reference viewport, 64-pixel terrain units,
approximately 96×144 human frames, and eight authored movement/combat directions.
Aqualia's ten canonical villagers, adjoining riverlands and all eight species form
the first visual acceptance region. All other settlements remain playable.

**Native-detail approval remains pending.** Imported prototype sprites are explicitly
tagged `prototype`. Enlarging them enables integration testing, not visual sign-off.
The initial target scene and player/Rivallie pose proofs must be reviewed before bulk
production. See the [art contract](../art/contract.md), generated coverage report and
[review gallery](../art/review-gallery.md). Missing characters retain an explicit generic
prototype; an unrelated named character must never stand in for them.

## Ownership and integration

Engineering owns domain/worker interfaces, renderer, adapters, generated catalogs,
build tooling and HUD controllers. Art owns `art/source/`, visual specifications and
approved changes to the isolated [view](../../src/presentation/ui/view.ts) and
[styles](../../src/presentation/ui/hud.css). Coordinate view API changes first.
Do not modify simulation code to accommodate a sprite.

The engineering branch is `eng/hd-presentation`. Art branches from the published
contract commit as `art/hd-aqualia-slice`; its PR targets the engineering branch.
Small validated commits stay reviewable. No force push or automatic main merge.

## Runtime contracts

| Component                                                                        | Owns / lifecycle                                                                                           | Invariants and failure behavior                                                                                                          |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [RenderProfile / WorldProjection](../../src/presentation/projection.ts)          | Immutable display dimensions; camera projection, client scaling, ground feet and inverse surface transform | Tile coordinates never change; arbitrary client viewport sizes retain coverage; inverse picking includes elevation                       |
| [AssetCatalog / AppearanceResolver](../../src/presentation/assets/catalog.ts)    | Validated canonical identity/clip/frame/page indices                                                       | References, dimensions, anchors, phase ranges and IDs validated before use; prototype fallback never counts toward HD coverage           |
| [AssetManager](../../src/presentation/assets/manager.ts)                         | Awaited page leases, cancellation epochs, texture references and decoded-byte budget                       | No texture before successful acquisition; late loads cannot resurrect a disposed manager; unloaded pages must not remain referenced      |
| [ActorPresentation / PresentationCue](../../src/domain/presentation-contract.ts) | Disposable worker projections and sequenced bounded effect facts                                           | Stable integer IDs, absolute combat deadlines; cues are transient, not commands or saved facts                                           |
| [PoseResolver / AnimationController](../../src/presentation/animation.ts)        | One renderer clock and bounded per-visible-actor cadence                                                   | Downed/sleep/combat/movement use committed facts; stride uses distance; art phase ranges cannot redefine hit timing; no per-actor ticker |
| [QualitySettings](../../src/presentation/quality.ts)                             | Measured rendering degradation with hysteresis                                                             | High/Balanced/Low: 512/256/128 MiB; effects reduce before resolution 1→.75→2/3; camera coverage and gameplay stay fixed                  |
| [HudViewState / UiIntent](../../src/presentation/ui/state.ts)                    | Immutable projection and typed interaction translation                                                     | Exactly two slots; commands still pass worker validation; DOM focus and live text survive updates                                        |
| [HudPresenter](../../src/presentation/hud.ts)                                    | Input modes, focus, modal lifecycle and view updates                                                       | Native modal focus trapping; map/settings/journal release menu pause only when no menu remains; dialogue remains authoritative           |

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

See [verification](../operations/verification.md) for measurements and limitations. Approved source
art, complete animation coverage, visual review and measured hardware evidence are
required before declaring the HD slice complete.

## Director UI and candidate packet integration (C8)

The director doctrine supersedes earlier art-process and visual assumptions in
this historical implementation guide. [ADR 019](decisions.md#adr-019--director-ui-kit-and-isolated-candidate-packet-preview)
records the current UI and review boundaries.

`npm run assets:build` also compiles the tracked UI kit into
`public/assets/generated/ui/`. Install `uv==0.13.6` with Python, then use the
forge lockfile; no font authoring occurs in the browser. For a UI-only rebuild,
run `npx tsx scripts/ui-build.ts`. Silver is the sole family, with a WOFF2 core
and original-font fallback. The settings credits retain the required attribution.
The UI theme derives colors from `ui_theme.json` and `palette.json`; standard,
ornate and thin frames use the supplied 2× exports as border images.

The corner HUD includes a player medallion, health/stamina/XP, local terrain
minimap, time/weather, attack/dash controls and exactly two carried-item shortcuts.
Needs/rest live in an expandable drawer. Inventory and inspection retain their
stable IDs, keyboard actions and focus-preserving updates. Action availability
is a presentation hint; the authoritative command validator still decides.
Companion needs appear only when a player bond exists. Nonessential HUD dims
when the snapshot reports player combat. UI controls use 38 display pixels;
smaller desktops wrap or scroll rather than adding another typeface.

Open `/?gallery=1` in development and expand **Forge packet · candidate review**.
Enter the directory name beneath `art/review/` (not a URL or filesystem path).
New packets export `review.json` from:

```text
uv run --project art/source/forge python art/source/forge/forge.py packet --asset rivallie
```

The existing candidate QA and viewed-contact-sheet gates still apply. No new
Blender bake is necessary when current exported frames and tracks remain valid.
The exporter copies `pix/export/<clip>/<facing>_<index>.png` and reads
`bake/tracks.json`; socket samples are rounded to art pixels then scaled by two.
It rejects absent frames/tracks instead of inferring registration from GIFs.
The viewer exposes clips/facings, play/pause, stepping, root/socket overlays and
QA results on a 64-pixel reference grid. Combat preview uses the clip's art FPS;
it does not claim authoritative phase timing. There is no approval control.

Validation: `npm run check`, `npm run test:browser`, and
`python -m uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p review_selftest.py`.
Browser packet tests use an explicitly synthetic fixture; that fixture is not
Rivallie art evidence. Remaining C8 gates include full 2× draw qualification,
approval-record transcription when director records exist, and elder integration.
