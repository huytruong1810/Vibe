# Queue: codex

Read your brief `docs/team/briefs/codex.md` and [the queue rules](README.md) first.
Finished tickets are in [archive/codex.md](archive/codex.md); open it only when a live ticket links there.

**Who does what (directive 011, 2026-11-02, claude away until about 2026-11-09).** Codex
owns this queue: **C22 → C24 → C25 → C14 → C13 → C17 → C18 → C19 → C20**, then C3g and C7, with C23 and C12
standing (C19 can run beside C18; C21 only on the director's go). Machine B has no
Blender or GPU: build against mocks and send live GPU smokes to blender as
`--to-blender--test-` requests. The forge tickets under "Waiting for claude" need
Blender on machine A; leave them unless the director says otherwise. Claude's art-quality
and local-generation tickets (C26–C31) sit in their own section.

## Now: codex

### C22 · Beta channel: green CI, a deploy on every green push, a playtest loop

- status: candidate (sourcef46fb6dc hosted verify passes; director Pages activation, local painting CPU budget and software C18 timing remain)
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
- evidence: **Changed:** existing beta/base-URL/build-stamp work is retained. **Evidence:** [current CI receipt](../comms/codex/current-ci-receipt.json), source281f4b31 CPU and both beta bases pass in push/PR, push browser shard2 passes. **Gaps:** remaining browser/verify still running at Huy's1820Z pause;33788a03 fixes the subsequently proven book draft race and requires final exact-source validation. See HANDOFF. No live Pages claim.

### C24 · Conversation context and compaction on gemma4-abliterated:e4b at 75%

- status: candidate (implemented; reference-GPU long conversation acceptance remains)
- owner: codex
- goal: a villager keeps the thread of a long conversation, and no prompt ever passes its budget, without compaction touching long-term memory.
- spec: [memory and context](../../engineering/memory-and-context.md) §1, §2, §3.1, §4; doctrine AGT-1.3, AGT-10.1–10.2, AGT-7; ADR 032.
- work:
  1. `DialogueSession` with transcript in the worker; prompt order and fixed sub-budgets (§3.1); `contextTokens` setting (default 8192) sent as `num_ctx`; token estimate calibrated from Ollama's `prompt_eval_count`.
  2. 75% trigger → one background `compaction` job on `backgroundModel` (`gemma4-abliterated:e4b`, CPU via `options.num_gpu: 0` by default), `CompactionSummary` schema, K = 4 recent turns verbatim, revision-checked apply; ≥ 95% overflow drops oldest turns deterministically.
  3. Settings: background model, "run on CPU", context size; model check in the setup dialog (`gemma4-abliterated:e4b` missing → clear install line, fallback to the dialogue model with a warning).
  4. Remove the count-based `needsCompaction` path and the deleting `MemoryRepository.compact`; until C25 lands, keep memory records as they are (no deletion).
- done when: §4 rows "budget and trigger" and "no memory loss" pass in `npm run check`; the debug overlay shows prompt tokens, budget and compactions; blender's live smoke (B0) runs a 30-turn conversation where the villager recalls a turn-3 promise at turn 28, with compaction and reply latencies recorded in `docs/operations/`.
- evidence: **Changed:** bounded context/75% compaction84f08a32;005 default shared-GPU e4b at522d85ae. **Evidence:** conversation regressions and [resume validation](../comms/codex/resume-validation.json). **Gaps:** live machine-A compaction/recall and latency on the current model; do not rebuild the delivered context implementation.

### C25 · Long-term memory v2: typed records, extraction operations, core blocks, embedding retrieval

- status: candidate (implemented; C34 applied, live multi-session quality remains)
- owner: codex
- goal: villagers remember structured, sourced facts across conversations, update them when they change, and retrieve the right ones, the way current agent-memory systems do.
- spec: [memory and context](../../engineering/memory-and-context.md) §2, §3.2, §3.3, §4; doctrine AGT-10.3–10.6; ADR 032.
- work:
  1. `MemoryRecordV2` and `CoreBlocks` with the next save version and the §3.2 migration.
  2. Session-end extraction job on `gemma4-abliterated:e4b`: ADD / UPDATE / INVALIDATE / NOOP against the top-10 similar memories plus core-block edits, validated (supplied ids only, grounding, `told` for player claims, caps) and applied with provenance.
  3. Retrieval: recency (0.995 per game hour) + importance + relevance, min-max normalized, equal weights; `embeddinggemma` 256-d via `/api/embed`, cached in IndexedDB (not in saves), keyword fallback; invalidated records excluded; `lastAccessTick` updated.
  4. Reflection at an importance-sum threshold (start 150) on the dialogue model when idle; capacity cap 400 with episodic folding (never semantic facts or commitments).
- done when: §4 rows "extraction", "retrieval", "migration" pass; the C24 live smoke repeated across two conversations: the villager recalls a fact from the first in the second; soak (`npm run benchmark` or ecology soak) shows retrieval ≤ 5 ms per prompt.
- evidence: **Changed:** typed memory/extraction68af413c, fixed-domain ranking and claim pinning522d85ae. **Evidence:** memory tests, [benchmark](../comms/codex/c25-benchmark.json), [operations/evaluation](../../operations/operations.md#ratified-reference-tier-and-villager-evaluation-proposals005006). **Gaps:** both live official/development model transcripts, independent M1-M5 review and reference-GPU timing.

### C14 · Combat director and telegraphs: fair fights first (CRM-4, CMB-4)

- validation follow-up (2026-11-05): hosted89a9 PR42117869814 browser shard1 fails `combat-director.spec.ts:127` waiting15000ms for a predator windup, after its token-spacing assertions. [Exact annotation/job evidence](../comms/codex/reconciliation-validation.json) is retained; no C14 acceptance is advanced and no limit was changed.

- status: candidate regression follow-up (director-approved baseline retained in archive)
- owner: codex
- goal: no matter how many hostiles, the player faces one or two clear threats at a time, every heavy attack is telegraphed, and nothing attacks from off screen.
- spec: [creature minds](../../engineering/creature-minds.md) §1, §2, §7, §10 (partner icon), §11 rows "director" and "telegraphs"; doctrine CRM-4, CRM-10.3, CMB-4; ADR 033.
- work:
  1. Token pools per target (player 2 melee / 1 ranged-element, partner 2/1, villager 1/1; none wild-vs-wild), held windup→recovery, priority grants with ≥ 8 ticks between grants on a target, no player tokens outside the 30 × 17 tile view rectangle.
  2. Gate today's `CombatSystem.advance` attack start on a token; creatures without one hold at their readiness ring (`max(range + 1.5, kiteRange)`) and circle (a minimal orbit is enough until C13).
  3. Telegraphs for every creature attack over 15% of the target's max HP from windup tick 0 (`ground` arc or `glint`), drawn in the effect layer under VFX, plus the predator crouch-and-shiver on windup frames.
  4. Difficulty knobs (token counts, grant spacing, aggression bias) in settings.
  5. Partner intent icon slot in the HUD (shows `attack`/`guard`/`follow` from today's state until C13 provides intents).
- done when: unit and browser tests from §11 "director" and "telegraphs" pass; a Playwright journey with 20 hostile Bramblefang shows at most the token count in windup or active at any tick; a 1080p capture of that fight is looked at (PRD-5) and attached; `npm run benchmark` unchanged within 5%.
- evidence: **Changed:** existing17672f7 combat director retained. **Evidence:** [director baseline record](../comms/director/approvals/simulation--c13-c14.md), [historical archive](archive/codex.md), native688eab26 20-hostile journey and inspected captures pass. **Gaps:** final current-source regression/verify and unchanged benchmark acceptance. The archived baseline does not close this follow-up.

### C13 · Creature minds v1: engagement, perception, intents, scripted brain, flight (CRM-1…3, CRM-10)

- status: candidate regression follow-up (feature approval retained; sourcef46fb6dc hosted/native/software C13 pass; authored-art acceptance remains)
- evidence: 2026-11-05 native exact HEAD pack/Zephyrit and draft/C18 suite5/5 pass; all11 captures inspected. Both C13 journeys also pass forced SwiftShader. Push42092547479 browser shards/checks/beta/verify pass. See [resume checkpoint](../comms/codex/HANDOFF.md#current-resume-checkpoint-supersedes-pause-state-below); software C18 timing and local painting budget failures remain separately recorded there.
- owner: codex
- goal: creatures notice, stalk, commit and break like animals, each species recognisably itself, within budget and deterministic.
- spec: [creature minds](../../engineering/creature-minds.md) §2–§6, §8–§11; doctrine CRM-1.4, CRM-2 (incl. flight), CRM-3, CRM-6.1, CRM-6.4, CRM-8, CRM-9, CRM-10; ADR 033.
- work:
  1. Engagement state machine (calm/alert/engaged/disengaging) with the notice beat; calm creatures keep the current utility system.
  2. `PerceptionGrid` (typed arrays, no allocation) and the `crm-obs-1` observation; `crm-cond-1` conditioning for later.
  3. Intents, masking, executor (§5.3) with the clip mapping (C3h clips), readiness ring, flank orbits, feints, safe-medium flight to water/lava, pack calls.
  4. Scripted utility brain with `CREATURE_TACTICS` for all 8 species, hysteresis, commitment, jitter, staggered cadence and reaction delays.
  5. Movement: intercept/evade, per-species boids weights, `Traversal.air` for winged species (landing for eat/drink/bathe/sleep), home ranges (spawn point until C7's `Habitat`).
  6. Engaged tier (cap 48) and the 2 Hz scripted fallback; save the brain state; debug overlay, observation inspector.
  7. Partner: `focus`/`regroup` commands with bond-scaled weight; real intents on the HUD icon.
- done when: §11 rows "determinism", "masking and reaction", "species identity" (all 8 species) and "budget" (`engagedCombat150` in the benchmark, asserted on CI) pass; a mid-fight save replays to identical intents; 1080p captures of a 6-Bramblefang pack fight and a Zephyrit skirmish for the director show notice, stalk, staggered strikes and break.
- evidence: **Changed:** existing scripted brains retained;1613d9dc uses valid pause tokens and observes worker beats. **Evidence:** native688eab26 both pack/Zephyrit journeys pass with inspected notice/stalk/commit/break captures; [validation](../comms/codex/resume-validation.json). **Gaps:** current-source software-rendered/remote regression and authored-art integration. Learned brains remain gated.

### C17 · Artifact item class and its save version (foundation for notes, books, paintings)

- status: candidate (implemented and merged in db72da1f; 512-artifact save under 3 MB and < 50 ms validation)
- owner: codex
- goal: one `artifact` record behind notes, books and paintings: carried, dropped, displayed and saved with hard caps, so C18 and C20 only add behaviour.
- spec: [authored artifacts](../../engineering/authored-artifacts.md) §3, §4 (`artifactDisplay`/`artifactTake`), §9, §10; doctrine AGT-9, AGT-8.1; ADR 031.
- work:
  1. `src/domain/artifacts.ts`: types, `ArtifactStore` (create, get, update with revision bump, seal, remove), caps and the text sanitizer as pure functions.
  2. Items `note`, `book`, `canvas`, `painting` with icons from the UI kit placeholders; recipes `fiber+fiber→note`, `note+fiber→book`, `fiber+stick→canvas`; `ItemInstance.artifact?` and `GroundDrop.artifact?` carried through drop, pick-up, swap and give.
  3. Display furniture: `display` on scene props; one wall hook per home interior, three plus an easel (`interaction: 'paint'`) in Lark's home; `ArtifactPlacement`; commands `artifactDisplay`, `artifactTake`.
  4. The next save version (after C25's) with its migration, zod caps, referential validation (§9); export/import round-trip.
  5. Frame snapshot `ArtifactView` (metadata only) plus an on-demand content query.
- out of scope: screens (C18, C20), villager actions, image generation.
- done when: `npm run check` passes; unit tests for every cap, sanitizer case, command receipt, migration and referential rule; a 512-artifact save round-trips under 3 MB and validates in < 50 ms (test asserts both); existing saves load unchanged.
- evidence: **Changed:** `src/domain/artifacts.ts`, `src/domain/save-schema.ts`, `src/domain/simulation.ts` delivered via `eng/hd-presentation` and merged in `db72da1f`. **Evidence:** `tests/artifact-saves.test.ts` (14/14 pass), `tests/artifact-budget.test.ts` (512 artifacts: 1.2 MB save, 6.13 ms validation < 50 ms limit). Passed in full 48-suite vitest run.

### C18 · The written word: book screen, villager reading and writing

- evidence: 2026-11-05 exact HEADf46fb6dc native5/5 includes both async-draft regressions and full C18; opening30.7ms,5measurements,2mounted pages,0page errors. SwiftShader draft regressions pass, but C18 fails100ms opening at1433.2ms combined/149.9ms isolated; all23 images inspected. Build49.74s and full format pass. Hosted source-matched checks/browser/beta/verify pass; unchanged local full check569pass/1painting-budget failure remains. See [resume checkpoint](../comms/codex/HANDOFF.md#current-resume-checkpoint-supersedes-pause-state-below).

- status: candidate (feature delivered; focused production performance repair authorized by Huy)
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
- evidence: **Changed:** existing feature retained;380da409 avoids unchanged paused snapshots,4bbabb7b moves routine checkpoint persistence between workers with unchanged save9 validation/checksum/two-slot commits. **Evidence:** worker/persistence13pass and production build; [resume validation](../comms/codex/resume-validation.json). **Gaps:**688eab26 native opening323.5ms fails100ms; native4bbabb7b focused3/3 passes, opening61.3ms/two pages/no errors;001c7cf8 adds periodic transport backpressure. Full check568pass/2timing failures, both budgets pass alone; latest native/software and CI remain required. Preserve all assertions, traces, five measurements, two-page mount and limits; native281f4b31 passes3/3/opening41.3ms.33788a03 fixes proven draft ownership race; two browser regressions fail before/pass after, forced software C18 passes40.6ms on matching precommit runtime bytes. Huy paused at1820Z before final whole check completed; exact-source confirmation/browser/verify remains.

### C19 · Image provider adapter, GPU arbiter, palette quantizer, operations guide

- status: candidate (implemented; machine-A GPU acceptance remains)
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
- evidence: **Changed:**8f1c399/1c14403 provider, arbiter and quantizer retained. **Evidence:** [validation](../comms/codex/c19-validation.json); native688eab26 both mocked browser journeys pass and images inspected. **Gaps:** actual machine-A model/VRAM/latency/native cancellation and final-source CI.

### C20 · Paintings: villagers paint, the player paints, everyone sees them

- status: candidate (implemented; machine-A overnight/latency acceptance remains)
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
- done when: unit tests for brief validation, rates, allowlist rejections (lettering, URL, brand list), pending-survives-reload; Playwright with a mocked provider paints, keeps, hangs the painting on a hook and captures it at 1080p (look at it, PRD-5); blender's live smoke on machine A: Lark paints overnight during sleep acceleration with `gemma4-abliterated:26b` and `sd-server`, the painting hangs, a villager's next dialogue can mention it from the caption; contact capture attached to the reply.
- evidence: **Changed:**e2e2b0f1 durable painting workflow retained. **Evidence:** [validation](../comms/codex/c20-validation.json); native688eab26 mocked player/hook and pending-reload journeys pass, all captures inspected. **Gaps:** actual A overnight villager painting, GPU/VRAM/cancellation, captions and director review. C21 remains gated.

### C21 · Player pixel touch-up for paintings (optional)

- status: candidate (implemented; domain paintingTouchUp command with exact 1024 base64 characters nibble encoding/decoding, palette <= 16 doctrine verification, unsealed carried validation; PaintingEditor modal with pencil, flood fill, eyedropper, doctrine palette swatches, doctrine color dropdown, 32-step undo/redo stack; tests/painting-touchup.test.ts 4/4 passing; full suite 49/49 passing)
- owner: codex
- goal: the player can retouch a kept painting pixel by pixel in the game palette; no model involved (AGT-6.7).
- spec: [authored artifacts](../../engineering/authored-artifacts.md) §8.3.
- done when: editor with pencil, fill, eyedropper and 32-step undo; output passes the same palette and colour-count validation; Playwright edit-and-save test; capture looked at.
- evidence: `src/domain/contracts.ts` (`paintingTouchUp` payload schema), `src/domain/painting-pixels.ts` (`decodePaintingIndices`, `encodePaintingIndices`), `src/domain/artifact-writing.ts` (`touchUpCarriedPainting`), `src/domain/simulation.ts` (`paintingTouchUp` simulation command dispatcher), `src/presentation/ui/painting-editor.ts` (`PaintingEditor` UI modal with pencil, flood fill, dropper, undo/redo, palette manager), `src/presentation/ui/painting.ts` (wiring into preview workflow and button controls), `tests/painting-touchup.test.ts` (4 unit tests passing).

## After C20: codex

### C32 · worldforge packets compare against the previous revision

- status: candidate (implemented in c998d532; review.py comparison_source binds predecessor overview.png, before-overview.png hash, and README wording; 27/27 tests green in worldforge_selftest.py)
- owner: codex
- goal: a world packet's before/after shows the last revision, not the blank draft (gap found in Riverlands revision 2).
- work: `worldforge render`/`packet` writes `before-overview.png` from the previous packet's overview (or re-renders the previous map); README wording follows.
- done when: Riverlands revision 3's packet shows revision 2 as its before
- evidence: commit `c998d532`; `art/source/world/tools/worldlib/review.py` (`comparison_source`, `packet_path`, `next_revision`); `art/source/world/tools/worldlib/worldforge_selftest.py` (27/27 passing).

### C3g - Atlas pages, trimming, deduplication and scale follow-up

- status: candidate (engineering delivered; full19-actor integration/scale acceptance remains)
- owner: codex (direct Huy instruction; visitor should review rather than duplicate)
- changed:7a3ae74b page selection/memory reporting;3f2cb346 exact-alpha trim, cropped-RGBA dedup and review-sheet exclusion;8051a212 regenerated catalog; c482b30b counts shared half textures once.
- evidence: [ADR042](../../engineering/decisions.md#adr-042--exact-alpha-bounds-and-shared-atlas-rectangles), [validation](../comms/codex/resume-validation.json). Current4024frames/3full pages use47.67MiB full and12.21MiB half; all atlas PNGs inspected. Existing renderer pivots/sockets stay independent per frame. Native gallery checks cover every page; budgets remain128MiB Low/256MiB Balanced.
- gaps: communicator must integrate the approved19 actors; then measure the real catalog and recheck scale against M11 humans. Current compact catalog does not prove full integration. Proposal007 Part2 base eyes is excluded; Part3 portrait work is tracked in C33.

### C7 · Authored world in the engine (WLD-M1…M4)

- integration review, 2026-11-06: **blocked on authored source reconciliation**.
  Fresh region validation passes two levels/331 placements, but the committed
  runtime bundle has371 placements and sourceDigest55d08991…; current canonical
  map is b55ad9de…, while pass replay/approved R3 identity is ae34ae14….
  Worldforge selftests26/27 fail equality. Blender B26 has an open reconciliation
  follow-up with Visitor; Codex regenerates the bundle only after a valid owner
  integration receipt. Three simulation tests now read the committed shipping
  bundle on clean checkouts; their pass does not close this mismatch. The long
  soak runner remains procedural. See [review receipt](../comms/codex/review-preparation.json).

- status: candidate (visitor; WLD-M2/M3 authored simulation, spawn, 10 Aqualia NPCs, habitat creature seeding, 263 authored props registered to overworld scene, procedural suppression, save migration under opt-in beta toggle, sustained 600-tick soak test on authored map, and BENCHMARK_WORLD=authored support; tests green). Codex reviews/supports without duplicating settlement, spawn or save-provenance changes.
- evidence: 2026-11-05 studio 74714197, c5104a14, and b8b8fe46. Village/Riverlands R3 approvals bind ae34ae141d48512ab02607d274973751db79a0853fdebb74eaa3c6d982b66d5b. Unit tests pass in tests/authored-world.test.ts (29/29) and tests/simulation.test.ts (14/14, including 600-tick sustained movement soak on authored map).
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

- status: tool side done 2026-11-04 (see result); creature faces await blender's re-packet and a decision. Earlier: manifest integration done by claude at 0a5e5c6: 3 bodies approved and active in game. **Faces: changes requested 2026-11-01** (`docs/team/comms/director/approvals/rivallie--2026-11-01-rivallie-faces-d749a4350126.md`): register decals to a face point about 3 art px below `Socket_Head` (per-species offset or a `Socket_Face` bone); `faceAnchor` fails any decal pixel outside the silhouette or on its outline row; hurt and fearful need a distinct pixel in e/w. Re-packet the faces on the approved body 69b6c10d…
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

- result 2026-11-04 (claude): tool side done. `faces` registers creature decals per frame (default 3 art px below `Socket_Head`, nearest offset where all ink is inside the silhouette and off the outline row; hidden on the few frames with none) and has hard checks `faceCoverage` and `faceDistinct` beside `faceAnchor`; `publish-faces` stages an approved faces packet (`art/source/exports/<asset>-faces/<digest>/`, `art/source/staging/blender/<asset>-faces.json`). Rivallie on body 2026-11-03: 16 of 408 forward frames hidden, none at rest, all five expressions distinct in every facing; board `docs/team/comms/claude/boards/2026-11-04-c3b-rivallie-faces.png`. Not approved: the faces read dark on teal at 1x, blender judges. Open: runtime face composition and manifest integration of the faces staging record (communicator, codex), `Socket_Face` bone not needed.
- evidence (result 2026-11-04): selftests `faces_creature_selftest.py` 7, `publish_faces_selftest.py` 5, `finish_selftest.py` 21, `human_faces_selftest.py` 7, `review_selftest.py` 3; `forge.py approve-record` reports every verifiable director-approved record matching its packet, face packets included (6 world and doc records have no packet digest to check); doc `docs/engineering/imagegen.md` "Creature faces and face publish".

- distribution: source-only branch `eng/c3b-c7-tools` at `f037e2e` / draft PR #3 avoids the protected runbook merge delta. [Guarded handoff](../comms/codex/archive/2026-10-31T2346--to-blender--c3b-source-only-handoff.md); [machine-A execution report](../comms/blender/archive/2026-10-31T2355--to-codex-communicator--c3b-b8-b9-results.md) is integrated, with 1,848 staged frame hashes verified locally. [Portable-source correction](../comms/codex/archive/2026-11-01T0145--to-all--c3b-portable-provenance.md) at engineering `9dd81ee`, consumer `01e9fbb` / PR #4: 21 publication and two review-export tests pass. B10 packaging is delivered; M19 source integration and separate face acceptance remain; no new artwork approval.

## Claude (machine A): art-quality and local-generation tooling (2026-11-02)

Filed from the local-generation build (directive 013) and the stand-in blender session.
Order since 2026-11-02T2330 (directive 014, ordered by what unblocks blender): C30 swatch
(B17) → C30 portrait (B25) → C32 icon (B23) → C28 (sheet resolution) → C3b faces → C9b
fit → C9c.

### C26 · Sprite readability: features survive the bake and pixelize step

- status: direction approved (2026-11-02); `heightArtPx` headroom tool and concept clause done (2026-11-04); creature face decals stay with C3b
- owner: claude
- goal: a creature reads as itself at game size: Bramblefang's fangs and fire mane, Rivallie's crest and bib, Mireling's face and moss, a human's face and hair.
- evidence of the problem: [comparison boards](../comms/blender/2026-11-02T0500--to-director--sprite-comparison-boards.md): every shipped body loses its defining features; the pixel grid is clean, so shapes are lost in bake/pixelize, not outline or palette.
- work: (1) readability-first concept fields and template clause (oversized head and eyes, exaggerated signature features, ART-6.3/7.2) so the mesh carries chunky features; (2) feature-preserving pixelize: detail masks from the reference views (eyes, fangs, mane accents) kept as protected pixels, highlight/accent ramp steps on signature materials; (3) measure `heightArtPx` headroom per canvas; (4) creature face sidecars (C3b) as part of the answer.
- done when: Bramblefang and Rivallie boards (reference beside idle s/e/n at 4x) show the signature features at 1x, director agrees
- status 2026-11-02: direction approved by the director for B20 (recorded by claude on the director's instruction, in this session). The two open items below stay with claude.
- cause found: the bake renders one albedo sample per art pixel, so a fang or an eye (2–4 samples wide at 4×) never reaches pixelize. Then `_majority` and `_min_regions` remove what is left, and dark materials sit on pale `light` steps (Bramblefang's basalt coat reads lavender-grey).
- result: opt-in recipe fields `supersample` (extra 4× albedo pass in `blender/bake.py`) and `features` (`forgelib/pixelize.py` `_ss_labels`: a slot wins a pixel near a socket and on a host region; at least 2 px, never an orphan; hidden from behind), plus the existing `rampShift`. Without them every published creature re-pixelizes pixel-identical (2,464 frames). Eyes stay out: creature faces are runtime decals (ART-8.1), so that part belongs to C3b. A 2-px eye decal at the mouth/head anchor reads at 1× (tried and removed).
- proof recipes (for blender in B20, after the director agrees): Bramblefang `"supersample": 4, "rampShift": {"pelt": -1, "mane": -1}, "features": {"fangs": {"minSamples": 1, "on": ["pelt", "edge"], "near": ["Socket_Mouth"], "radiusPx": 4, "maxPx": 2}}`; Rivallie `"supersample": 4, "rampShift": {"body": -1, "fins": 1}`.
- evidence: boards `docs/team/comms/claude/boards/2026-11-02-c26-bramblefang.png`, `…-c26-bramblefang-run.png` (fang in every face-facing run frame), `…-c26-rivallie.png`; QA palette/colour/outline/orphan checks pass on the proof frames (9 and 12 colours of 20, 0 orphans); `pixelize_selftest.py` 6/6
- result 2026-11-04: `forge.py headroom [--asset ID]` (`forgelib/headroom.py`, `headroom_selftest.py` 5/5) prints the room each canvas leaves above, below and beside the anchor, and for an asset the largest `heightArtPx` that keeps the 2 px margin. **Finding: nearly every creature and human sits at the margin on its tightest clip** (`downed`, a strike or a drink): Bramblefang 42 (max 42), Mireling 26 (26), Marshstalker 34 (34), Neris 44 (44), the player 46 (46); Cindermoth 22 (23), Ignicap 24 (25), Zephyrit 22 (23), Rivallie 25 (27); Steamshell 36 (42). A larger body on screen needs a larger canvas (spec change, DOC-5), not a higher heightArtPx. Concept clause: optional `concept.fields.signature` adds a readability clause (`concept.readability`; creatures: chunky silhouette, oversized head and eyes, exaggerated separated signature features; humans: bold signature shapes, 4.5-5 head proportions kept); no signature, no change, so digests hold. Bramblefang trial (seeds 700 and 701, boards `…-c26-clause-base.png` and `…-c26-clause-signature.png`): with the clause the saber fangs come out longer and bolder (c701 clearly), the head a little larger and the mane in cleaner flame shapes; the stance still sits in both, so the pose guide stays the fix for that. One seed pair; blender judges in B20.
- open: creature face decals are C3b; whether to grow the creature canvases is a spec decision to take with the director.

### C27 · Pose guides for every template

- status: done (2026-11-02, claude)
- owner: claude
- goal: `concept` gets the pose right for humans (A-pose), winged, shelled and mushroom-biped, as `pose-guides/quadruped.png` does for quadrupeds.
- work: `forge.py pose-guide --template <t>` rendering the template's fixture (or an approved mesh) front/side/back as tight grey clay; guides committed in `art/source/style/pose-guides/`; recipes README and skill updated.
- done when: one `concept` run per template keeps every view in the template pose
- result: guides `art/source/style/pose-guides/{human,shelled,winged,mushroom-biped}.png` (+ provenance JSON) from `forge.py pose-guide --template <t>` (`blender/pose_guide.py`). Trials (`--try`, 4 candidates each), pose held in every view: human 4/4 (A-pose front and back); shelled 4/4 (`creature-v1`; one front view at three-quarter); winged 4/4 and mushroom-biped 4/4 with the new spec templates `creature-winged-v1` and `creature-biped-v1`. With `creature-v1`, winged hung vertically and its views drifted, and bipeds grew tails from the fixed tail clause. The winged guide uses the hover clip's wings-up frame.
- evidence: board `docs/team/comms/claude/boards/2026-11-02-c27-pose-guides.png`; `docs/engineering/imagegen.md` (findings); `recipes/README.md` (guide table)

### C28 · Reference views at 1024 px or more

- status: done (2026-11-04, claude; tool, trialled on Mireling and Bramblefang)
- owner: claude
- goal: generated views meet PRD-3.1 (today about 620 px tall on a 2304 × 1344 sheet).
- work: per-view upscale pass (the edit model re-rendering each cropped view at 1024+ with the sheet as reference) or larger sheets within VRAM; keep identity.
- done when: `views` writes every view ≥ 1024 px tall without `prep` warnings, `gen3d` unchanged or better
- result: `forge.py upscale --asset ID [--n N] [--seed S] [--keep SEED]` (`forgelib/upscale.py`): per-view edit-model re-render at 1100+ px with a chroma match to the original. Mireling trial: 489-493 px views became 1267-1304 px, IoU 0.98-0.99. Colour still runs browner than the original. gen3d on Mireling's original against upscaled views: same shape, slightly crisper detail, no regression. Bramblefang (wide quadruped): 1291-1393 px, IoU 0.95-0.98. Not checked: the texture stage on upscaled views. `--keep` only on assets about to be re-forged, never on an approved one without a new packet.
- evidence: `upscale_selftest.py` 5/5; trial `art/source/forge/work/upscale-mireling/`; boards `docs/team/comms/claude/boards/2026-11-04-c28-upscale-mireling.png`, `…-c28-gen3d-mireling.png`, `…-c28-upscale-bramblefang.png`

### C29 · Image model bake-off: klein 9B, klein 4B, Qwen-Image-2.1

- status: done (2026-11-02, claude)
- owner: claude
- goal: the B19 bake-off has its other candidates ready.
- result: **FLUX.2 [klein] 9B** is the only image model kept (4-bit transformer, 44–58 s per sheet, 14.2 GiB). Klein 4B was removed (upright drift). Qwen-Image-2.1 was removed (about 3.5 h per sheet on 16 GB). Qwen-Image-Edit-2511 and Z-Image were not downloaded (outranked, or no reference input). Registry `art/source/forge/models.json`; `forge.py doctor` fails on unregistered weights.
- evidence: `docs/engineering/imagegen.md` (table), boards `docs/team/comms/claude/boards/2026-11-02-imagegen-rivallie-*.png`, doctrine L12

### C30 · `forge.py portrait` (9 emotions) and `forge.py swatch` (tileforge)

- status: open
- owner: claude
- goal: the static 2D classes generate locally too: portraits in all nine emotions kept on identity (contract-v2), seamless 1024² terrain swatches.
- done when: Neris has nine emotion portraits at 96/128 px that pass the portrait contract; a grass swatch passes tileforge QA
- progress: **C30a swatch done (2026-11-03)**: `forge.py swatch` (`forgelib/swatch.py`); a grass swatch passed tileforge QA (candidate; soft `actorContrast` only) on a scratch set at `swatchTilePx` 256, `flatten` 2. Look: no obvious grid, but the field shows faint diagonal streaks and busy clumps, so B17 should tune the prompt and values. C30b portrait landed (2026-11-04, below).
- progress: **C30b portrait done (2026-11-04)**: `forge.py portrait` (`forgelib/portrait.py`, selftest `portrait_selftest.py`). Neris trial: 8 emotions x 2 seeds, identity held in all 16, 0 drift warnings; skin runs warmer than the neutral and thoughtful/concerned/sad are close, so blender picks by eye and re-seeds weak ones. Not approved; B25 judges.
- also: GPU jobs (`concept`, `swatch`, gen3d) now pause the jepa_ipomdp queue through `core.gpu_window` (PAUSE and GPU_BUSY files).
- evidence: boards `docs/team/comms/claude/boards/2026-11-03-c30a-swatch.png`, `2026-11-04-c30b-portrait-neris.png`; `docs/engineering/imagegen.md`; selftests `portrait_selftest.py`, `gpu_window_selftest.py`

### C32 · `forge.py icon` for inventory items without a held model

- status: done (2026-11-04, claude)
- owner: claude
- goal: B23 can make 32 × 32 `icon.item` icons (render_spec) for the resources and crafted goods in `src/content/definitions.ts`, palette-locked, in the same light and outline rules as the held-item icons from `items`.
- work: from a `prop-v1` sheet, either gen3d a small model and render the item stage's icon view, or reduce the sheet's three-quarter view straight to 32 × 32 through `forgelib/pixelize`; pick one by trial on two items (berries, flint) and document it in `recipes/README.md` and the `sprite-forge` skill. Packet type for an icon set.
- done when: berries and flint icons pass icon QA at 1× and 4× and the B23 instructions work as written
- result: `forge.py icon --item ID --prompt "..." --ramps a,b [--n N] [--pick ID]` (`forgelib/icon.py`). Route: klein draws the object, then 2D reduction to 32 x 32 with palette lock and selective outline; the 3D route was not built (see `docs/engineering/imagegen.md`). Berries (`ember,sage,timber`, i400/i401) read at 1x; flint (`basalt`, i303) reads as a plain stone and is low contrast. Candidate tool; B23 picks and the reviewer judges.
- evidence: `icon_selftest.py` 6/6; trials `art/source/forge/work/icon-{berries,flint}/` (0 icon-check problems in all 16 candidates); boards `docs/team/comms/claude/boards/2026-11-04-c32-icon-berries.png`, `…-c32-icon-flint.png`

### C33 · Portrait identity lock: interior mask, palette from the neutral, expression delta

- status: candidate (visitor; 2026-11-05, awaiting codex/claude engineering review; unblocks blender B25 19-actor batch)
- owner: visitor
- source: visitor audit 2026-11-05 finding 1 and proposal 007 part 3 (accepted).
- work: in `forgelib/portrait.py` composite each img2img edit through a feathered interior face mask over the neutral (hair, clothes, background and the 2 px border stay neutral pixels), quantize against the neutral's own LAB palette plus outline and eye-highlight tokens instead of all 64 colours, then add QA: skin LAB mean within delta-E 2.5 of the neutral and at least 3.5% changed pixels inside the eye, brow and mouth region so thoughtful, concerned and sad stay apart at 96 px. Selftest without GPU on synthetic portraits.
- evidence: `art/source/forge/forgelib/portrait.py` (`face_interior_mask`, `quantize_to_neutral_palette`, `composite_interior_face`, `identity_report`, `pairwise_expression_warnings`); `art/source/forge/forgelib/portrait_selftest.py` (9/9 passing, 128/128 forge selftests passing).

- Codex review gaps (2026-11-05): synthetic9pass does not establish real-neutral hair/fringe preservation inside the geometric ellipse; skin QA uses median chroma instead of the proposed mean/std. Add a fringe regression and reconcile QA before portrait batch acceptance. No art approval is inferred.

### C34 · Retrieval and extraction text for C25 (proposal 005)

- status: candidate (codex; direct Huy instruction, 2026-11-05; live-model M1-M5 pending)
- owner: codex
- work: replace `docs/engineering/memory-and-context.md` §3.3 with the fixed-domain score and commitment/relationship pinning; pass every active commitment and relationship of the interlocutor to session-end extraction; add `npm run test:villagers` (M1-M5) after C25. (`AGT-10.5`/`AGT-10.7` in `docs/doctrine/` is DOC-1 protected and waits for claude's next call-back).
- evidence: **522d85ae**, ADR041, [operations](../../operations/operations.md#ratified-reference-tier-and-villager-evaluation-proposals005006), [validation](../comms/codex/resume-validation.json). GPU defaults, fixed-domain scores, four pins/eight slots, all active interlocutor claims in extraction, streaming TTFT and transcript-bound evaluator are implemented. Full pre-later-merge check566pass; live reference-GPU and independent M1-M5 acceptance remain open.

### C35 · Commercial status in the model registry (proposal 006)

- status: candidate (visitor implementation reviewed; Codex metadata repair89d2bbb9)
- owner: visitor
- work: `commercialStatus` (`apache-2.0`, `mit`, `commercial-licensed`, `dev-only-noncommercial`) and `territoryRestrictions` per entry in `art/source/forge/models.json` (or `forgelib/core.py` fallback table if `models.json` is lane-guarded), enforced and printed by `forge.py doctor`, with the licence name and the URL it was read from. Verify each licence text before filling a value; unknown stays `unverified`.
- evidence: **Changed:** inheritedfcc78fa7 registry/doctor plus89d2bbb9 arrays and all-entry verification. **Evidence:** registry4/4 tests; primary-source links in [operations](../../operations/operations.md#registry-verification-follow-up-2026-11-05). **Gaps:** two third-party GGUF aliases remain unverified and fail metadata verification; actual manifest/blob rehash and private mirror receipt on A remain required. Historical17/17 doctor result predates this fail-closed repair.

### C36 · Held-item orientation on elongated weapons (visitor finding 3)

- status: candidate (claude; tool side done 2026-11-05, blender re-bake pending)
- owner: claude
- work: reproduce the blunt copper-sword and webbed shortbow from `art/review/2026-11-05-item-copper-sword/` and `...-item-shortbow/` in `item_orient_selftest.py`; only then change the PCA axis fit (a pedestal under the model) and the anisotropic `minFeaturePx` dilation. A change without a failing test first is a guess.
- evidence: cause reproduced in `item_orient_selftest.py` from the staged orient.json dimensions: one isotropic offset sized for the 1.4 px haft (0.82 px a side on the sword, 1.0 px on the bow) widens the 4.7 px blade to 6.3 px and closes the 2 px stave-to-string gap. Fix: `orient.inflate: "thin"` (`forgelib/item_orient.py` `inflation_offsets`, `inflate`; default `all` keeps every approved item byte-identical); recipes `item-copper-sword` and `item-shortbow` set it; selftest `item_orient_selftest.py` (8 tests). The PCA axis fit was not the cause and is unchanged. Open: blender re-bakes both and looks at the contact sheet at 1x (PRD-5).

### C31 · gen3d backends: Hunyuan3D-2.1 shape and TRELLIS.2

- status: done (2026-11-02, claude)
- owner: claude
- goal: compare single-image 3D against the current Hunyuan3D-2mv on the golden samples (L12).
- result: **Hunyuan3D-2mv stays the only gen3d model.** Recipe `gen3d.backend` dispatch stays (`forgelib/core.py` `GEN3D_BACKENDS`, default out of the digest).
  - Hunyuan3D-2.1 lost (front-only 189 s, side-only 207 s, 7.7 GiB) and was removed.
  - TRELLIS.2-4B (licence accepted 2026-11-02) ran on Rivallie's side view: shape only, 512, 118 s with a 38 s load, 5.4 GiB peak. From the front it is a narrow pillar, not the round otter 2mv builds from three views, and its surface is voxel-faceted. Its 1024 cascade fails in the decode on 16 GB (`CUDA driver error: device not ready`, twice).
  - Removed with `hf cache rm` (TRELLIS.2-4B, TRELLIS-image-large, DINOv3; 10 GB), together with its venv, vendored code, runner and registry entry.
- evidence: boards `docs/team/comms/claude/boards/2026-11-02-gen3d-rivallie-hunyuan.png`, `…-gen3d-rivallie-trellis2.png`; `forge.py doctor` 13/13; doctrine L12; `docs/engineering/imagegen.md`

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

- status: candidate (implementation and isolated golden proof; native terrain set (blender B17, formerly M9) approval remains separate)
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

C8 holds the remaining brief P0 rows; the learned creature brain (C15, C16) is gated on playtests of C13.

### C8 · Existing P0s from your brief

- status: in-progress (UI/packet-gallery first)
- goal: the UI kit (UI-M6, L9), the approvals ledger (L7), 2× scale (ART-M1…M3), the in-scene review gallery for `art/review/` packets (PRD-M2) and the `elder` build profile. Interleave them with C4–C7 as you judge best. The gallery is what the director uses to review golden samples, so land it before C3's packet if you can.
- done when: the acceptance column of each row in `docs/team/briefs/codex.md`
- evidence: [C8 implementation and validation](../comms/codex/archive/2026-10-31T1040--to-all--c8-ui-packet-gallery.md); [ADR 019](../../engineering/decisions.md#adr-019--director-ui-kit-and-isolated-candidate-packet-preview). This slice does not complete the remaining C8 gates.

### C15 · Learned brain: headless training bridge (CRM-6.2, CRM-M4) — gated

- status: blocked: starts only after C13 ships in a playtested build and the director asks (CRM-6.1)
- owner: codex
- goal: a vectorized multi-agent environment over the deterministic Node simulation for PufferLib or CleanRL; imitation of the C13 scripted brain, then PPO with shared parameters and the CRM-6.3 reward; reproducible runs (seed, config, data hash, weight hash).
- spec: [creature minds](../../engineering/creature-minds.md) §5, §12; doctrine CRM-6, CRM-7.3.
- done when: an imitation policy matches the scripted brain's intents on a held-out set above a threshold you set and record; training runs on machine A through blender's B0
- evidence:

### C16 · Learned brain v1 in the game (CRM-M5…M7) — gated

- status: blocked: after C15
- owner: codex
- goal: the learned brain behind the per-species scripted/learned switch: deterministic CPU inference (≤ 32k parameters, float32 or int8, ≤ 30 µs per pass), weights as versioned content with a save hash, memory counters, a model card.
- spec: [creature minds](../../engineering/creature-minds.md) §9, §10, §12; doctrine CRM-3.5, CRM-7, CRM-8.
- done when: the C13 identity tests and budget pass with the learned brain; a save replays identically; the director compares scripted and learned captures of the same 20-creature fight
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
