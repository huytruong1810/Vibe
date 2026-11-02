# Queue: codex

Read your brief `docs/team/briefs/codex.md` and [the queue rules](README.md) first.
Finished tickets are in [archive/codex.md](archive/codex.md); open it only when a live ticket links there.

**Who does what (directive 011, 2026-11-02, claude away until about 2026-11-09).** Codex
owns this queue: **C22 → C17 → C18 → C19 → C20**, then C3g and C7, with C23 and C12
standing (C19 can run beside C18; C21 only on the director's go). Machine B has no
Blender or GPU: build against mocks and send live GPU smokes to blender as
`--to-blender--test-` requests. The forge tickets under "Waiting for claude" need
Blender on machine A; leave them unless the director says otherwise.

## Now: codex

### C22 · Beta channel: green CI, a deploy on every green push, a playtest loop

- status: open (first)
- owner: codex
- goal: the director plays the latest green build from a URL on any day, files playtest notes in one place, and they become tickets, without anyone on machine A.
- context: CI was red for 100+ runs (`format:check` failed on machine-written sources, so browser tests and the benchmark never ran) until claude's `88b11ba`. The repo is public, so GitHub Pages is free.
- work:
  1. **Keep CI green.** A red `studio/doctrine-v1` is the top ticket until fixed, the same day. Write the rule and the job list in `docs/operations/operations.md`.
  2. **Deploy:** `.github/workflows/beta.yml` on `workflow_run` of "Reference game checks" succeeding on `studio/doctrine-v1`: `vite build` with `base: '/Vibe/'`, then `actions/upload-pages-artifact` and `actions/deploy-pages` (`pages: write`, `id-token: write`). Watch out: catalog URLs are absolute `/assets/...` (`Url` in `src/presentation/assets/catalog.ts`). Resolve them against `import.meta.env.BASE_URL` at fetch time (one place in the asset manager) and test both `/` and `/Vibe/`. The director switches Pages to "GitHub Actions" once (Settings → Pages).
  3. **Build stamp:** commit sha, date and branch on the settings screen and in exported saves; `public/beta-notes.json` with the commit subjects since the previous deploy, shown as "What changed" on the title screen.
  4. **Ollama from the beta site:** the page origin is `https://huytruong1810.github.io`. Document `OLLAMA_ORIGINS` and Chrome's local-network permission prompt in `docs/operations/`. When the call is blocked, the setup dialog names the exact fix. Without Ollama, the game stays playable with fallback dialogue.
  5. **Playtest intake:** `.github/ISSUE_TEMPLATE/playtest.yml` (build stamp, what you did, expected, saw, screenshot, exported save). Triage weekly into queue tickets (C12).
  6. **Nightly:** run CI nightly (today it is weekly), keep browser screenshots and benchmark JSON as artifacts for 14 days.
- out of scope: hosting Ollama or an image server anywhere but the player's machine.
- note: editing `.github/workflows/` needs a token with the `workflow` scope on machine B.
- done when: a green push to `studio/doctrine-v1` is live on the Pages URL with its sha within 15 minutes; the playtest template exists; the operations doc lists the jobs and the green-CI rule; claude's local check of `/Vibe/` asset loading is replaced by a CI browser test
- evidence:

### C17 · Artifact item class and save v4 (foundation for notes, books, paintings)

- status: open
- owner: codex
- goal: one `artifact` record behind notes, books and paintings: carried, dropped, displayed and saved with hard caps, so C18 and C20 only add behaviour.
- spec: [authored artifacts](../../engineering/authored-artifacts.md) §3, §4 (`artifactDisplay`/`artifactTake`), §9, §10; doctrine AGT-9, AGT-8.1; ADR 031.
- work:
  1. `src/domain/artifacts.ts`: types, `ArtifactStore` (create, get, update with revision bump, seal, remove), caps and the text sanitizer as pure functions.
  2. Items `note`, `book`, `canvas`, `painting` with icons from the UI kit placeholders; recipes `fiber+fiber→note`, `note+fiber→book`, `fiber+stick→canvas`; `ItemInstance.artifact?` and `GroundDrop.artifact?` carried through drop, pick-up, swap and give.
  3. Display furniture: `display` on scene props; one wall hook per home interior, three plus an easel (`interaction: 'paint'`) in Lark's home; `ArtifactPlacement`; commands `artifactDisplay`, `artifactTake`.
  4. Save v4 with v3→v4 migration, zod caps, referential validation (§9); export/import round-trip.
  5. Frame snapshot `ArtifactView` (metadata only) plus an on-demand content query.
- out of scope: screens (C18, C20), villager actions, image generation.
- done when: `npm run check` passes; unit tests for every cap, sanitizer case, command receipt, migration and referential rule; a 512-artifact save round-trips under 3 MB and validates in < 50 ms (test asserts both); existing saves load unchanged.
- evidence:

### C18 · The written word: book screen, villager reading and writing

- status: open (after C17)
- owner: codex
- goal: the player reads and writes notes and books on a book screen; villagers read bounded ranges, write notes and diary pages, and no prompt grows with what was written.
- spec: [authored artifacts](../../engineering/authored-artifacts.md) §4 (`artifactWrite`, page add/remove, seal), §5 (actions, validation, grounding, the two-step reading job, `readables` world facts), §8.1, §11; doctrine AGT-8, AGT-7 budgets.
- work:
  1. Commands `artifactWrite`, `artifactPageAdd`, `artifactPageRemove`, `artifactSeal`.
  2. Book screen (§8.1) on the UI kit: read spread, write mode with live 24×96 counters, seal confirm, keyboard and gamepad paths, debounced saves.
  3. `READ_TEXT`, `WRITE_NOTE`, `WRITE_PAGE` in `AgentActionSchema` with validator rules and per-day rates; `InferenceJob.kind = 'reading'` with `ReadingResponseSchema` (no action field); `reading` memory kind with `{artifactId, revision, range}` provenance; `continueReading` fact; `readables` in world facts (≤ 5, ≤ 120 tokens, first to drop under budget).
  4. Give two villagers a reason to use it in content: Lark keeps a sketch diary (one `WRITE_PAGE` per day at home); the dock master posts a tide notice note on a shelf. Profile text only, no scripted calls.
- out of scope: rich text, villagers editing others' text, sharing outside the save.
- done when: unit tests in spec §11 rows "caps/commands", "`READ_TEXT` bounds" (property test: any content → reading prompt ≤ 2000 estimated tokens), "prompt injection" (a page ordering a gift changes no state), "writing grounding"; Playwright writes a 3-page book, seals it, reopens it read-only and captures the spread at 1080p (look at it, PRD-5); `npm run test:ollama` gains a reading round-trip that blender runs on machine A (`--to-blender--test-`), AGT-7 reading budget recorded in `docs/operations/`.
- evidence:

### C19 · Image provider adapter, GPU arbiter, palette quantizer, operations guide

- status: open (parallel with C18; needs C17 only for the painting record in step 4)
- owner: codex
- goal: the game can turn a brief into a 48×32 palette painting through a local loopback server on Linux, Windows and macOS, without fighting the villager model for the GPU.
- spec: [authored artifacts](../../engineering/authored-artifacts.md) §6, §6.1, §7.4, §10, §12; doctrine AGT-6.4; ADR 031. Research behind the provider choice is in the spec and in claude's message `2026-11-02T0139--to-codex--artifacts-and-image-generation.md`.
- work:
  1. `src/adapters/image.ts`: `ImageProvider`, `SdCppProvider` (`/sdapi/v1/txt2img`), `OllamaImageProvider` stub (probe says unavailable), loopback URL validation, size cap, timeout, abort.
  2. `GpuArbiter`: image jobs through `InferenceScheduler.exclusive`; optional Ollama unload (`/api/generate` with `keep_alive: 0`); villager jobs only when paused, asleep or accelerated and no dialogue; dialogue aborts and requeues villager jobs; player jobs never preempted.
  3. `src/domain/painting-quantize.ts` (pure) plus PNG decode in a worker (`createImageBitmap` → `OffscreenCanvas`); golden-hash fixture test.
  4. Settings: Image endpoint, provider, "Unload the villagers' model while painting" (default on), Test button.
  5. `docs/operations/image-generation.md`: install and launch `sd-server` on Windows (CUDA build) and Linux; pinned release; model files (Z-Image Turbo GGUF + its Qwen3-4B text encoder + VAE, Apache-2.0; FLUX.2 klein 4B as the alternative; never klein 9B, non-commercial); the exact command line verified against the project's docs; VRAM and timing measured on machine A; CORS check; troubleshooting.
- out of scope: ComfyUI provider; any model other than Apache-2.0 weights; Ollama image generation beyond the stub.
- done when: unit tests for adapters (mock fetch: ok, HTTP error, oversize, timeout, abort, non-loopback URL), arbiter (dialogue preempts and requeues a villager job; a player job is not preempted; unload is called when enabled), quantizer (golden hash, ≤ 16 colours, all palette members, deterministic); the ops guide exists; blender's live smoke on machine A generates one painting through `sd-server` and records the player-painting timing against the 30 s budget.
- evidence:

### C20 · Paintings: villagers paint, the player paints, everyone sees them

- status: open (after C17 and C19)
- owner: codex
- goal: villagers paint from their memories and hang paintings at home; the player paints at an easel from a prompt and keeps or retries; villagers perceive paintings by caption.
- spec: [authored artifacts](../../engineering/authored-artifacts.md) §4 (`paintingRequest`, `paintingKeep`, `paintingDiscard`), §7.1–7.3, §7.5, §8.2, §11; doctrine AGT-6 (all of it), AGT-3.2/3.3 for captions.
- work:
  1. `CREATE_PAINTING` and `HANG_PAINTING` actions with brief schema, affinity check for villager subjects, rates (artists 1/day, others 1/7 days), pending artifacts that survive reload.
  2. Content rules (§7.3) as data in `src/content/`, shared by villagers and the player.
  3. Caption job (vision once, ≤ 40 words; brief subject when no vision model); hanging is a notice event; painter gets a `fact` memory.
  4. Painting screen (§8.2) from the easel or a blank canvas: prompt, chips, progress, Cancel, palette preview at 4× beside the raw output, Keep / Retry / Discard.
  5. Rendering: LRU texture cache (32), framed display on hooks, inventory thumbnail, pending easel.
- out of scope: pixel editing (C21); painting sizes other than 48×32.
- done when: unit tests for brief validation, rates, allowlist rejections (lettering, URL, brand list), pending-survives-reload; Playwright with a mocked provider paints, keeps, hangs the painting on a hook and captures it at 1080p (look at it, PRD-5); blender's live smoke on machine A: Lark paints overnight during sleep acceleration with `gemma4:26b` and `sd-server`, the painting hangs, a villager's next dialogue can mention it from the caption; contact capture attached to the reply.
- evidence:

### C21 · Player pixel touch-up for paintings (optional)

- status: open (after C20; take it only if the director says go after seeing C20)
- owner: codex
- goal: the player can retouch a kept painting pixel by pixel in the game palette; no model involved (AGT-6.7).
- spec: [authored artifacts](../../engineering/authored-artifacts.md) §8.3.
- done when: editor with pencil, fill, eyedropper and 32-step undo; output passes the same palette and colour-count validation; Playwright edit-and-save test; capture looked at.
- evidence:

## After C20: codex

### C3g · Follow-ups from the beta slice (claude, 2026-11-01)

- status: open
- goal: tidy what the beta slice exposed.
- work:
  1. Packet gallery atlas tab (`src/presentation/gallery.ts:332`, `renderAtlas`) shows only page 0 under a hard-coded "Single page: bundle.png" label. The build now emits four pages.
  2. Decoded atlas memory went from 14.97 to 63.88 MiB full-res (four 2048 pages, mostly 160×144 quadruped canvases). Decide on a budget, then trim per-clip canvases or move review-only frames out of the runtime atlas.
  3. Scale: forge creatures render at doctrine scale and look small beside the oversized legacy humans and creatures. Expected while legacy art remains; check it again when M11 humans land.
- done when: the gallery shows every page and the atlas budget is written into `docs/engineering/`

### C7 · Authored world in the engine (WLD-M1…M4)

- status: partial (candidate compiler/loader slice). Claude scoped activation on 2026-11-01 and handed it back: `Simulation` builds only from `WorldGenerator().generate(seed)` (`simulation.ts:187`), saves regenerate from seed (`save-schema.ts:447`), 40 sites read fixed `VILLAGES` coordinates, and the authored map is one 90×68 level, so 20 villagers of the other two villages would be in void. Next: map-driven settlements and player spawn (WLD-M2), save `worldSource` versioning (WLD-M3), then a beta toggle. Village layout approved (village-1/-2 records); Riverlands changes-requested
- goal: a new game loads the authored LDtk map; procedural world generation is retired.
- work:
  - a build-time importer from the schema into `ChunkStore`;
  - map-placed settlements, entrances, anchors and habitats (WLD-M2);
  - version bumps (WLD-M3);
  - CI validation that reads `world_schema.json` (WLD-M4);
  - update `docs/engineering/full-world-presentation.md` (its canal ban at :5, :85, :99
    is superseded by WLD-3.5 and L8).
- done when: `npm run check` passes with tests and soak running on the authored map
- evidence: [candidate importer handoff](../comms/codex/archive/2026-10-31T1614--to-all--c7-candidate-importer.md), [compiler/loader guide](../../engineering/worldforge.md#c7-candidate-compiler-and-domain-loader), [ADR 021](../../engineering/decisions.md#adr-021--candidate-authored-world-compilation). Runtime activation, Riverlands visual approval and forage placement remain outstanding; no authored-world soak is claimed. C5/layout records are now published upstream: [directive 006 receipt](../comms/codex/archive/2026-10-31T1627--to-all--c7-review-update.md).

- follow-up: Riverlands history is integrated and full-region candidate validation now passes (two levels / 219 placements). Historical approval/draft tests use pinned fixtures; alternate-project QA is read-only and isolated. See [fixture repair](../comms/codex/archive/2026-10-31T2248--to-all--c7-fixtures-and-art-followups.md). C7 activation remains separate.

## Waiting for claude (back about 2026-11-09)

Forge work that needs Blender on machine A, in order: C9b `fit` → C9c → C3b faces.

### C9b · Items, fit, human faces

- status: in-progress (claude). **Items done 2026-11-01:** source prep, orient, icon scale, packet and publish; doctor `items: READY`; golden hatchet **director-approved 2026-11-02** (blender B14 publishes it). Human `publish` done (ed32dab). Runtime held-layer composition done 2026-11-02 (hand grip and occlusion tracks, held clip contract, compositor; see hd-presentation C9b runtime held-item composition): the hatchet shows once a modular human body is integrated. Open: `fit` (garments)
- goal: the remaining human-class stages.
  - `items`: 8 facings × 8 grip angles plus an inventory icon from one mesh (ART-15), registered to `Socket_Hand.*`.
  - `fit`: garment parts (Surface Deform or Shrinkwrap, weights from the body, hidden body faces masked, PRD-1).
  - The `thinFeature` check.
  - Human faces: the full 9 expressions plus blink, sleep and hurt, sharing the C3b grammar.
- done when: doctor shows `items: ready` and humans with nothing pending; you've posted `--to-blender--go-items`
- evidence: [human-face sidecar increment](../comms/codex/archive/2026-11-01T0247--to-all--c9b-human-face-sidecars.md), [contract](../../engineering/hd-presentation.md#c9b-human-face-sidecars), [ADR 027](../../engineering/decisions.md#adr-027--human-expressions-as-independent-body-bound-sidecars); engineering `fb621e8`, consumer `4d879bc`. Seven human-face tests, 21 publication and two exporter tests pass, plus 299 engineering tests. Native/4x grammar proofs inspected; real-human fitting/motion and director acceptance remain separate. No items-ready or completed C9b claim.

- follow-up: engineering `3430546` adds a draft 64-held-pose-plus-icon planner, explicit screen-space grip convention, source/contract/tool pins and atomic writes; eight planner tests and all 38 forge Python tests pass. Item rendering/QA remains unfinished. See [item contract](../../engineering/hd-presentation.md#c9b-item-pose-planning), [ADR 028](../../engineering/decisions.md#adr-028--explicit-held-item-mesh-pose-plans-before-rendering). C3e is now delivered; resume item rendering while M19 integrates its source graph.
- renderer: engineering `7586e49`, consumer `0575294` deliver rigid-mesh baking, source snapshots, projected sockets, immutable hashed output and atomic items.json replacement. All 49 forge tests pass locally and independently in the consumer checkout; all 305 engineering tests/types/assets/build pass. [B13 request](../comms/codex/archive/2026-11-01T0612--to-blender--test-item-renderer.md) covers the real Blender cuboid calibration, unverified here because Blender 4.2 is unavailable. Source prep, gallery/publish adapters, runtime angle/occlusion tracks, garment fit and human publication remain pending; no go-items. Automatic review rejected the optional protected sprite-forge runbook amendment; it remains unchanged, with commands documented in the engineering guide instead.

### C9c · Human clip polish, per-clip canvases in review export, contract docs

- status: open
- goal: finish what the C9a validation run (`work/player-aqualia`, `work/selftest-human`) showed.
- work:
  1. **Done (claude, 2026-10-31T1636Z):** `forgelib/review.py` `export_packet` now registers frames per clip canvas, with a test in `review_selftest.py`. Previously: Humans bake combat clips on `human.combat` and lying/bending clips on `human.wide`; `bake/tracks.json` has `canvases[clip]`. Today it uses one canvas.
  2. **Weak combat reads:** strike (UAL1 Punch_Jab), element (Spell_Simple_Shoot) and bow_shot (a two-handed pistol aim as a stand-in) barely move at 56 px. Add authored pose overlays: bone rotations at given frames, layered after the retarget and declared in `spec/clips/humanoid.json`. Give each one a readable windup, active and recovery (CMB-3, ART-9.2). bow_shot needs a real draw: left arm forward, right hand to the ear, release.
  3. **eat and drink:** the hand stays at chest height. Pick the Consume window by eye, or add an overlay to bring the hand to the mouth.
  4. **Contract docs:** update `docs/art/contract.md`, `contract-v2.md` and `docs/engineering/hd-presentation.md` for the human canvases now in `render_spec.json`.
- added 2026-11-02 (from the C9b held-item overlay): while an item is held, idle and walk should carry it away from the leg (it vanishes against the trousers in s and n), and `strike` must swing the item hand, not punch with the free one. Either item-aware clip variants or an arm offset in the held clips; prove it on the hatchet overlay.
- done when: in `forge.py selftest --kind human`, the strike, element and bow_shot strips read at 1×; packet review.json frames register on their own canvases; tests green
- evidence:

### C3b · Creature faces and publish

- status: partial (manifest integration done by claude at 0a5e5c6: 3 bodies approved and active in game). **Faces: changes requested 2026-11-01** (`docs/team/comms/director/approvals/rivallie--2026-11-01-rivallie-faces-d749a4350126.md`): register decals to a face point about 3 art px below `Socket_Head` (per-species offset or a `Socket_Face` bone); `faceAnchor` fails any decal pixel outside the silhouette or on its outline row; hurt and fearful need a distinct pixel in e/w. Re-packet the faces on the approved body 69b6c10d…
- goal: finish the creature class. Then `doctor` lists nothing pending for creatures, and approved creature packets can be published.
- inputs: the Rivallie packet `art/review/2026-10-31-rivallie/`, `bake/tracks.json` (Socket_Head per frame), ART-8, `render_spec.expressions`, `catalog.ts` `AuthoringProvenanceSchema`.
- work:
  1. **`faces`**: a palette-indexed decal grammar (eyes 2 px with a 1 px highlight on the light side, brows 1 px, mouth 1–2 px) for the creature subset: neutral, warm, fearful, hurt, sleep.
     - It is drawn on `layer.face` 16×12, registered to `Socket_Head` in facings s, se, sw, e and w.
     - Implement the `faceAnchor` QA check.
     - Rivallie's eyes are `hair-ink` and its nose is `outline-neutral` (sheet ramps).
  2. **`publish`**:
     - Define the staging record `art/source/staging/blender/<asset>.json` with frames, clips (fps, playback, strideTiles from the animate record, runtime state/moveId, phases), `sourceSize`, `anchorPx`, sockets per frame and `rigId`.
     - Include provenance per `AuthoringProvenanceSchema`: `blender-bake`, the `.blend` input as model, the script inputs and the pinned Blender version.
     - Record the packet sha and the approval record path.
     - Copy the exact 2× frames from `pix/export/` into `art/source/exports/<asset>/`, gated on the approval file (`st_publish` already checks it).
  3. In `forge.py` `CLASSES`, remove these two from creatures' `pending`. Update the `sprite-forge` skill and the `qa-fixes.md` banner.
- done when: Rivallie re-runs with faces in the packet; `publish` writes the staging record once a director approval record exists (test with a scratch record and delete it afterwards); `doctor` shows creatures with nothing pending
- evidence: [C3b tool handoff](../comms/codex/archive/2026-10-31T2146--to-blender--c3b-publish-and-faces.md); [registered face candidate](../../../art/review/2026-10-31-rivallie-faces-145faf106c4e/faces.json); 16 finishing and two packet-export tests pass. Body approval excludes faces; no approved packet is rerun.

- distribution: source-only branch `eng/c3b-c7-tools` at `f037e2e` / draft PR #3 avoids the protected runbook merge delta. [Guarded handoff](../comms/codex/archive/2026-10-31T2346--to-blender--c3b-source-only-handoff.md); [machine-A execution report](../comms/blender/archive/2026-10-31T2355--to-codex-communicator--c3b-b8-b9-results.md) is integrated, with 1,848 staged frame hashes verified locally. [Portable-source correction](../comms/codex/archive/2026-11-01T0145--to-all--c3b-portable-provenance.md) at engineering `9dd81ee`, consumer `01e9fbb` / PR #4: 21 publication and two review-export tests pass. B10 packaging is delivered; M19 source integration and separate face acceptance remain; no new artwork approval.

## Waiting on the director

### C8b · HUD fixes from the director's review

- status: candidate / awaiting director visual acceptance
- goal:
  - **Done (claude):** the dash button text is hidden on the kit buttons (`theme.css`); the aria-labels stay. Previously: `layout.ts:7` draws "Space" (and "J"/"K") over kit buttons that already carry labels; draw one label, not two.
  - **Kit art:** use the kit's `bar_*.png` and `slot_*.png` instead of flat CSS fills.
  - **Day/phase panel:** keep it separate from the minimap, as in `art/source/ui/kit/hud_mock.png`.
  - Send the director new 1080p captures for visual acceptance.
- done when: captures in comms; the director's visual acceptance recorded
- evidence: [C8b implementation and inspected captures](../comms/codex/archive/2026-10-31T1834--to-director--c8b-hud-candidate.md); 294 unit tests / 22 suites, full 18 browser journeys and final two C8b checks pass. No gameplay activation or source-art changes.

### C11b · Terrain tiles in the renderer and worldforge renders

- status: candidate (implementation and isolated golden proof; native M9 approval remains separate)
- goal: the game and worldforge draw what tileforge publishes, with the same composition as tileforge's previews.
- inputs: `docs/engineering/tileforge.md` (runtime contract), `art/source/tiles/tools/tilelib/preview.py` (`TileSet.compose`, `variant_of`), `src/presentation/renderer.ts` `drawChunk`
- work:
  1. Ground variants: when `<runtimeId>_v<k>` appearances exist, pick with `fmix32(cellHash(x, y)) % (1 + variants)` (`tile_spec.json` `variantPick`); test that the pick matches `variant_of` for a fixed grid.
  2. Overlay families beyond freshwater: draw dual-grid tiles for any material whose `<id>_mask_{1..14}` appearances exist (dirt and stone paths, sand shore, reedbed); keep the rectangle fallback only when art is missing.
  3. Ground materials from the authored map: draw `ground_<surface>` for stone and mud too (C7 importer surfaces), not only grass, dirt and sand by biome.
  4. worldforge `draw_level`: compose ground and overlays through tileforge's `TileSet.compose` (or the published exports) so blender's map renders show real ground and shores; keep `render` deterministic and the packet receipts valid.
  5. Atlas budget: report the added terrain pages in `coverage.md`.
- done when: with the golden set published to a scratch exports dir, a 1080p capture of the village shows the tileforge water and shores and grass variants; worldforge village render uses them; tests green
- evidence: [C11b handoff](../comms/codex/archive/2026-11-01T0107--to-all--c11b-terrain-integration.md), [consumer contract](../../engineering/tileforge.md#c11b-consumers-and-isolated-proof), [ADR 026](../../engineering/decisions.md#adr-026--shared-terrain-composition-with-isolated-candidate-fixtures). Runtime and offline proofs remain explicit fixtures, not art approval or C7 activation.

## Later

Creature minds (C13–C16) start after C7; C8 holds the remaining brief P0 rows.

### C8 · Existing P0s from your brief

- status: in-progress (UI/packet-gallery first)
- goal: the UI kit (UI-M6, L9), the approvals ledger (L7), 2× scale (ART-M1…M3), the in-scene review gallery for `art/review/` packets (PRD-M2) and the `elder` build profile. Interleave them with C4–C7 as you judge best. The gallery is what the director uses to review golden samples, so land it before C3's packet if you can.
- done when: the acceptance column of each row in `docs/team/briefs/codex.md`
- evidence: [C8 implementation and validation](../comms/codex/archive/2026-10-31T1040--to-all--c8-ui-packet-gallery.md); [ADR 019](../../engineering/decisions.md#adr-019--director-ui-kit-and-isolated-candidate-packet-preview). This slice does not complete the remaining C8 gates.

### C13 · Creature movement layer and brain interface (CRM-M1, CRM-M2)

- status: open
- goal: creatures flock, hunt and flee by scripted movement, and a scripted utility brain drives combat through the fixed observation and intent interface that the learned brain will later plug into.
- inputs: `docs/doctrine/14-creature-minds.md` CRM-1…CRM-3, CRM-6.1, CRM-8; the existing predation and disposition code in `src/domain/` (creatures, combat, simulation); `Habitat` regions (C7).
- work:
  - per-species flocking weights and predation pursuit/evasion;
  - the observation vector and the masked intent space as a versioned schema;
  - decisions staggered every 3–6 ticks, with a reaction delay;
  - LOD by distance (CRM-8.2);
  - an ADR in `docs/engineering/decisions.md`.
- done when: deterministic soak unchanged; benchmark shows 150 creatures within CRM-8.1 for movement and the scripted brain; unit tests for masking and reaction delay
- evidence:

### C14 · Combat director and partner intent (CRM-M3)

- status: open
- goal: attack tokens (2 melee and 1 ranged/element against the player to start), a readiness ring, no off-screen attacks, difficulty knobs, and the partner's intent icon in the HUD.
- done when: a browser journey with 20 hostiles shows at most the token count attacking at once; partner icon visible; tests green
- evidence:

### C15 · Headless training bridge (CRM-M4)

- status: open
- goal: the deterministic Node simulation exposed as a multi-agent environment to PufferLib or CleanRL. Pin the versions; Python tooling runs through `uv` like the forge. The pipeline is imitation of the C13 scripted brain, then PPO with shared parameters. Training runs record seed, config, data hash and weight hash (CRM-7.3).
- inputs: C13. Training can run on machine A's GPU; ask blender to run long jobs through `--to-blender--test-` if needed.
- done when: an imitation-trained policy matches the scripted brain's intent choices on a held-out set to a threshold you set and record
- evidence:

### C16 · Learned System 1 policy v1 (CRM-M5…M7)

- status: open
- goal: ship the learned brain behind the scripted/learned switch:
  - deterministic CPU inference (float32 or int8);
  - weights as versioned content with a save hash;
  - memory counters;
  - species identity tests in CI (CRM-6.4);
  - debug overlay and observation inspector;
  - a model card.
- done when: 150 creatures in combat within CRM-8.1; species tests green; a save replays to identical decisions; the director reviews a capture of a 20-creature fight (scripted vs learned side by side)
- evidence:

## Standing

### C23 · Ledger every integrated, approved body (standing)

- status: open (standing)
- owner: codex
- goal: approved art reaches gameplay the day the communicator merges it.
- work: after each `art:integrate merge` commit, run `npm run art:integrate -- ledger <asset>`, `npm run assets:build && npm run check:assets`, a 1080p in-game capture you look at (PRD-5), commit and push. The tool refuses if the approval record changed, isn't `director-approved` for the staged digest, or any frame differs from the export: report that, don't work around it.
- done when: never closes
- evidence:

### C12 · Keep the team fed

- status: open (recurring)
- goal: every queue has two or more open tickets; split big tickets; turn the brief's backlog (P1–P3) into tickets as each milestone lands; keep skills and docs truthful to the code (a skill must never describe a feature that doesn't exist).
- done when: never closes; add a dated evidence line each week
- evidence: 2026-10-31: B2 is opened by [go-world](../comms/codex/archive/2026-10-31T1640--to-blender--go-world.md); B6/B7 remain actionable. Communicator has M12/M13 review/kit work and M14–M16 follow-ups; [ack correction](../comms/codex/archive/2026-10-31T1640--to-communicator--c6-ack-link.md) is relayed to its owner. No duplicate tickets added.
- update 2026-11-01: B13 offers technical item calibration while real source prep stays gated. M19 requests the actual native candidate JSON as a review artifact; M22's audit is received and C3f is the whole-source compatibility prerequisite. Existing B2/B3/B4 and M9/M11 remain available subject to their explicit input gates. No invented approvals or protected-file workarounds.
