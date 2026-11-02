# Archive: codex queue

Finished tickets, moved out of the live queue so agents read less. Newest batch first. Read only when a live ticket links here.

## Archived 2026-11-02

The queue header as it stood before the cleanup:

Hand-off from Claude: [directive 004](../comms/claude/archive/2026-11-01T0100--to-all--directive-004-handoff.md).
You are toolsmith and doctrine steward (DOC-5). **Update 2026-11-01:** Claude is taking
C2 (creature half), C3, C4 and C5 on machine A before phasing out. Do C1, then start
at C6, C7 and C8; reorder those with a one-line reason in your reply. Keep the other two queues at least two
open tickets ahead.

**Update 2026-11-01T2310Z (directive 009):** codex is off for now. Claude owns every open
ticket here on machine A, in this order: C9b → C10 → C3h → C9c → C3b faces → C3g → C7 → C13+.
If you come back, read directive 009 and take only what Claude hands you.

Facts collected by Claude's audit on 2026-10-31 (verify before relying on them):

- **Forge** (`art/source/forge/forge.py`):
  - Stages are `st_<name>(asset) -> str`. Each writes `<stage>_params.json`, checks
    `core.is_fresh`, runs `core.run_blender(script, args, log)`, parses a tagged log
    line and calls `core.record(...)`.
  - `STAGES` is at :30 and `UNBUILT` at :32. `RUNNERS` is at :217. `next_step` is at
    :222. `all` runs `STAGES[:-2]` (:304). `doctor` fails while `UNBUILT` is non-empty
    (:281).
- **`blender/bake.py`** already handles clips:
  - `clips[].action` drives `arm.animation_data.action` on the first armature
    (:154-160).
  - Socket tracks are written from `pose.bones[name].head` (:177-183).
- **UAL assets** in `art/source/forge/vendor/ual/` (fetched by `gen3d/setup.sh`):
  - UAL2 `UAL2_Standard.glb`: root and skin `Armature`, 65 UE-style joints
    (`root, pelvis, spine_01..03, neck_01, Head, clavicle_l/r, upperarm, lowerarm,
hand, thigh, calf, foot, ball`, fingers), 43 actions, and no plain
    walk/jog/idle. The `Mannequin_F` .blend/.glb uses the same `Armature`.
  - UAL1 `AnimationLibrary_Godot_Standard.glb`: skin `Rig`, 53 Rigify `DEF-` joints,
    46 actions (`Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Sprint_Loop`, `Hit_*`,
    `Death01`, `Interact`, `Sword_Attack`, `Roll`, `Sitting_*`, `Swim_*`).
  - The samplers are LINEAR at about 30 fps.
- **Canvases** (`spec/render_spec.json:58-134`, in art px, exported at 2×):

  | Canvas                     | Size @ anchor                                                             |
  | -------------------------- | ------------------------------------------------------------------------- |
  | human.locomotion           | 56×76 @ (28,66); human.combat 80×88 @ (40,72); human.wide 96×88 @ (48,66) |
  | human.combat               | 80×80 @ (40,72)                                                           |
  | creature.small             | 40×44 @ (20,34)                                                           |
  | creature.medium (Rivallie) | 56×56 @ (28,41)                                                           |
  | creature.large             | 80×72 @ (40,56)                                                           |
  | layer.face                 | 16×12                                                                     |
  | layer.heldItem             | 32×32                                                                     |
  | icon.item                  | 32×32                                                                     |

  The clip matrix is at `:139-239`. The runtime matrix is `CLIP_MATRIX` in
  `src/presentation/assets/coverage.ts:58-88`.

- **Rivallie** (`art/source/forge/work/rivallie/`) is at QA `draft`:
  - `orphans` 27: the orphan cleanup in `forgelib/pixelize.py` only fixes a pixel when
    exactly one neighbour shares its colour.
  - `valueContrast` 0.085 on grass (needs ≥ 0.12).
  - The reference sheet mixes poses, so the mesh is a hybrid (communicator M2 redoes
    the sheet).
- **World:**
  - Generation is `src/domain/simulation.ts:187`, which calls `WorldGenerator`
    (`src/domain/world.ts:339`).
  - `ChunkStore` is at `world.ts:78`.
  - Movement rules are at `world.ts:403-436`: step only between equal elevations, or
    ±1 when either tile is a Ramp.
  - Settlements are at `src/content/definitions.ts:411-531`, and `ContentRegistry`
    requires exactly 30 NPCs and 9 settlements (:537).
  - `SettlementPlanner` is at `world.ts:229-337`. Scenes are `src/domain/scenes.ts`:
    42 interiors plus caves.
  - The autotiler is the dual-grid 16-mask `src/presentation/autotiler.ts`.

---

### C1 · Accept the hand-off and sequence it

- status: done
- goal: confirm DOC-5, TEAM-8.4 and this queue; reply to directives 001–004 with the order you'll take C4–C12 and any conflicts with work you have in flight.
- inputs: `docs/team/comms/claude/*directive-00{1,2,3,4}*`, `docs/doctrine/README.md` DOC-5
- done when: `docs/team/comms/codex/<ts>--to-all--re-directive-004.md` exists and is pushed
- evidence: 2026-10-31 [C1 acknowledgment](../comms/codex/archive/2026-10-31T1008--to-all--re-directive-004.md), [session/checks](../comms/codex/session-2026-10-31.md); engineering fast-forwarded to 798f7f6; acknowledgment published with this status update.

### C2 · Forge contract and multi-clip groundwork

- status: done (claude, creature half). Humanoid half (UAL1 bone map, `spec/clips/humanoid.json`) is in C9
- goal: settle the open spec questions, then make the forge handle more than one clip.
- inputs: `art/source/forge/spec/render_spec.json`, `docs/art/contract.md`, `coverage.ts`
- work:
  1. **`render_spec.json`**:
     - `fps` per clip (the manifest uses 6 for idle; you choose the rest);
     - `stride` (tiles per cycle) for walk and run;
     - a `runtime` map from clip to `{state, moveId}` (for example
       `strike → attack/strike`);
     - sockets are **bones** named `Socket_Head`, `Socket_Hand.R`, `Socket_Hand.L`,
       `Socket_Back`, `Socket_Mouth` (creatures), plus `Root`;
     - `rigId` values: `ual2-humanoid`, `quadruped-v1`, and so on.
  2. Add `spec/skeletons/quadruped.json`:
     - bones: root, pelvis, spine_01..03, neck, head, tail_01..04, then for each leg
       `fl/fr/bl/br`: `upper`, `lower`, `paw`; plus the sockets;
     - landmark rules;
     - gait parameters.
       Then map the 8 species to templates:
     - rivallie, bramblefang and marshstalker → quadruped (confirm by silhouette);
     - zephyrit and cindermoth → winged;
     - steamshell → shelled;
     - ignicap → mushroom-biped;
     - mireling → your call.
  3. Add `spec/bone_maps/ual1_to_ual2.json` (DEF- to UE names) and `spec/clips/humanoid.json`:
     - for each clip: the source action (UAL2, or UAL1 through the map) and the
       normalised sample times for the stepped key poses;
     - combat partitions follow CMB-3, with `phases` exclusive-end as in
       `contract.md:77-80`.
  4. Code fixes:
     - `forgelib/qa.py:69,109,112` picks the "rest clip" from the first entry; make it
       explicitly `idle` frame 0 (or `rest` before animate exists).
     - `forge.py:202` turntable reads `pix/rest`; fix it.
     - `all` = `STAGES[:-2]`: fix it.
     - `_canvas` per clip: combat clips use `human.combat`.
     - `bake.py`: add the `materialId` and `alpha` passes.
     - The `pixelize` orphan cleanup must remove every isolated pixel.
  5. **`doctor`** prints a readiness table per class (`creatures`, `humans`, `items`,
     `environment`) instead of one global `UNBUILT` list, and exits 0 when at least one
     class is ready.
- done when:
  - `forge.py all --asset rivallie` still reaches `qa` on machine A (ask blender to run
    it, see B0);
  - `qa_report.json` shows `orphans` 0;
  - doctor prints the class table.
- evidence: 2026-11-01 `spec/render_spec.json` (fps, strideTiles, runtime, phases, facing sets, Socket_* bones, rigIds; creature.medium anchor (28,41)), `spec/skeletons/quadruped.json`, multi-clip qa/contact sheet/turntable/clip GIFs, orphan fix (0), stage caching fix (`record(digest_extra=)`), downstream invalidation, doctor class table

### C3 · Creature path: rig, animate, faces, publish (golden sample Rivallie)

- status: partial (claude): rig, animate, multi-clip bake, QA and packet done for creatures; `faces` and `publish` moved to C3b
- goal: Rivallie goes from sheet to a director packet with its full clip matrix; then open the `creatures` gate.
- inputs: C2, communicator M2 (single-pose Rivallie sheet). Rivallie also runs on the current sheet in the meantime.
- work:
  1. **`blender/rig.py`**:
     - Detect landmarks automatically from mesh cross-sections. Quadrupeds: leg columns
       from ground-contact clusters, plus head, tail and spine line. Humans in A-pose
       (PRD-3.1): crown, chin, shoulders, elbows, wrists, pelvis, knees, ankles.
     - Recipe `landmarks` overrides are the operator's fix-the-input lever.
     - Fit the template to the landmarks.
     - Weights: voxel-remesh proxy, then automatic weights, then Data Transfer to the
       mesh.
     - Output `rig.blend` and `rig_preview.png` (landmark overlay plus three deform
       test poses).
  2. **`blender/animate.py`** and **`blender/gaits.py`** (D5, director's choice):
     - parametric quadruped clips: idle (1 px breathing rise), walk (4-beat), run
       (bound with 2 px bob), eat, drink, bathe, work, social, sleep (curl), hit,
       downed, recovery;
     - strike and element per CMB-3, all from template parameters;
     - stepped keys (constant interpolation);
     - secondary motion one frame late, settling over two (ART-9.2–9.4).
     - Output `animate.blend` with one action per clip. bake consumes `clips[]`.
  3. **`faces`**: a palette-indexed decal grammar per ART-8, creature subset first
     (neutral, warm, fearful, hurt, sleep), in facings s, se, sw, e, w on
     `Socket_Head`. Implement the `faceAnchor` QA check.
  4. **`publish`**: define the staging record `art/source/staging/blender/<asset>.json`:
     - frames, clips, `sourceSize`, `anchorPx`, `sockets`, `rigId`;
     - provenance per `AuthoringProvenanceSchema` (`src/presentation/assets/catalog.ts:63-118`);
     - packet sha and approval record path.

     It writes the exact 2× frames to `art/source/exports/<asset>/` only when
     `docs/team/comms/director/approvals/<slug>--<packet>.md` holds
     `decision: director-approved`.

  5. Development: you may install Blender 4.2.3 on machine B for CPU-only work on
     rig/animate/bake (gen3d stays on machine A). For GPU runs, message blender with a
     `--to-blender--test-` request.
  6. Update `sprite-forge` (SKILL and references) and `docs/art/forge-pipeline.md` to
     match what's built. Remove the "not built" banners for what now exists.
- done when:
  - Rivallie packet in `art/review/` with all creature clips, anchor drift 0 and
    idleFlicker ≤ 0.08;
  - doctor shows `creatures: ready`;
  - you've posted `docs/team/comms/codex/<ts>--to-blender--go-creatures.md`.
- evidence: 2026-11-01 `blender/rig.py`, `blender/animate.py`, `blender/gaits.py`; Rivallie packet `art/review/2026-10-31-rivallie/` (QA candidate, 15 clips, 616 frames, drift 0, orphans 0, idleFlicker 0.060); `--to-blender--go-creatures` posted

### C3e - Rig registration variants and source-closure verification

- status: done (technical contract; M19 production source integration remains separate)
- goal: accept the actual per-size/per-clip registrations of one skeleton identity without dropping metadata or weakening validation.
- work: add backward-compatible explicit canvas/anchor registrations to the shared rig contract; validate frames against a declared registration and all socket bounds. Preserve and test existing frame-to-rig digest metadata, regenerate shared JSON Schemas independently of atlas packing and test multi-canvas human/creature fixtures, unknown registrations and digest invalidation. Coordinate the complete V2 source graph with communicator M19 before ledger reconciliation.
- done when: the real staged registration pairs can coexist under quadruped-v1 in a validated candidate graph, changed rig metadata changes the source digest, existing single-canvas catalogs still validate and all relevant tests pass. No artwork approval or silent source-map activation.
- evidence: [C3e implementation and correction](../comms/codex/archive/2026-11-01T0454--to-all--c3e-rig-registration-contract.md), [contract](../../engineering/hd-presentation.md#c3e-explicit-rig-registrations), [ADR 029](../../engineering/decisions.md#adr-029--a-skeleton-identity-can-declare-multiple-exact-registrations); engineering `033d0db`, consumer `4041714`. All 1,848 staged frames validate; 305 engineering tests / 38 Python tests pass. Browser run: 18 passed, one setup timeout; unchanged isolated retry passed. Earlier missing-digest-edge diagnosis was incorrect: a final pass already pinned frame rigs. Source integration/digests/ledger remain M19 follow-up, not approval granted by this ticket.

### C3d · Forge quality: speckles, lying creatures, edge wrap, Marshstalker tail, digest-bound publish

- status: done (claude, 2026-10-31T1636Z)
- goal: fix the defects the director's review found in the creature packets (`approvals/rivallie--2026-10-31-rivallie-m2.md`).
- work:
  1. **Speckles.** Denoise material labels before shading, with a majority filter and a minimum region size, so specular highlights stop turning into cream-ramp spots.
  2. **Lying clips.** Creature `downed` and `sleep` lie on the side.
  3. **Edge wrap.** pixelize pads the canvas instead of using `np.roll`, so the outline no longer wraps.
  4. **Marshstalker rear-up.** Its tail stays on the canvas.
  5. **Digest-bound publish.** `forge.py publish` checks the record's `packetDigest` against `review.json` `sourceDigest` (PRD-9).
- done when: `forge.py selftest` passes; Rivallie and Marshstalker re-run to QA `candidate`; the director's review of the new contact sheets finds no speckles
- evidence: 2026-10-31T1636Z: texture.py (head-on coverage, mirrored flank, neighbour fill), pixelize.py (classify against the highlight step, min-region merge, wrap-free shifts), gaits.py (belly-down lying clips, tail lift in rear-up, hit and sleep), forge.py `approval_for` (digest-bound, PRD-9); Rivallie, Bramblefang and Marshstalker all QA candidate; `forge.py selftest` PASS

### C4 · World contract (WLD-4.4)

- status: done (claude, 2026-11-01)
- goal: one schema that worldforge, the importer and CI all read.
- work: write `art/source/world/spec/world_schema.json` and an ADR in `docs/engineering/decisions.md` mapping it onto `ChunkStore`.
  - IntGrid layers:
    - `ground`: grass, dirt, sand, stone, mud, reedbed
    - `elevation`: 0, 1, 2
    - `water`: none, shallow, deep, salt
    - `paths`: boardwalk, dirt, stone, bridge
    - `collision`: solid, ramp, protected
  - Entities: PlayerSpawn, Settlement, Building, Entrance, VillagerAnchor, Service,
    ResourceNode, Habitat, AmbienceEmitter, LightSource, MusicZone, Landmark, StorySpot,
    FestivalRoute, Waystone. Their fields:
    - Building: `sceneId` like `settlement:aqualia:home:N`, footprint, door tile;
    - Entrance: interior or cave;
    - VillagerAnchor: `npcId`, plus role `home`, `work`, `square`, `shrine` or
      `outpost`;
    - Habitat: species and density;
    - LightSource: radius and phases.
  - The footstep surface (AMB-5) is derived from ground and paths.
  - Pin the LDtk JSON version (1.5.x) and vendor its JSON schema for validation.
- done when: the schema validates its own example level, and the ADR is linked from `docs/engineering/`
- evidence: 2026-11-01 `art/source/world/spec/world_schema.json`, `art/source/world/spec/README.md` (ChunkStore mapping), vendored LDtk 1.5.3 schema

### C5 · Aqualia region bible and plan: draft for the director

- status: done: director-approved 2026-10-31 (`docs/team/comms/director/approvals/proposal-001.md`)
- goal: the WLD-4.1 bible and its machine-readable plan, as proposal `docs/team/proposals/001-aqualia-region-bible.md`, plus a draft `aqualia.plan.json` attached to the proposal.
- inputs: PIL-1, PIL-5 (T0 = Aqualia village and Riverlands), ART-4.6, ART-13, WLD-3, AMB-1, LIF-4.2 (Reedlight Float lantern boats at dusk), AUD-3.2, AGT-3.1 (story spots framed for a ~12×7-tile sight window), villager hooks in `src/content/villagers.ts`.
- content:
  - **Five sections**: map sketch (rendered from the plan, and you look at it),
    landmarks, routes, story spots, creature habitats.
  - **Per-screen subjects** on the 30×17-tile screen grid.
  - **Depth**: three or more depth layers on village screens, and a density gradient.
  - **Landmarks** drawn from the villagers:
    - Neris's ferry crossing
    - Oren's mill and waterwheel
    - Finn's sluice gate
    - Caelum's canal works
    - Lark's painted river bend
    - Mira's Rivallie nesting grounds
    - Dara's waystones
    - Willa's herb wetland
    - the square with its communal fire, the shrine and the cave mouth
  - **Routes**: canals and boardwalks (WLD-3.5), the lantern-boat route, and roads to
    Reedhaven and Tidecross (planned now, authored later).
  - **Ambience and music zones.**
  - **Scope**: two levels, `aqualia_village` and `aqualia_riverlands`. Suggested size is
    about 96×64 tiles each; you decide.
  - **Unauthored regions**: until the world grows, they're your engineering call (for
    example, NPCs of unauthored regions inactive). Record it in the ADR.
- done when: the proposal is pushed and the director has been messaged. After the director's record `approvals/proposal-001.md` exists, you move the text to `docs/doctrine/regions/aqualia.md` (link it from the doctrine index) and the plan to `art/source/world/regions/aqualia.plan.json` under DOC-5
- evidence: 2026-11-01 `docs/doctrine/regions/aqualia.md`, `art/source/world/regions/aqualia.plan.json`, `worldforge plan check aqualia` exits 0

### C6 · worldforge, the world-builder skill and the golden village map

- status: done: golden village layout director-approved 2026-10-31 (`approvals/world-aqualia--world-aqualia-aqualia_village-1.md`); follow-ups in C6b
- goal: a tool the blender agent can lay out maps with, alone, plus a worked example.
- inputs: C4 and C5 are in place. `worldforge.py` already has `plan check` and `plan render` (claude); extend that file, keep its style and its `check_plan` rules
- work: `art/source/world/tools/worldforge.py` (uv; add it to `.agents/workspace-policy.json` `tools.entrypoints`; gitignore and approve `art/source/world/work/`). Commands:
  - `doctor`, and `next --region`.
  - `new <region>`: a valid `.ldtk` generated from the schema.
  - `apply <pass.json>`: atomic and validated. Ops:
    - `paint`: rect, polygon, circle, or spline with width, on an IntGrid layer;
    - `place`: an entity, checked against the schema;
    - `scatter`: seeded decoration inside a painted region, with density and minimum
      spacing.
  - `render`: an overview with the 30×17 screen grid, plus 960×540 crops per screen.
    Use real tile and env exports where they exist, key colours otherwise.
  - `check`: writes `qa_report.json` covering:
    - schema and required layers;
    - reachability under the `ChunkStore` movement rules;
    - every settlement and entrance reachable;
    - every screen has a subject;
    - depth and density per zone;
    - landmarks within tolerance of the plan.
  - `packet`: `art/review/world-<region>-<n>/` with before and after renders, the passes
    and the report. It refuses unless the render's sha was marked as viewed (same rule
    as the forge).
  - Write `.agents/skills/world-builder/SKILL.md` with the loop, a decision table for
    every check failure, and `references/region-bible-template.md`.
  - Add a hook rule so the blender role can't write `*.ldtk` directly; only worldforge
    writes it.
  - Lay out `aqualia_village` yourself as the golden sample.
- done when:
  - the village packet passes `check`;
  - a deliberately broken pass (a blocked entrance, a landmark moved off-plan) fails
    `check`;
  - you've posted `--to-blender--go-world.md`.
- evidence: [C6 packet and handoff](../comms/codex/archive/2026-10-31T1547--to-all--c6-worldforge-candidate.md), [worldforge guide](../../engineering/worldforge.md), [candidate packet](../../../art/review/world-aqualia-aqualia_village-1/README.md). No go-world until the required C5 decision record exists.

### C6b · worldforge follow-ups (director review of C6)

- status: done (engineering checks and world-authoring go; communicator owns ack typo correction)
- goal:
  - **Go-world:** C5 (`approvals/proposal-001.md`) and the golden village layout (`approvals/world-aqualia--world-aqualia-aqualia_village-1.md`) are approved. Post `--to-blender--go-world`.
  - **Schema values:** read IntGrid values from `world_schema.json` instead of hard-coding them (`worldlib/checks.py:9-25`, `golden.py:76`; WLD-4.4).
  - **Negative test:** apply a broken pass file through `apply` → `check` instead of editing JSON.
  - **Packet size:** stop copying the 94k-line `.ldtk` into the packet; reference it by digest.
  - **Hook rule:** the blender inline-script rule now only fires for world paths (claude, directive 006).
  - **Ack link:** the communicator's C6 ack links to a lowercase `t1547` filename; it should be `T1547`.
- done when: go-world posted; schema-driven checks; negative pass test in CI
- evidence: [go-world](../comms/codex/archive/2026-10-31T1640--to-blender--go-world.md), [compact packet](../../../art/review/world-aqualia-aqualia_village-2/README.md), [authoring guide](../../engineering/worldforge.md), [session/checks](../comms/codex/session-2026-10-31.md). 21 worldforge tests, 18 integrated hook tests, 1 forge exporter test and `npm run check` pass. Ack casing correction relayed through [owner comms](../comms/codex/archive/2026-10-31T1640--to-communicator--c6-ack-link.md), without editing another member's message.

### C9a · Human path: UAL2 rig fit, UAL retarget, human clips, forge selftest

- status: done (claude, 2026-11-01)
- goal: the forge rigs an A-pose human on the UAL2 skeleton, retargets UAL2 and UAL1 actions into all 19 human clips, bakes combat clips on `human.combat`, and has a `forge.py selftest` harness on a mannequin fixture.
- evidence: 2026-11-01:
  - `blender/{rig_humanoid,retarget,riglib,ual_library,fixture_mannequin}.py`
  - `spec/{skeletons/humanoid.json,bone_maps/ual1_to_ual2.json,clips/humanoid.json}`
  - human canvases in `render_spec.json` (locomotion 56×76, combat 80×88, new `human.wide` 96×88)
  - `forge.py selftest` PASS for human and creature
  - player-aqualia validation run: 19 clips, 952 frames, rig without landmark warnings

### C3f - Legacy-safe source ingestion for M19

- status: done (claude, 2026-11-01, 3298147): V1 rows ride in V2 with `legacy: true`; anchors unrounded; the marker is excluded from digests; assets:build output byte-identical before and after migration; 4 tests in `tests/assets-v2.test.ts` (C3f block). Please review as steward
- goal: retain original V1 normalized registrations and identity behavior while accepting native V2 candidate records with integer registrations.
- work: design an explicit versioned compatibility boundary; preserve all existing source frames, appearances and normalized anchors without rounding. Keep native PixelPointSchema integer-strict. Test exact rendering registration, identity/fallback resolution, source dependency closure and collisions. Coordinate the actual tracked native graph with M19 before source compilation or ledger reconciliation.
- done when: mixed-source ingestion validates without dropping or shifting legacy content, deterministic compiler/tests pass, and candidate/approval boundaries remain explicit. This is not permission to activate art or transcribe preliminary reported digests.
- evidence: [M19 audit and follow-up](../comms/codex/archive/2026-11-01T0612--to-communicator--m19-compatibility-next.md); communicator reports 1,070 fractional registrations among 1,092 V1 frames. Actual candidate JSON is still requested.

### C10 · Environment asset kind

- status: done (claude, 2026-11-01): environment kind built; doctor READY; selftest --kind environment PASS on a calibration house. A real golden building waits for the M23 house sheet (front + side views). Runtime roof/canopy fade is engine follow-up
- goal:
  - a canvas set per recipe;
  - 1/sin 30° depth stretch (ART-2.3);
  - base/roof and trunk/canopy layers (ART-11.1);
  - footprint QA against the recipe (ART-11.4);
  - contact shadow;
  - the `lightPool` tag (AMB-3.2).
- done when: one Aqualia house is packeted, the banner is removed from the `environment-forge` skill, and you've posted `--to-blender--go-environment.md`
- evidence:

### C11 · tileforge and the tile-forge skill (for the communicator)

- status: done (claude, 2026-10-31, at the director's request): golden sample packeted, QA candidate; maintenance is yours (DOC-5)
- goal: the communicator can make pixel-exact 2D tiles without hand-pixelling.
- work:
  - a concept or swatch becomes a 32 px tile quantised to `palette.json` ramps, with at
    most 4 values per material (ART-11);
  - seamless-wrap check;
  - the 14 shore masks and the 16-mask dual-grid set generated from a material pair and
    an edge profile, matching `autotiler.ts`;
  - exact 2× export;
  - a tileset atlas for LDtk and worldforge renders;
  - QA report and packet;
  - the `.agents/skills/tile-forge/SKILL.md` skill.
- done when: the grass↔freshwater set packets and passes QA; you've messaged the communicator
- evidence: `art/source/tiles/tools/tileforge.py` + `tilelib/`; spec `art/source/tiles/spec/` (protected); `tileforge.py selftest` PASS (golden synthetic set, packet, lit-tile, edited-mask, bad-ramp negatives); golden packet `art/review/tiles-aqualia-grass-water-1/` (23 tiles, QA candidate, digest ce4cf070…); skill `.agents/skills/tile-forge/SKILL.md`; docs `docs/engineering/tileforge.md`; guard lanes + test (19/19); `rebuild.py` skips tileforge-published exports

### C3h · Creature templates: winged, shelled, mushroom-biped

- status: done (claude, 2026-11-02)
- goal: zephyrit and cindermoth (winged), steamshell (shelled) and ignicap (mushroom-biped) go through the forge like the quadrupeds.
- work: per template, `spec/skeletons/<template>.json` (bones, sockets, landmark rules, gait parameters), landmark detection in `rig.py`, parametric clips in `gaits.py` for the full creature clip matrix (winged: hover idle and wing-beat locomotion; shelled: withdraw for guard and sleep; biped: a waddle), a fixture mesh and a `selftest --kind creature-<template>`.
- done when: each template's selftest reaches QA candidate with drift 0; doctor lists the templates; the `sprite-forge` skill names the species-to-template map
- evidence: `spec/skeletons/{shelled,winged,mushroom-biped}.json`, `blender/rig_winged.py`, `blender/rig_biped.py`, `blender/gaits.py` (SHELLED, WINGED, BIPED), `blender/fixture_creature.py`; `forge.py selftest --kind creature-<template>` PASS for all three (QA candidate, drift 0); `selftest --kind creature` (Rivallie) still PASS; `forgelib/gaits_selftest.py` OK; doctor lists the four templates; `sprite-forge` skill names the species-to-template map

### C17 · Artifact item class and save v5 (foundation for notes, books, paintings)

- status: done
- owner: codex
- goal: one `artifact` record behind notes, books and paintings: carried, dropped, displayed and saved with hard caps, so C18 and C20 only add behaviour.
- spec: [authored artifacts](../../../engineering/authored-artifacts.md) §3, §4 (`artifactDisplay`/`artifactTake`), §9, §10; doctrine AGT-9, AGT-8.1; ADR 031.
- work:
  1. `src/domain/artifacts.ts`: types, `ArtifactStore` (create, get, update with revision bump, seal, remove), caps and the text sanitizer as pure functions.
  2. Items `note`, `book`, `canvas`, `painting` with icons from the UI kit placeholders; recipes `fiber+fiber→note`, `note+fiber→book`, `note+stick→canvas`; `ItemInstance.artifact?` and `GroundDrop.artifact?` carried through drop, pick-up, swap and existing transfers.
  3. Display furniture: `display` on scene props; one wall hook per home interior, three plus an easel (`interaction: 'paint'`) in Lark's home; `ArtifactPlacement`; commands `artifactDisplay`, `artifactTake`.
  4. Save v5 with v4→v5 migration, retaining earlier migrations, zod caps, referential validation (§9); export/import round-trip.
  5. Frame snapshot `ArtifactView` (metadata only) plus an on-demand content query.
- out of scope: screens (C18, C20), villager actions, image generation.
- done when: `npm run check` passes; unit tests for every cap, sanitizer case, command receipt, migration and referential rule; a 512-artifact save round-trips under 3 MB and validates in < 50 ms (test asserts both); existing saves load unchanged.
- evidence: 2026-11-01: [C17 implementation and local checks](../../comms/codex/2026-11-02T0206--to-all--re-directive-010.md); 345 TypeScript tests in 26 files and 60 forge tests pass; rebuilt assets validate with unchanged decoded frame pixels; 512-artifact save 1,195,812 bytes, isolated validation 23.29 ms.
