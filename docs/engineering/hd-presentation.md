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

## C8b kit meters, slots and time card

The supplied bar images contain example fills. Runtime values use their authored
frames and losslessly extracted fill strips, not the baked examples. Run
`npm run ui:build` to rebuild only the UI bundle; this avoids repacking the world
atlas. Source artwork stays under communicator ownership and is unchanged.

The compiler crops at `(4,4)` in 2x export pixels. HP/stamina strips are 16x10;
XP/need strips are 2x4. These repeat at native size beneath a clipped mask, inside
four-pixel nine-slice borders with a navy empty interior. HP/stamina frames remain
168x18, XP 168x12, and compact companion needs 32x12. Larger need rows repeat the
same texture. UI build manifest v2 records source/output hashes and dimensions.
This is independent of the asset-catalog and save schema versions.

The [meter helper](../../src/presentation/ui/meters.ts) clamps values and rounds
visible widths down to two display pixels. Accessibility values retain the actual
bounded fraction. A single refresh after DOM patching measures content widths;
hidden-panel meters update when revealed. The old percentage-width writers are
removed. No scaling transform stretches the artwork or its fill segments.

Quick hands use native 60x60 common slot faces. Carried/worn cards reuse their
eight-pixel border slices. There is no rarity classification in current item data,
so other rarity frames are not assigned. Finite charges appear beside the slot
face and in its accessible name; the inventory keeps full names, charge counts
and action rows. Current item icons remain prototype colour representations.
Exactly two carried slots and six worn slots remain; no item state changes here.

The [HUD read model](../../src/presentation/ui/state.ts) adds immutable `time`
labels from existing snapshot day/hour/calendar/weather fields. Day is one-based
for display. Presentation-only phases are Dawn 05:00–09:00, Day 09:00–17:00,
Dusk 17:00–21:00, Night otherwise. These labels do not redefine lighting or AI.
No wall clock, timer, worker field, save field or version change is introduced.

The time card and circular minimap are siblings, side-by-side at 1080p and stacked
at smaller desktop widths. The selected larger card retains exact clock and weather
alongside day/phase. Only the minimap and toasts dim in combat; time stays readable.
The needs drawer and compact companion row have separate vertical space; opening
needs preserves the previous behavior of hiding the companion card. Inventory is
scrollable at small desktop sizes, retaining keyboard access and focused controls.
Save/settings controls are clear of the action cluster. Claude's hidden duplicate
button labels and their accessible names are preserved.

Verification covers source/crop equality, two-pixel blocks, deterministic hashes,
zero/partial/full masks, time boundaries/pause/restore, UI-independent save outcomes,
and desktop browser journeys with occupied slots, companion needs and real duels.
Review captures are linked from the Codex handoff. C8b remains candidate until the
director records visual acceptance; placeholder world artwork is not approved by it.

## C3b creature publication and face sidecars

The forge's creature `publish` stage consumes an existing body/clip director record
and original machine-A workspace. It validates frame hashes, clip references,
integer registration, actual RGBA dimensions, hard QA and the approval's asset,
scope, path and digest. Reconstructing a temporary review from the original bake
also detects edited metadata with an unchanged digest label. It never overwrites
the approved packet or creates an approval record.

Exports live in `art/source/exports/<asset>/<body-digest>/`; the staging pointer is
`art/source/staging/blender/<asset>.json`. Frames retain source size, integer root,
sockets and rig identity. Clips retain timing/runtime/move metadata; distance
strides come from the actual animate record rather than generic defaults. Provenance
uses the shared generated AuthoringProvenance contract and pins the original blend,
tracks, relevant publication scripts, animate record and Blender 4.2.x. Original
model bytes must still match their stage record. Publication copies the exact model,
tracks, animate record, scripts, specification, recipe, palette and dependency lock
into `art/source/blender/models/published/<asset>/<closure-digest>/`. The closure digest
includes each relative filename, role and SHA-256. Provenance references these
immutable copies, never machine-local scratch or mutable live tooling. Existing
bundles are verified on retry; changed bytes are rejected rather than repaired.
Original sources and copied bytes are checked again before committing the pointer.
Content-addressed sources and exports precede an atomic staging-record replacement;
a failed pointer write retains the previous record and can leave unreferenced
immutable directories. Only sources bound to the approved body packet are copied.

The communicator integrates staging into the source manifest (TEAM-2a), translating
frame IDs/paths and canonical species bindings without losing registration or
provenance. Staging is not automatically ingested or activated by the compiler.
The commands (`scripts/art-integrate.ts`, 2026-11-02):

1. communicator: `npm run art:integrate -- merge <asset>` (species; `--appearance npc:<id>`
   for a flat human body). It replaces that appearance's rows, legacy rows included,
   adds a missing rig from the frames (C3e registrations) and validates the manifest.
   Then `npm run assets:build`; commit manifest and generated outputs.
2. codex: `npm run art:integrate -- ledger <asset>`. It refuses unless the approval record
   is unchanged since publish, `director-approved` for the staged packet digest, and every
   manifest frame is byte-identical to the staged export. It writes the ledger entry bound
   to the catalog digest. Then `npm run assets:build && npm run check:assets`, and an
   in-game capture looked at (PRD-5).

Re-running `merge` on an integrated asset is a no-op apart from key order (tested on
Mireling: same source digest, byte-identical build).
Commit the complete source-bundle directory together with staging and exports, so
Machine B and CI can verify provenance without Blender, the original workspace or
network access. Internal historical paths inside the copied animate record remain
audit metadata; the compiler resolves only declared provenance input paths.
Do not strip provenance to work around missing dependencies. Older staging records
that reference `forge/work/` need a packaging-only `forge publish --asset <asset>`
on Machine A from the unchanged original workspace and approved packet. No rebake
or replacement approval is required when the body packet digest stays unchanged
(PRD-9). The manifest source digest changes with corrected provenance; it still
requires normal engineering ledger review before runtime activation. Missing sources
must not be fabricated or replaced with a fresh bake of an approved asset.

`faces --asset rivallie` creates a separate `art/review/*-faces-*/` candidate from the
existing body review. It draws palette-indexed ART-8 grammar on the 16x12 art-pixel
decal canvas and exports nearest-neighbor 32x24 PNGs: neutral, warm, fearful, hurt,
sleep in s/se/sw/e/w. Back facings intentionally have no decal. Its `faceAnchor`
check binds Socket_Head registration and decal ink bounds across supplied frames;
contact and standing registered previews support visual review. Bounds alone do
not establish anatomical fit, occlusion or emotion readability during movement.

Face candidates bind their body manifest/digest and have their own source digest.
Body/clip approval excludes faces; adding faces never changes the approved body
packet or activates a runtime face layer. Human expressions use the C9b sidecar
below; runtime composition remains separate. Machine-B unit tests use fake approvals only in temporary
repositories; production publish and moving face review still require machine A.

### C9b human face sidecars

`forge.py faces --asset player-aqualia` now supports an existing valid human body
review without launching Blender or changing the body. It emits 60 transparent
32x24 decals: twelve rows (`neutral`, `warm`, `thoughtful`, `curious`, `concerned`,
`amused`, `angry`, `sad`, `fearful`, `blink`, `sleep`, `hurt`) across s/se/sw/e/w.
No back-facing decal is manufactured. Features are authored at 16x12 and exported
as uniform nearest-neighbor 2x2 blocks, sharing the creature registration checks.
Every expression is checked against every forward-facing body's per-frame head
socket and actual canvas, including combat and wide clips. Missing/off-grid or
out-of-bounds registrations produce draft status; input/body validation still
rejects malformed packets or failed hard body QA.

Optional recipe `face` contains only `eyeRamp`, `inkRamp`, `highlightRamp` using
existing palette ramp names. These recolor palette indices without changing shape;
unknown fields/ramps are rejected. Recipe, grammar, palette, specification and body
manifest participate in the CLI sidecar revision. The face report binds body
manifest hash and digest; body data remains immutable. Recoloring is authoring-time
only in this slice; runtime emotion selection/composition is not activated.

The contact sheet uses a warm-skin review matte, not an identity illustration.
Inspect its native size and enlarged view, then inspect `registered.png` on the
real body's standing frames on Machine A. Bounds and unique frame hashes do not
establish anatomical fit or understandable emotions during motion. Retained
engineering [native](../team/comms/codex/2026-11-01-human-face-grammar.png) and
[4x](../team/comms/codex/2026-11-01-human-face-grammar-4x.png) proofs are grammar
fixtures; they do not substitute for a real-human review or director decision.

Run `human_faces_selftest.py` through the forge's pinned uv environment alongside
`finish_selftest.py` and `review_selftest.py`. C9b remains partial: item/8-grip
rendering, garment fit/material masks, thin-feature QA and human publication are
pending. `items: ready` and `go-items` are deliberately not issued.

### C9b item pose planning

`forge.py item-plan --asset item:hatchet` validates an existing source mesh and
writes only `work/item-hatchet/item_plan.json`. This is a draft geometry-transform
contract, not an item renderer, mesh generator, QA packet or readiness grant.
Item IDs now have their own forge kind; `all` and body stages explicitly refuse
them while the item pipeline remains unfinished.

The normal recipe must declare matching `asset` and `kind: "item"`. Its `item`
object requires `model` (a relative `.blend` path under `art/source`), `grip`
(three finite model-space coordinates), `socket` (`Socket_Hand.R` or `.L`) and
`iconPivot` (three explicitly authored coordinates). Optional `supportGrip` adds
the second grip. Unknown fields, missing files, escaping paths, invalid sockets
or nonfinite/bool coordinates fail before replacing any prior plan. This command
checks source existence/hash; Blender must later validate the model's contents.

The plan contains 64 held poses (eight facings by eight grip buckets) plus one
three-quarter icon from the same source mesh. Canvas/anchor and camera values
come from the existing protected render specification. Grip buckets are clockwise
screen angles from up. Each rigid transform first yaws the existing mesh to its
facing, then rotates around the fixed orthographic view axis; it translates the
authored grip to the root. It neither scales nor mirrors anatomy or rotates
finished bitmaps. Support-grip coordinates undergo that same transform. The icon
uses its explicit pivot; it is not stretched from an inventory PNG.

Canonical output binds source hash, settings, generator hash and the relevant
camera/facing/canvas contract. A temporary sibling file is installed atomically
only after rechecking the source hash; malformed input, storage failure and a
changed source retain the previous plan. Shared fixtures test projected angles in
every facing, rigid transforms, both hand sockets, deterministic bytes and failure
behavior. The planner does not promise that a spear fits the held-item canvas:
real rendering, transparent margins, feature thickness, silhouette/occlusion and
any required canvas extensions remain explicit C9b integration work. No
production `go-items` message is available yet. The technical renderer below can
consume a plan against an already existing, separately textured model.

### C9b item rendering and silhouette QA

`forge.py items --asset item:hatchet` validates the same recipe as `item-plan`,
requires Blender 4.2.x, then renders 64 held poses and one icon. Input must be a
separate static prop mesh with its `Col` vertex colors, not a human armature. No
production geometry is constructed, rescaled to fit, or taken from a human body.
`bake.py` uses the existing calibrated camera and albedo/normal/depth writer. Only
item jobs select the planned rigid matrix; body jobs keep their original path.
Root registration is projected from the actual transformed source pivot. An
optional support grip is projected and exported on the same even-pixel grid.

The stage invokes the existing pixelizer and verifies all 65 native/export pairs,
exact 2x blocks, actual canvas sizes, transparent margins, root drift,
primary/support grip bounds, palette membership and the aggregate color budget.
`thinFeature` examines raw albedo silhouettes before outlines can hide narrow
geometry: opaque 2x2 blocks support their pixels, connected unsupported runs of
at least two pixels fail, isolated unsupported islands fail, and a one-pixel cap
attached to a supported body is allowed. Connected-component tables make this
diagnostic linear in pixel count. This is a silhouette-spur detector, not proof
that every internal strap/material detail or every facing reads at the required
width. Those limitations require inspection and future material-mask validation.

Owned persistent state is an immutable generation at
`work/<asset>/item-renders/<inputsDigest>/` and the final `items.json` pointer.
The digest binds model bytes, the full render/QA specification, material/detail
slots, tool sources, dependency lock and Blender version. The review separately
binds frame metadata, QA results and every generated file hash. Cache hits verify
the generation and existing pointer; corrupt bundles fail instead of being repaired.
Verified cache hits preserve pointer bytes and timestamp.

`render_items` accepts an explicit baker adapter for CPU tests. It copies and hashes
a self-contained model snapshot before Blender reads it, avoiding a live-file race.
Its lifecycle is validate → temporary snapshot → bake → pixelize → inspect → hash → recheck inputs
→ install generation → atomic pointer replacement. Invalid inputs, a failed bake,
missing passes, source changes or storage errors preserve the previous pointer.
A failed final pointer write can leave an unreferenced immutable generation.
Per-pose image work is O(pixels), with bounded 65-pose metadata and a contact sheet
sized from the largest frame; enlarged canvases are not cropped to a fixed cell.

The output `item-review.json` is a technical review format, not an animation catalog
or approved publication. It retains facing, grip bucket/degrees, integer anchors,
primary/support sockets and source hashes without pretending that grip rotations
are a gameplay animation clip. Source generation from the canonical three-quarter
reference, item gallery/publish adapters, body angle/occlusion tracks and runtime
composition remain C9b/C8 integration work. `items: ready` and `go-items` remain off.

`forge.py selftest --kind item` creates a PRD-2 calibration-only cuboid and runs
the real renderer. It does not create a hatchet or other production source.
The CPU suite uses fake passes solely to test transactions and QA; it cannot prove
the Blender integration or artistic quality. Machine B currently has no Blender
4.2 binary, so the actual calibration contact/QA must be inspected on Machine A.
The protected sprite-forge runbook remains unchanged; this guide does not override
its production gate or authorize item asset production.

### C10 environment kind (claude, 2026-11-01)

`env:<id>` assets run `prep → gen3d → clean → texture → layout → bake → pixelize → qa →
packet → publish` (`forgelib/environment.py`, `blender/env_layout.py`).

- **layout** scales the textured model uniformly so its ground contact (the lowest 4% of
  its height) is `footprint[0]` tiles wide (1 tile = 1 world unit = 32 art px). It grounds
  and centres it, and splits faces above `split.aboveFraction` of the height into the
  `roof`/`canopy` layer (ART-11.1). It computes one canvas for all layers: width a
  multiple of 32, anchor at the footprint's south-edge centre.
- **bake** reuses `bake.py`'s explicit pose path, one render per layer: matrix `diag(1, 2, 1)` is
  the 1/sin 30° world-Y depth stretch (ART-2.3), and the translation puts the anchor point on the
  world origin, which `set_canvas` projects to the anchor pixel.
- **pixelize** per layer (with `rampShift`), plus an optional `shadow` layer: a footprint
  ellipse in `outline-neutral` deep at alpha 96 (ART-3.4).
- **qa**: footprint depth within 0.35 tile (ART-11.4), width multiple of 32, margins,
  palette membership, 32-colour budget (ART-4.4), exact 2x blocks.
- **packet/publish**: `review.json` lists every layer with its hash, the footprint and
  `lightPools` (AMB-3.2); `publish_env` mirrors body publication.
- `forge.py selftest --kind environment` runs a PRD-2 calibration house (box and prism roof,
  never art) and asserts base and roof on a shared canvas, the roof above the base, and every QA
  check. Runtime use (roof fade when actors stand under it) is engine work for the catalog.

### C9b runtime held-item composition (claude, 2026-11-02)

How a held item reaches the screen on a modular (forge) human body:

- **Body side.** `bake.py` records, per human frame and hand socket, `held: {angleDeg, depth}`:
  the on-screen direction of the knuckle line (`pinky_01` base → `index_01` base, the way a
  fist holds a haft with the head beyond the index finger), degrees clockwise from up, and
  the hand's ground-plane depth behind the chest (`spine_03`). Rigs without finger bones
  (creatures) get no track. `review.py` turns it into the frame field
  `held: {"Socket_Hand.R": {bucket, behind}}` (bucket = nearest 45°, behind when > 0.05
  world units), which human publication copies into staging.
- **Item side.** A held item's layer appearance has one `idle` clip per facing whose eight
  frames are grip buckets 0–7 (the item renders, C9b), registered at the grip.
- **Contract** (`catalog.ts`, `source.ts`, validated at build): `HeldPose` on V2 source and
  catalog frames, keyed by a socket the frame carries; a held layer set's clips are `idle`
  with exactly 8 frames; a recipe's held layer has a `socketId`, a `heldSlot` and
  `required: false`; every body pose of such a recipe has a held pose for that socket.
- **Runtime.** `selectModularLayers` resolves a held layer's clip by facing only (`idle`), and
  `heldLayerFrame` picks the frame from the body frame's bucket. The renderer anchors it at
  the socket and draws it just below the body when `behind`, otherwise at the recipe's z.
  A pose without a track shows no item rather than a wrong one.

Evidence: the human selftest bakes held tracks for both hands on all 952 frames (asserted).
An overlay of the approved hatchet's grip frames on those frames puts the hatchet in the
right fist in every facing, turning with the hand, behind the body on the far side. Seen
limits, filed under C9c: idle and walk hang the item along the leg, so the brown haft
vanishes against brown trousers in the s and n views, and the generic `strike` punches with
the left hand while the right hand holds the item. Unit tests: `review_selftest.py`
(`held_poses`), `presentation-v2.test.ts` (`heldLayerFrame`), `assets-v2.test.ts` (seven
contract rejections). The game can't show a held item until a modular human body is
integrated (M11 → B4); existing assets build byte-identical.

### C3h creature templates (claude, 2026-11-02)

Every creature species maps to a skeleton template (`spec/skeletons/quadruped.json`
`species`); each template is one spec file, one rig script and one clip set in
`blender/gaits.py` (`gaits.clips_for(template)`), all covering the same 15-clip creature
matrix.

| Template            | Species                                       | Rig script                                                        | Notes                                                                                                                                         |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `quadruped-v1`      | rivallie, bramblefang, marshstalker, mireling | `rig.py`                                                          | unchanged                                                                                                                                     |
| `shelled-v1`        | steamshell                                    | `rig.py` (`orientation.headEnd: front`, `landmarks.tailOptional`) | `shell` bone; guard, sleep, downed withdraw the head under the shell; tailless bodies keep tail bones without weights                         |
| `winged-v1`         | zephyrit, cindermoth                          | `rig_winged.py`                                                   | core + head + 2 tail bones + 2x2 wing bones; airborne clips hover `gait.hoverPx` (4) above the ground anchor; QA height target adds the hover |
| `mushroom-biped-v1` | ignicap                                       | `rig_biped.py`                                                    | pelvis/stem/cap vertical chain, IK legs; waddle locomotion                                                                                    |

`rig_winged.py` and `rig_biped.py` keep the sheet's front view facing -Y (a wingspan or a
round cap defeats the PCA long axis) and share `riglib.front_mesh`, `build_armature`,
`set_pose`. The quadruped path in `rig.py` is unchanged except for template-guarded
branches; `selftest --kind creature` still passes on the Rivallie copy.

Selftests: `forge.py selftest --kind creature-shelled|creature-winged|creature-mushroom-biped`
run PRD-2 primitive bodies (`blender/fixture_creature.py`) through the real clean, rig,
animate, bake, pixelize and QA stages; each reaches QA `candidate` with anchor drift 0.
Soft checks that fail on the fixtures and are expected: `idleFlicker` on winged (0.24, a
hovering idle beats its wings) and on mushroom-biped (0.11, a 1 px breath moves the wide
cap), and `valueContrast` on sand (fixture colours). `gaits_selftest.py` (no Blender)
checks each clip set covers the matrix with its own bones.

Integration: the new rig ids need `rigs` entries in the manifest when the first species
of each template is published (same three creature sockets `Socket_Back`, `Socket_Head`,
`Socket_Mouth`; default canvas from the species' `creature.*` canvas at 2x; registrations as
the staging record's frames show, per C3e).

### C9b item source, packet and publication (claude, 2026-11-01)

Held items now run end to end: `prep → gen3d → clean → texture → orient → items →
packet → publish` (`forge.py all --asset item:<id>` runs through `items`).

- **Source.** A prop sheet is one object in three-quarter view (PRD-3.3); prep feeds it
  to gen3d and texture as their single front view. `orient` (`blender/item_orient.py`,
  maths in `forgelib/item_orient.py`) finds the haft as the longest principal axis, the
  head as the wider end (+Z), the working edge as the head's farthest perpendicular
  point (−Y), puts the grip on the haft axis at `gripFraction` from the butt (origin),
  and scales uniformly to `lengthArtPx`. It never mirrors. Thin hafts are inflated
  along normals to 1.25× the ART-6.3 minimum. The recipe's `item` block takes
  `"auto"` for model, grip, icon pivot and icon scale.
- **Icon.** The planner's icon pose is the se facing at grip bucket 1 (45°) with its own
  uniform `scale` (`iconScale`, 1–4). It is computed by orient so the diagonal item fills
  the 32×32 slot. Held poses stay rigid with scale one; rotation rows stay orthonormal and
  `transform_point` and `bake.py` apply the icon scale.
- **Packet.** The renderer's `item-review.json` becomes the packet's `review.json`; its
  `sourceDigest` covers frame metadata, QA and every file hash, so an approval binds
  exactly what was reviewed. Approval scope is `[held-item, icon]`.
- **Publish.** `publish_item` mirrors body publication: digest-bound approval,
  immutable `exports/item-<id>/<digest>/`, a self-contained source bundle (model,
  orient record and params, recipe, spec, tools, lock), and an atomic staging record
  `staging/blender/item-<id>.json`. Tested with a scratch approval (published, then
  removed), and refused for a wrong scope and a wrong digest.
- **Still open:** runtime composition of held layers on bodies (needs hand-socket body
  frames, i.e. new humans) and the manifest/catalog item layer. Golden sample:
  `art/review/2026-11-01-item-hatchet/`.
- Tests: `item_orient_selftest.py` (5), `items_selftest.py` (9), `forge.py selftest --kind item`.

### C3e explicit rig registrations

`RigDefinition` keeps its existing default `canvas`, `anchorPx` and `socketIds`.
Optional `registrations` adds one to 64 exact `{canvas, anchorPx}` pairs. The
default is implicit and must not be repeated. Pairs are identified by their integer
dimensions and anchor, so no extra frame identifier or skeleton alias is needed.
Anchors must remain inside their canvas. All frame sockets must be declared on the
rig and remain within the actual frame, irrespective of which pair it uses.

For the received quadrupeds, keep `quadruped-v1`: default 112x112 at (56,82), with
160x144 at (80,112) added to `registrations`. These values come from the unchanged
staging records. No frame/socket stripping or pose resizing is required. Human
combat/wide frames can likewise declare their actual per-clip registrations on
the same rig. Required non-held layers must use the same registration for each
matched body pose; a valid alternative registration is not interchangeable with
the correct body pose. Existing single-registration catalogs remain compatible.

The compositor resolves the body's current registration for bounds, root and
socket anchoring. Prototype display scale continues to use the rig's default
canvas height, so a larger action canvas does not shrink the anatomy. Texture
leases and composite memory bounds remain unchanged; no new atlas is loaded by
declaring registration metadata alone. `rigRegistration` performs bounded lookup
without allocating a registration array in the presentation loop.

Correction to the earlier M19 diagnosis: frame rigs already participated in source
digest closure through a final metadata pass. C3e preserves this behavior and makes
the dependency explicit while visiting frames. It does not introduce a new missing
dependency fix. Regression tests cover unlayered actors and registration edits.
Changing a shared rig's registration metadata changes its dependent source digests;
compute digests only after the complete V2 graph passes validation.

`npm run assets:schemas` uses the same writer as `assets:build` and regenerates the
three shared JSON Schemas without packing textures. Run it before consuming new
fields in the Python publisher or the source manifest. The source manifest remains
the communicator's integration artifact; the tested 1,848-frame V2 graph in
`assets-v2.test.ts` is a fixture, not a committed production manifest or approval.
