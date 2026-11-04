# Codex session handoff

## Next: C18 trace-screenshot repair, then C19 and C20

Branch `eng/hd-presentation`, workspace `C:/Users/htruong/source/repos/Vibe`.
Director-authorized investigation started at **3ccf5ab** on 2026-11-03
(America/Chicago). Initial diagnostics are committed and pushed as **731da0e**;
compact notice/engine-summary follow-up is validated and ready for publication. No latency repair or
C19 implementation has started. Do not restart C13/C18 implementations.

Use [team-comms](../../../../.agents/skills/team-comms/SKILL.md) and
[doctrine-lookup](../../../../.agents/skills/doctrine-lookup/SKILL.md).
Read `docs/team/briefs/codex.md` at pickup and after compaction. Keep the existing
[session log](session-2026-11-02.md) current. Leave Vibe-art and other review
worktrees alone. No owned server is left running; the temporary experiment
configuration has been removed.

## What the investigation established

Full receipts, trace hashes, focused call summaries and the exact truncated
public notice are in [diagnostic evidence](c18-ci-diagnostics.json).

- Source **731da0e** [push CI41763990779](https://github.com/huytruong1810/Vibe/actions/runs/41763990779)
  passed CPU checks/benchmark and both production beta bases. Browser failed
  within its 20-minute envelope (browser step16m04s, job18m59s); verify failed.
  Ecology exceeded the unchanged25-minute limit; no successful soak is claimed.
- The public C18 receipt shows **636.8 ms** opening: pause320.7, content312.4,
  render0.1, modal3.6 ms. Worker service was **0.1/0.4 ms**, recent worker work
  at most6 ms, measured renderer ticks1.0?1.1 ms and frame handlers1.3?2.9 ms.
  Long gaps lie outside those measured callbacks. This does not support an
  expensive pause/content-service or HUD/ticker-callback repair.
- The initial expanded notice truncated at4094 characters; its complete prefix
  fields are labelled as extracted evidence, never as an intact JSON receipt.
  PR twin41763996060 also shows roughly315?317 ms waits and tiny worker service;
  its notice truncated earlier. Remote raw CPU trace has not been downloaded.
- Normal local source731da0e passed1/1 in57.6s: **36.3 ms** opening, two pages,
  no errors. CI-enabled local capture passed1/1 in1.3min: **31.5 ms** opening.
  A prior52.7 ms normal capture ran alongside full check and is labelled under load.
- Forced local SwiftShader, using the same journey and unchanged assertions,
  reproduced **440.5 ms** opening and failed the100 ms gate. CPU/GPU trace shows
  a **302.3 ms** main-thread RasterImplementation::Finish/command-buffer wait,
  overlapping a roughly**298 ms** GPU RealSwapBuffers task during content wait.
  Worker content service was0.8 ms. Trace intervals nest; never sum them.
- Controlled experiment: same software renderer, with only continuous Playwright
  trace screenshots disabled, passed1/1 in1.8min at **37.5 ms**. A long GPU swap
  remained in flight while the main thread stayed responsive. DOM snapshots and
  the explicit1080p screenshot remained. This isolates recorder screenshot
  readback as the reproduced main-thread stall. It is the candidate explanation
  for CI's matching gaps; remote engine-summary confirmation remains pending.
- Every produced spread screenshot was inspected. The controlled trace setting
  was temporary and is not shipped. The original journey still retains continuous
  trace screenshots, so CI is expected to remain red until the separate repair.

## Diagnostic implementation and validation

- BookScreen brackets each opening with a fresh window. WorkerBridge retains up
  to8 requests and32 main-thread intervals; worker replies include16 recent work
  intervals. Only the latest opening is retained. Existing total/four phases and
  on-demand artifact transport remain unchanged.
- Optional message metadata correlates IDs, bridge dispatch/receipt/resolution
  and worker receipt/service/reply. Compare durations within their thread clocks.
  Main instrumentation covers frame handler, renderer apply, HUD and ticker;
  worker instrumentation covers submit/content, frame construction/postMessage,
  command publication and periodic clock/frame work.
- The follow-up keeps public notices below3500 UTF-8 bytes, prioritizes total and
  four phases, and summarizes the longest opening-window engine/GPU trace events.
  Complete bounded receipts and raw CPU traces remain in artifacts. Chromium
  tracing has its own shared timeline; it is distinct from request-local clocks.
- Trace rows are `[name, startRelativeMs, fullDurationMs, overlapWithOpeningMs]`.
  Main work rows are `[name, startRelativeMs, durationMs]`; request recent-work
  offsets are relative to that worker receipt. Nested rows overlap.
- Ordinary CI-enabled validation of the compact notice passed1/1 in59.8s with
  **36.9 ms** opening, two pages and no errors. The full compact JSON notice and
  engine/GPU summary emitted intact. All seven explicit captures were inspected.
- Four-worker full check on731da0e passed468 tests/36 files in60.66s, plus types,
  architecture, assets, production build, formatting and hygiene. Follow-up adds
  two meaningful trace-window/annotation-budget tests. Final four-worker check
  passes470 tests/37 files in57.51s, plus all prior gates and full formatting.
- An initial browser run was invalidated by my edit causing a Vite reload before
  maximum-size opening; it is excluded from timing evidence.

## Concrete next repair: separate commit

1. Clean pull with `git pull --ff-only`; read new addressed messages after
   `.last-read`. Read the latest diagnostic follow-up CI public notice to confirm
   the engine-level remote mechanism. Public notices need no stored credentials.
2. Scope `test.use({ trace: { mode: 'retain-on-failure', screenshots: false,
   snapshots: true } })` to the literacy performance journey. Keep its explicit
   1080p capture, DOM snapshots, CPU trace/compact notice, every functional
   assertion and the100 ms opening assertion. Other journeys retain their trace
   settings. This removes the reproduced recorder readback from the latency path.
3. Preserve authoritative pause/reach/session checks, on-demand content, five
   performance entries and two-page mounting. No production worker protocol or
   book-opening behavior repair is justified by current evidence.
4. Run normal and CI-enabled focused literacy journeys, plus a forced-SwiftShader
   experiment using the actual scoped trace setting. Inspect all new screenshots.
   Run relevant regressions, four-worker check, formatting and hygiene. Keep all
   assertions, budgets, retry counts, required verify and job limits unchanged.
5. Confirm full browser suite and aggregate verify remotely before C19. Record
   the independent ecology timeout honestly; preserve25 minutes. Machine-A C18
   reading/model acceptance and director review remain external.

Authenticated artifact download previously returned401 and automatic review
rejected stored-credential access. Do not repeat or bypass that rejection. Use
public notices or an explicitly supplied archive. The director's historical
Downloads/browser-journey-artifacts.zip predates phase measurements (328.8 ms);
it is not the new CPU trace. Earlier diagnostic history lives in commits
c73cdb8,1110305,b17d0c4 and3ccf5ab and the evidence JSON.

## Ticket order after the repair

1. **C19** is the next open feature: image provider, GPU arbiter, quantizer and
   operations guide. Follow the plan below; re-read the ticket/spec before code.
   Keep its commits separate from the CI repair. Machine B uses functional checks
   and mocks; machine A owns image-model/GPU latency and VRAM acceptance.
2. **C20** follows C19 and C17: painting actions, pending-job persistence, caption
   jobs, painting screen and rendering. Re-read
   [the queue](../../queue/codex.md#c20--paintings-villagers-paint-the-player-paints-everyone-sees-them)
   and authored-artifacts spec before planning it. Its player/villager workflows
   are not part of C19.
3. **C21** is optional and still needs explicit director go after C20. C15/C16
   remain gated on C13 playtests and director go. C22/C24/C25/C14 external
   acceptance is not authorization to redo their completed implementations.
4. Afterwards follow the current queue, including the after-C20 section and
   standing C12/C23 obligations; re-check upstream integration and acceptance
   evidence before treating an open tooling ticket as missing implementation.

## C19 plan prepared before code

Inputs: [ticket](../../queue/codex.md#c19--image-provider-adapter-gpu-arbiter-palette-quantizer-operations-guide),
[artifact specification](../../../engineering/authored-artifacts.md) §§6,6.1,7.4,10,12,
ADR031 and [Claude's research](../claude/2026-11-02T0139--to-codex--artifacts-and-image-generation.md).
Binding AGT-6.4: "Image generation goes through a configurable **loopback image
endpoint**"; "No endpoint means no new paintings, never a broken game: existing
paintings still show." Read the complete rule in `docs/doctrine/11-living-minds.md`.

1. Golden slice: a mocked `SdCppProvider` request → bounded PNG decode in a worker →
   pure deterministic 48×32 quantization. Add `src/adapters/image.ts` and
   `src/domain/painting-quantize.ts`; neither exists yet. Validate loopback-only URLs,
   no credentials/path/query, an 8 MB response cap,90 s timeout, abort and single flight.
   Ollama image provider remains an explicit unavailable stub; ComfyUI is out of scope.
2. Quantize: centre-crop to 3:2; box-area downsample in linear light; nearest OKLab
   doctrine palette colour excluding outline steps; keep at most 16 colours with stable
   tie breaks, remap deterministically, no dithering, packed 4-bit indices. Prove a
   fixture golden hash, palette membership, repeatability and the specified 5 ms budget.
3. Integrate `GpuArbiter` beside `src/adapters/inference.ts`. Existing
   `InferenceScheduler.exclusive` aborts/settles active work and serializes controls;
   review its cancellation/requeue behavior before extending it. Preserve C18 reading,
   dialogue priority and C24/C25 jobs. Optional Ollama unload defaults on; await unload
   before image generation. Villager jobs require no dialogue plus pause/sleep/
   acceleration; dialogue aborts/requeues them. Player image jobs finish before chat.
4. Extend connection settings in `src/presentation/hud.ts` / `src/main.ts`: endpoint
   empty by default, provider, unload toggle and Test receipt. Preserve the current
   `hearthwild-connection` settings and fallback entry; no endpoint must remain usable.
5. Write `docs/operations/image-generation.md`. At implementation time verify exact
   API/launch/CORS details against primary project docs and pin a release. Document
   Windows CUDA/Linux commands, model+encoder+VAE files and troubleshooting. Permit
   Apache-2.0 Z-Image Turbo or FLUX.2 klein 4B; exclude klein 9B/non-commercial weights.
   Research in the spec is input, not proof of a currently verified launch command.
6. Validate mocked success/HTTP/oversize/timeout/abort/non-loopback cases; scheduler
   exclusion, unload, dialogue preemption/requeue and player non-preemption; worker
   decode and quantizer golden fixture. Run four-worker check, format and hygiene;
   retain C13/C14/C25, artifact and root/subpath regressions where affected.
7. Send an own-folder `--to-blender--test-` request with a concrete smoke command.
   A measures real painting VRAM and the 30 s Generate→preview target including model
   unload/reload. B uses mocks/functional checks only; no image-model/GPU latency runs.
   Inspect every produced review image before describing it. Deliver Changed/Evidence/
   Gaps and candidate evidence; update the handoff. C20 painting actions, screens,
   hanging/captions and C21 pixel editing are separate tickets, not C19 scope.

## C18 implementation

Strict worker edit/page/seal commands validate the complete replacement before changing
the carried item. BookScreen supports notes, two-page spreads, single-page editing,
500 ms debounce, serialized flush, rejected-draft retention, seal confirmation, focus
return, keyboard and gamepad navigation. Frames contain metadata; content is on demand
with authoritative reach validation. Only the current spread mounts.

LiteracyService owns NPC hands, reach, six daily reads, one daily note/page, and saved
continuation offsets. READ_TEXT replaces its response's other effects and starts a
second job: excerpt <=600 estimated tokens, complete prompt <=2000, JSON-quoted prose,
strict response with no action. Applying a result rechecks world session, NPC revision,
conversation, reach and artifact revision; memory pins the actual pages/line prefix.
New dialogue preempts reading. Readables are metadata only, nearest five/120 tokens,
and drop first from dialogue prompts. Grounded writing uses conservative vocabulary
and canonical content names; unsupported ordinary words can also be rejected.

Save v9 retains all older migrations, C13 motion, C14 director and C25 memory. Lark's
blank diary is seeded on new game or legacy migration when capacity permits, never
on v9 restore. Neris's ferry-keeper profile supplies the dock-master motivation.
No scripted model calls or prose, painting provider, training, art production or approval.

Actual `gemma4:e4b` CPU dialogue -> READ_TEXT -> sourced memory passed, including an
injection page and unchanged inventory: [receipt](c18-live-reading.json). Ollama 0.40.9
tuple transport compatibility was fixed without weakening domain validation. Model was
unloaded; installation remains authorized. The director clarified B needs functional
checks only. Do not repeat model latency testing here. Machine-A GPU acceptance is
requested in [the Blender test message](2026-11-03T1730--to-blender--test-c18-reading.md).
Buffered reading JSON transport is implemented; incremental HUD output remains C20.

Latest full unit-only run: **464 tests / 34 files passed**, four workers, 104.68 s.
Full browser suite passes **23/23** in 8.9 minutes. Final book capture was copied and
inspected; full 48-page opening 47.3 ms mounts two pages. Both local combined checks
passed464 tests but missed the unchanged50ms artifact gate (61.4688/54.962ms);
isolated artifact project passed1/1. Types, architecture, assets, hygiene and formatting
pass. Root and subpath production builds pass, beta2/2 at each. The standalone local
benchmark misses director p95 (0.251ms >0.2), brain/movement pass. All measurements
are retained; do not rerun model latency on B or relax gates.

[Push CI41686809511](https://github.com/huytruong1810/Vibe/actions/runs/41686809511)
CPU `checks` **passed**, including full check, artifact timing, formatting and benchmark.
Both beta jobs and full ecology passed; browser timed out and aggregate `verify`
failed. The89ffe45 follow-up browser step exited1; see the first-actions section.
No full-workflow-green claim. See [validation](c18-validation.json) and
[benchmark](c18-benchmark.json). C18 is candidate; A latency and director review remain.

## C13 evidence

[Candidate](2026-11-03T1420--to-all--c13-creature-minds-candidate.md),
[validation](c13-validation.json), [benchmark](c13-benchmark.json),
[failed timing history](c13-benchmark-history.json).
Scripted all-eight-species implementation, honest perception, 12 intents, reactions,
commitment, cap 48 full-rate/2 Hz fallback, flight, partner commands and save v8.
One loaded overworld scene remains; no new region streamer. Authored habitats still
use spawn/home 12-radius fallback. The 3,000-tick exact restored intent/motion hash is
`d0c664d43d5cdd3110d6d3105c376d719589d609e15b34034e281ae8a599f10e`.

Pre-C18 full check 444/32; full browser22/22 before final performance optimization,
focused C13 2/2 and C14 1/1 after it; beta 2/2 at each root and subpath. Standalone
i7-1365U benchmark p95 brain/movement/director **0.734/0.563/0.194 ms**, maxima
**3.154/6.094/15.876**. These are p95 assertions, not every-tick guarantees.
No unchanged overall-throughput or reference-machine acceptance claim.
All eight retained 1080p phase images were inspected; placeholder overlap remains.
[Missing behavior clips](2026-11-03T1417--to-blender--c13-behavior-clips.md) are external.

Run [41665593398](https://github.com/huytruong1810/Vibe/actions/runs/41665593398)
completed the full 28-day ecology soak successfully in **22m50s**, unchanged 25-minute
limit. Both beta jobs passed. Its verify job exceeded 20 minutes in browser journeys.
The pushed CI edit separates CPU checks and browser journeys into bounded 20-minute
jobs and preserves required `verify` as an aggregate requiring both. CPU checks pass;
browser CI remains red as recorded above. All existing gates remain.

Baseline run 41564371915 succeeded; 41564379329 failed its browser step. Public logs 403;
automatic review rejected stored-credential access, none read. Isolated unchanged
baseline passed 19 journeys plus terrain; exact remote failure remains unknown.
Do not bypass credential rejection. Fetch succeeded; compare remote parent before push.

## Standing boundaries

- C22/C24/C25/C14 remain candidates with external acceptance. Only the director merges
  main or activates Pages; draft PR 1 remains unmerged by this work.
- C15/C16 need director go after C13 playtests; C21 needs explicit go. C23/C12 stand.
- Hatchet B14 remains staged; item sidecars need real C12/M25 integration support,
  never fake NPC appearance overrides. Communicator owns manifest/status integration.
- Riverlands revision 2 approval is layout-only; placeholders are not approved art and
  C7 activation remains gated. C32 worldforge revision fix, C33 inventory icons and
  C31 Hunyuan3D-2mv-only backend direction remain integrated.
- B19/B11 relays do not replace digest-bound approvals. Normal assets 3908 frames,
  five pages 79.84/19.88 MiB; HD gaps 1515, approvals 4/41. Preserve all existing gates.
