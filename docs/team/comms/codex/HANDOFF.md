# Codex session handoff

## Next: C22 public failure diagnostics and C19 golden slice, then C20

Branch `eng/hd-presentation`, workspace `C:/Users/htruong/source/repos/Vibe`.
Start at current branch HEAD. Pickup baseline **ef2c072** follows runtime/test
source **232ac33**. Screenshot-only repair **5e9c3e4** and compositor/freshness
follow-up **ec22a07** are committed and pushed separately from these records.
Production source is unchanged. All existing assertions remain; the follow-up
adds visible-dialog and fresh48-page label checks, including the public notice.
C19 has a provider/worker/quantizer golden slice and tests; C20 is
unstarted. Do not restart C13/C18 implementations.

C19 golden slice: [evidence](c19-validation.json), 32 focused unit tests and a
real browser worker fed a mocked server PNG. Deterministic golden hash is
`80bd3049d7d65ff7f8ce461f9ca0ffb7489b50e1f9780879482b62281f14ba01`.
Prepared worker quantization is3.7ms with113ms explicit startup,373.2ms total
mock pipeline; initial cold46ms is retained as a limitation. Both48x32 and4x
previews were inspected. No live model, GPU or machine-A acceptance claimed.
Next implement the GPU arbiter, settings and pinned operations guide before C20.
Pinned sd-server SDAPI does not acknowledge GPU cancellation; native job cancel
and terminal-state polling are required for villager preemption. Client abort
alone is insufficient. The adapter currently supplies only the scoped SDAPI path.

Current evidence is in `traceScreenshotRepair` in
[diagnostic evidence](c18-ci-diagnostics.json). Key results:

- Source5e9c3e4 local browser23/23 in6.8min, C18 opening24.4ms; normal/CI-focused
  openings46.7/50.3ms. All three stored labels confirm48 pages. All40 full-suite
  PNGs were inspected. Initial forced-software installed-Chrome probes both timed
  out before the measured opening; no latency result claimed for those attempts.
- Source5e9c3e4 remote PR619.3ms and push633ms retain synchronous ReadPixels waits.
  Push browser job reaches20 minutes; PR browser exits1. Both aggregate verify
  jobs fail. CPU checks and both beta bases pass. Push ecology is scope-skipped;
  PR ecology reaches its unchanged25-minute limit. Complete public receipts retained.
- Pinned headless shell156.0.8078.4/revision1248 reproduces289.3ms opening and
  128.1ms ReadPixels with zero screenshots/screencast frames and153 DOM snapshots.
  Screenshot-only repair is insufficient. Full-Chromium comparison read a stale
  earlier opening (no completed CPU trace opening); excluded from latency acceptance.
- The stale result exposed retained old articles satisfying the count assertion.
  Follow-up waits for a visible book and `1?2 / 48` before ending the CPU trace.
  Strengthened normal/CI Windows runs pass1/1 in40.1/36.1s at38.8/49ms.
- Headless shell with full SwiftShader GLES and enabled compositing passes1/1
  in1.9min at61.2ms, fresh48-page receipt and complete CPU trace. Same forced flags
  on installed Windows Chrome fail Add page before measurement. Shipped driver
  flags therefore apply only to this literacy test on Linux CI. Other journeys,
  retries, deadlines,100ms gate and production renderer remain unchanged.
- Follow-up four-worker check passes470 tests/37 files in63.90s, plus types,
  architecture, assets and production build. Full formatting passes. Every explicit
  capture was inspected. Temporary configs removed; no owned server remains.

Follow-up sourceec22a07 CI:
[push41780039418](https://github.com/huytruong1810/Vibe/actions/runs/41780039418),
[PR41780047802](https://github.com/huytruong1810/Vibe/actions/runs/41780047802).
PR browser and aggregate verify pass: fresh48-page opening11.3ms, two mounted
pages, no page errors. PR browser step673s. Push browser reaches20 minutes without
a C18 receipt (browser step cancelled after1030s); no journey outcomes inferred.
PR ecology reaches25 minutes; push ecology is scope-skipped. C18 PR gate is met;
external machine-A/director acceptance remains. Current CI capacity follow-up splits
all23 journeys exactly once across13/10-test shards, one worker and20 minutes each;
verify still requires CPU checks and every shard. Source247b03d shard jobs finish
without the old job timeout, but push shard1 and PR shard2 fail tests. Public output
only says exit1; PR C18 notice shows no opening (failure before CPU tracing).
Current follow-up enables the standard GitHub reporter on CI to expose test names
and assertions publicly, preserving list output and all existing budgets.
Prior failed
source5e9c3e4 runs:
[push41776153357](https://github.com/huytruong1810/Vibe/actions/runs/41776153357),
[PR41776159880](https://github.com/huytruong1810/Vibe/actions/runs/41776159880).

**Execution order:** scoped C18 trace-screenshot repair -> full browser/verify CI
green -> C19 provider/arbiter/quantizer golden slice -> C20 painting workflows.
C21 still needs explicit director go. The queue is the ticket source; the details
below preserve the accepted plan and current implementation facts.

Use [team-comms](../../../../.agents/skills/team-comms/SKILL.md) and
[doctrine-lookup](../../../../.agents/skills/doctrine-lookup/SKILL.md).
Read `docs/team/briefs/codex.md` at pickup and after compaction. Keep the existing
[session log](session-2026-11-02.md) current. Leave Vibe-art and other review
worktrees alone. No owned server is left running; the temporary experiment
configuration has been removed.

## First five minutes

1. Confirm `eng/hd-presentation`, clean status and recent log; pull with
   `git pull --ff-only` only when clean. Read the brief and the two skills above.
2. Read addressed messages using one-level directory enumeration (no archives):

   ```powershell
   $handoffSince = (Get-Content docs/team/comms/codex/.last-read -Raw).Trim()
   Get-ChildItem -LiteralPath docs/team/comms -Directory | ForEach-Object {
     Get-ChildItem -LiteralPath $_.FullName -File | Where-Object {
       $_.Name -match '--to-(codex|all)--' -and $_.Name.Substring(0,15) -gt $handoffSince
     }
   } | ForEach-Object { $_.FullName; Get-Content -LiteralPath $_.FullName }
   ```

   Update `.last-read` with real UTC after reading. Keep the existing session log.
3. Inspect follow-up sourceec22a07 CI above and any newer source runs. Keep code-source
   validation distinct from documentation-only follow-ups.
4. Open `tests/browser/literacy.spec.ts`, `tests/browser/book-diagnostics.ts` and
   `playwright.config.ts`. The small scoped repair below is already shipped;
   inspect validation gaps before making any further changes.
5. In this Windows sandbox, git writes and test/Vite/hygiene subprocesses can fail
   with `EPERM`; use approved tool escalation. Public GitHub curl needed network
   escalation. Preserve every check; never retry stored-credential access.

## Earlier diagnostic CI: source232ac33

Both [push41768124908](https://github.com/huytruong1810/Vibe/actions/runs/41768124908)
and [PR41768132897](https://github.com/huytruong1810/Vibe/actions/runs/41768132897)
are completed and red. CPU checks/benchmark and both beta bases pass in each.
Browser and aggregate verify fail, with intact public format2 receipts:

| Source232ac33 | Opening | Pause/content | Worker service | Longest ReadPixels |
| --- | ---: | ---: | ---: | ---: |
| Push | 631.9 ms | 318.7 / 308.3 ms | 0 / 0.6 ms | 294.5 ms |
| PR | 638.1 ms | 316.2 / 318.4 ms | 0.1 / 0.5 ms | 303.3 ms |

Main-thread `GLES2::ReadPixels` / command-buffer waits overlap roughly293-302 ms
GPU WebGL work. Both mount two pages and report no page errors. This confirms the
remote engine-level stalls that the older receipt could not classify. Combined
with the controlled local recorder experiment below, the scoped trace-screenshot
repair is supported. Nested trace rows overlap; do not sum their durations.

Public receipts:
[push annotations](https://api.github.com/repos/huytruong1810/Vibe/check-runs/126371220785/annotations),
[PR annotations](https://api.github.com/repos/huytruong1810/Vibe/check-runs/126371245550/annotations).
Both complete JSON receipts are retained in the existing diagnostic evidence.
Push browser step failed in16m00s, within its unchanged20-minute job limit;
its browser artifact upload succeeded. Other journey outcomes are not inferred
from a timing notice. No full-browser/full-workflow-green claim.

Push ecology was **scope-skipped**, not a completed soak. PR ecology hit the
unchanged25-minute limit ([annotation](https://api.github.com/repos/huytruong1810/Vibe/check-runs/126371245131/annotations)).
Keep this independent CI-health gap visible; preserve25 minutes. Earlier source
731da0e also timed out there; the earlier C13 full soak did pass (history below).

## What the investigation established

Full receipts, trace hashes, focused call summaries and the exact truncated
public notice are in [diagnostic evidence](c18-ci-diagnostics.json).

- Source **731da0e** [push CI41763990779](https://github.com/huytruong1810/Vibe/actions/runs/41763990779)
  passed CPU checks/benchmark and both production beta bases. Browser failed
  within its 20-minute envelope (browser step16m04s, job18m59s); verify failed.
  Ecology exceeded the unchanged25-minute limit; no successful soak is claimed.
- The public C18 receipt shows **636.8 ms** opening: pause320.7, content312.4,
  render0.1, modal3.6 ms. Worker service was **0.1/0.4 ms**, recent worker work
  at most6 ms, measured renderer ticks1.0-1.1 ms and frame handlers1.3-2.9 ms.
  Long gaps lie outside those measured callbacks. This does not support an
  expensive pause/content-service or HUD/ticker-callback repair.
- The initial expanded notice truncated at4094 characters; its complete prefix
  fields are labelled as extracted evidence, never as an intact JSON receipt.
  PR twin41763996060 also shows roughly315-317 ms waits and tiny worker service;
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
  readback as the reproduced main-thread stall. Source232ac33 now confirms matching
  remote WebGL readback/command-buffer waits in both public engine summaries.
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

## Scoped repair procedure (implemented in5e9c3e4)

1. Clean pull with `git pull --ff-only`; read new addressed messages after
   `.last-read`. Source232ac33 has already confirmed the remote engine mechanism;
   inspect newer runs without repeating the instrumentation. Public notices need
   no stored credentials.
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

Focused validation commands from repository root (PowerShell):

```powershell
npm run test:browser -- tests/browser/literacy.spec.ts
$c18PriorCi = $env:CI
try { $env:CI = '1'; npm run test:browser -- tests/browser/literacy.spec.ts }
finally { $env:CI = $c18PriorCi }
$env:VITEST_MAX_WORKERS = '4'
npm run check
npm run format:check
npm run check:hygiene
```

For the software-rendering proof, create only an own-folder temporary config;
inherit the actual scoped trace setting from the test file, with no trace override:

```powershell
New-Item -ItemType Directory -Path docs/team/comms/codex/tmp -Force | Out-Null
$c18ProbeConfig = 'docs/team/comms/codex/tmp/c18-swiftshader.config.ts'
@'
import config from '../../../../../playwright.config';
import { resolve } from 'node:path';
export default {
  ...config, testDir: resolve('tests/browser'),
  use: { ...config.use, launchOptions: {
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
  } }
};
'@ | Set-Content -Encoding utf8 -LiteralPath $c18ProbeConfig
try {
  npx playwright test --config $c18ProbeConfig --project=journeys tests/browser/literacy.spec.ts
} finally { Remove-Item -LiteralPath $c18ProbeConfig }
```

Run browser captures sequentially, with no concurrent full check and no source
edits that trigger Vite reloads. Inspect every explicit screenshot. Playwright owns
the temporary server; verify it exits. A reused process ID alone does not identify
an owned process. Retain named experiment artifacts and their hashes in evidence.

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
   it must not be assumed to requeue automatically. Review cancellation/requeue
   behavior before extending it. Preserve C18 reading,
   dialogue priority and C24/C25 jobs. Optional Ollama unload defaults on; await unload
   before image generation. Villager jobs require no dialogue plus pause/sleep/
   acceleration; dialogue aborts/requeues them. Player image jobs finish before chat.
4. Extend connection settings in `src/presentation/hud.ts` / `src/main.ts`: endpoint
   empty by default, provider, unload toggle and Test receipt. Preserve the current
   `hearthwild-connection` settings and fallback entry; no endpoint must remain usable.
5. Write `docs/operations/image-generation.md`. Read-only pickup research found public
   release `master-1047-984eb06` (commit984eb0686cbf5b7fc4f0063d9e0b1fb38d5c4f82).
   Its SDAPI handler calls synchronous generate_image without a disconnect cancel;
   inspect native async cancellation before claiming real GPU preemption. At implementation time verify exact
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

## C20 pickup after C19

Inputs: [ticket](../../queue/codex.md#c20--paintings-villagers-paint-the-player-paints-everyone-sees-them),
[artifact specification](../../../engineering/authored-artifacts.md) sections4,
7.1-7.3,7.5,8.2,9,11; doctrine AGT-6, AGT-3.2/3.3; ADR031. C19's provider,
worker decode, quantizer and arbiter must exist before this integration starts.

1. Reuse C17/C18 foundation. `src/domain/artifacts.ts` already defines strict
   `PaintingBriefSchema`, pending/ready/failed painting records, pixels/palette,
   caption and render provenance. Artifacts already persist and display/take
   commands exist. Current saves are **v9**, not the spec's historical v5.
   Preserve every prior migration, one-reference ownership and immutable brief.
2. First mocked golden slice: player blank canvas -> validated paintingRequest ->
   persisted pending artifact -> C19 generation/quantization -> preview -> Keep ->
   displayed painting. Test reload during pending work and session/revision-safe
   result application. Add commands/actions/job variants through existing contracts
   and validators; add a new save migration only if persistent schema changes.
3. Implement shared content rules as content data: prompt1-240 characters,
   allowlisted composition/subjects, lettering/URL/brand/real-person rejections.
   Add CREATE_PAINTING and HANG_PAINTING with subject affinity and rates:
   artists1/day, other villagers1/7days. Resume pending briefs on load; use C19's
   existing player/villager arbitration rather than a second GPU queue.
4. Caption once through the sight/vision path: image4x nearest, image budget140
   tokens, at most40 words, fallback to brief subject. Store provenance/caption,
   give painter a fact memory, and make hanging a notice event. Villager prompts
   consume the caption; they do not repeatedly receive image pixels.
5. Painting screen from easel or blank canvas: prompt/chips, progress/Cancel,
   quantized4x preview beside raw output, Keep/Retry/Discard, clear missing-endpoint
   receipt linking Settings. Reuse UI kit/focus patterns. Render via LRU32 textures,
   framed hooks, inventory16x11 thumbnail and pending easel; request needed art
   through blender rather than generating or approving it here.
6. Validate briefs/rates/content rules, pending reload, cancellation/retry/stale
   results and the mocked paint->keep->hang1080p browser journey; inspect capture.
   Full check, relevant root/subpath regressions and CI remain required. Send a
   concrete own-folder machine-A smoke request: Lark paints during sleep
   acceleration alongside the26b model, painting hangs, next villager dialogue can
   mention its caption. A owns GPU/model/VRAM acceptance; B uses mocks/functional
   checks. C21 pixel editing remains separately gated on director go.

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

Historical C18 implementation validation (before current diagnostics):
**464 tests / 34 files passed**, four workers, 104.68 s.
The historical full local browser suite passed **23/23** in 8.9 minutes. Final book capture was copied and
inspected; full 48-page opening 47.3 ms mounts two pages. Both local combined checks
passed464 tests but missed the unchanged50ms artifact gate (61.4688/54.962ms);
isolated artifact project passed1/1. Types, architecture, assets, hygiene and formatting
pass. Root and subpath production builds pass, beta2/2 at each. The standalone local
benchmark misses director p95 (0.251ms >0.2), brain/movement pass. All measurements
are retained; do not rerun model latency on B or relax gates.

[Push CI41686809511](https://github.com/huytruong1810/Vibe/actions/runs/41686809511)
CPU `checks` **passed**, including full check, artifact timing, formatting and benchmark.
Both beta jobs and full ecology passed; browser timed out and aggregate `verify`
failed. The89ffe45 follow-up browser step exited1; see the current repair section.
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
