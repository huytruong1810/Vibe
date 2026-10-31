# Asset contract v2: composition, provenance and approval

This extends [the shared art contract](contract.md), preserving v1 neutral portraits,
legacy sprite bindings and the existing runtime lookup methods. The source and
runtime schemas accept versions 1 and 2. The compiler normalizes both into one
runtime catalog, with v2 collections added without changing simulation state.

## Authoring and production stages

The authoring medium is a production choice. Supported recorded methods are
`pillow`, `master-ingestion` and `blender-bake`. Hybrid workflows may use Blender
models or batched painted/generated masters, then deterministic mechanical
registration and ingestion. Generated master images, masks and cached cutouts are
source material. Their appearance still requires review against Hearthwild's
anatomy, identity and native-detail target.

Source v2 stages are `proof` and `candidate`. Source files cannot assert `approved`
or supply approval records. The compiler reads engineering-owned
[approvals.json](approvals.json) and promotes only matching, eligible candidates.
The default ledger is empty. No approval is inferred from a successful build,
image-generation run, fixed anchors or a declared `quality: "hd"` value.

Proofs and incomplete actors are compiled into `reviewAppearances` and
`reviewClips`, separate from the active gameplay arrays. A new idle-only Aqualia
player or Rivallie proof therefore cannot replace the working legacy walk,
combat and sleep presentation. This guard also applies to v1 partial actor HD
submissions. Static v1 environment material and identity-matched neutral portrait
pairs retain their compatibility behavior; new production approval uses v2.

The artifact's canonical identity is still `(kind, contentId)`. A layer appearance
uses kind `layer`, with an author-defined content ID; it is not an extra living
entity. IDs remain independent of filenames, atlas pages and storage indices.

## Registration, rigs and modular humans

V2 source frames declare `sourceSize`, integer `anchorPx`, optional `rigId`, and
named integer `sockets`, all in the complete untrimmed canvas. The compiler checks
PNG dimensions, then derives normalized anchors by exact division. Trimming never
changes these coordinates. Negative, fractional or out-of-bounds points are
rejected. A normalized runtime anchor, when accompanied by `anchorPx`, must match
that division exactly.

`RigDefinition` owns its canvas, root anchor and allowed socket names.
`BuildProfile` identifies an authored proportion profile for a rig; it does not
procedurally stretch artwork. All body, hair, face and garment frames in a
compatible layer set use the same canvas and root registration. Different body
profiles require actual matching artwork. Aqualia's current proposed human root
is `(48,132)` on `96×144`; Rivallie's is `(48,86)` on `96×96`. These are rig data,
not scattered rendering constants.

`LayerSet` binds one layer appearance to a rig, compatible build-profile IDs and
a slot: `body`, `hair`, `face`, `garment`, `held` or `overlay`.
`AppearanceRecipe` contains exactly one required body layer, its rig/profile,
and ordered layer references. Each layer has a stable `z`, `required`, optional
canonical `itemId`, optional `gearSlot` or `heldSlot`, and optional `socketId`.
Equipment selectors need an explicit item ID; garment selectors must match that
item's authored slot. Held slots are exactly 0 or 1. A layer cannot occupy both
a held and garment slot.

Held artwork can register its own anchor to the body frame's named action socket.
Other layers share the body canvas. Attachment sockets must exist in the rig and
in every required body pose. Required layers must supply compatible state,
facing, move and frame cadence. Missing required layers prevent composition;
optional unapproved gear remains unavailable for that recipe. Recursive layer
recipes are rejected. Pose samples and combat deadlines remain authoritative;
artwork does not introduce animation-owned hit timing.

The baseline clip matrix remains six idle frames, eight walk/run frames,
twelve attack frames per move, four guard/hit frames, six player dash frames,
six activity frames, four sleep frames and six downed/recovery frames. Human
attacks additionally cover `sword_slash`, `spear_thrust` and `bow_shot` in eight
directions. Diagonals require authored or baked diagonal poses. Rendering a
turntable's first idle frame is not a completed movement/combat set.

## Portraits, effects, furniture and scenes

`PortraitSet` binds one canonical identity to exactly these expression names:
`neutral`, `warm`, `thoughtful`, `curious`, `concerned`, `amused`, `angry`, `sad`,
`fearful`. Each expression has transparent 96×96 and 128×128 PNGs. Partial proof
or candidate sets are valid review inputs. Approval requires all nine distinct
exports at both tiers. Source paths, dimensions and alpha are validated locally.
Distinct exports do not automatically prove distinct, appropriate expressions;
visual approval remains necessary.

`AppearanceResolver.portrait(kind,id,emotion)` returns the approved expression,
or that same identity's neutral portrait. It never substitutes a different NPC.
`resolvedEmotion` tells the UI which artwork was actually selected. V1 neutral
pairs remain usable while expression production continues.

`EffectDefinition` references a clip, trigger, optional move identity, attachment
and optional rig socket. It declares bounded lifetime, instance count, blend mode
and whether the effect is essential for action readability. Weather and cosmetic
effects do not change simulation outcomes.

`FurnitureDefinition` references appearance, tile footprint, service category and
occlusion. `SceneAsset` declares ground, shore, cliff, ramp, canopy, building,
prop or weather artwork. These declarations describe presentation; they do not
create collision, inventories, services, damage or navigation rules. Authoritative
scene placement remains engineering-owned.

## Provenance and reproducibility

`AuthoringProvenance` records an ID, method, dependency inputs, exact toolchain
versions, descriptive command and optional scalar settings. A command is data:
the asset compiler never executes it. Paths are relative to `art/source` and
cannot escape it. Each input records its SHA-256 and role: master, model, script,
material, pose config, palette, dependency lock or baked input.

A Blender bake must include the actual `.blend` model and `.py` bake script plus
an exact Blender version. Declare external textures/materials, pose or camera
configuration, palettes, render settings and any other file consumed by the bake.
Embedded materials are covered by the `.blend` hash. Ingestion must pin Python,
Pillow and its dependency lock; additional packages such as NumPy, SciPy, rembg,
ONNX Runtime and model-weight revisions must be pinned when used. Broad versions
such as “Blender 3.x, 4.x or LTS” are not reproducible pins.

The build hashes the artifact's complete dependency closure: original PNG bytes,
frame registration, sockets, clips, rig/build definitions, recipe layers and all
declared authoring inputs. This includes `.blend`, `.py`, material and pose-config
bytes. Declared dependency hashes must match disk. Changing any dependency changes
the source digest and invalidates the old approval. Unrelated artwork does not
invalidate an artifact's digest.

Full source authoring and routine CI ingestion are separate checks. A routine
check can reproduce PNGs from committed, approved baked inputs without requiring
Blender or neural inference on every CI machine. That does not prove the bake
itself is reproducible if its model/script/material dependencies are absent.
Store immutable baked inputs separately from derived exports so ingestion cannot
overwrite its own inputs or silently replace approved Blender work with a
procedural proof generator.

`--check` must perform no source-tree writes: no directory creation, cache writes,
bytecode files, downloads, model extraction or rewritten metadata. Reject any
combination that requests extraction/generation while checking. Import expensive
matting tools lazily; cached-input checks should not require those packages.
Record measured check duration on available hardware rather than guaranteeing
an unmeasured universal two-second limit.

## Engineering approval and diagnostics

[ArtApprovalRecordSchema](../../src/presentation/assets/catalog.ts) binds a decision
to subject kind, subject ID, exact source digest, reviewer and timestamp. The
engineering ledger rejects duplicate or conflicting decisions for the same
artifact/digest. A candidate additionally needs structural completeness and its
required dependency approvals; an approval record cannot make a proof playable.

The build writes `candidates.json` with current digests, matching-decision status
and resulting runtime stage. It generates runtime/source/approval JSON Schemas
from the shared Zod definitions. `check:assets` recomputes source digests, validates
the engineering ledger against the compiled catalog and checks dependencies.

Coverage distinguishes **declared HD**, **complete animation** and **approved**.
The Aqualia acceptance gate remains 19 actors: one origin, ten villagers and eight
species. `fullWorld` separately reports 41 actors: three origins, thirty villagers
and eight species. Neutral portrait availability, complete expression sets and
approved expression sets are separate counts. A successful prototype build or
an increased frame count cannot be reported as HD completion.

## Physical presence and art registration

The [physical presence contract](../physical-presence.md) adds per-entity height,
mass and bounded recoil. These do not authorize stretching approved body art,
changing sprite anchors or encoding damage in frames. Keep body, garments,
attachments and equipment on the same pose sample. Supply genuine planted-foot
contacts and stride metadata; cosmetic footprints and mud lean supplement them.
Fliers do not leave ground prints. Camera shake is a restrained presentation
response to committed impacts, disabled by reduced motion; do not bake it into
sprite frames or scene plates. No new physique fields are required in art
manifests: authoritative body values belong to simulation state.

## Packing, quality and CI ownership

The maximum is 2048×2048 **per page**, not one page for the game. One full RGBA
2048² page is 16 MiB. The independent page catalog and selective leases support
multiple pages under High/Balanced/Low **512/256/128 MiB** resident budgets.
Full and half layouts can differ; clips may span pages. Preserve this path even
when an early proof bundle happens to fit on one page. PNG file sizes, total
library size, resident GPU bytes and UI image caches are distinct measurements.

Art owns source exports and manifests. Engineering owns generated catalogs,
approval records and runtime services. Source-only art PRs run compilation and
validation without requiring artists to commit generated runtime diffs. Changes
to the frozen legacy ledgers are not classified as source-only art. Engineering
integration and main always retain generated-bundle reproducibility checks.
The classification also permits the explicit art-owned reports `docs/art/handoff.md`,
`docs/art/handover-context.md` and `docs/art/art-engineering-handoff.md`; it does not
permit approval-ledger, contract, schema or other generated-document edits.
