# Codex session handoff

## Next session: repair browser CI, then pick up C19

Branch `eng/hd-presentation`, workspace `C:/Users/htruong/source/repos/Vibe`.
C13 commits **9b229bd** and **de93730**, C18 **8619e25** and evidence **89ffe45**
are pushed. Pickup was clean at **89ffe45**; this handoff is a documentation-only
follow-up. C13/C18 are candidates, never approvals. C19 is the next open feature
ticket and has not started. The [C18 plan](c18-plan.md) preceded its implementation.

Diagnostic follow-up (2026-11-03): the director supplied the failed browser log and
artifact archive. The failure is the C18 maximum-book opening gate: **328.8 ms >
100 ms**, with 22 other journeys passing. The trace has two mounted pages but no
internal phase timings. New diagnostics measure pause, content, render and modal
phases and save the browser receipt before assertions and on earlier failure.
Local focused test passed (24.9 ms); an intentionally impossible assertion failed
and retained a fresh receipt (82.9 ms) and trace. The **100 ms gate is restored**.
Diagnostic commit **c73cdb8** is pushed; its
[full CI run](https://github.com/huytruong1810/Vibe/actions/runs/41758344674) is running.
GitHub artifact downloads require authentication (unauthenticated API returned 401).
A CI-only notice now publishes the timing receipt through public check annotations,
without reading credentials; the JSON artifact remains authoritative too.
See [diagnostic evidence](c18-ci-diagnostics.json). Full browser CI remains pending;
this instrumentation is not a latency repair, and C19 has not started.

Use [team-comms](../../../../.agents/skills/team-comms/SKILL.md), pull only with a clean
index, read new addressed messages and re-read `docs/team/briefs/codex.md` after compaction.
Keep the existing [session log](session-2026-11-02.md) current. Leave Vibe-art and other
review worktrees alone. No alarm or hourly automation was scheduled.

## First actions before C19 code

1. Confirm branch/workspace, inspect `git status`, then `git pull --ff-only` with a
   clean tree. Read new addressed messages after `.last-read`, especially replies to
   the [C18 machine-A request](2026-11-03T1730--to-blender--test-c18-reading.md).
   Update the existing session log; do not restart completed C13/C18 implementation.
2. Resolve the known red browser job as the CI follow-up. On source **8619e25**,
   [push run41686809511](https://github.com/huytruong1810/Vibe/actions/runs/41686809511)
   passed CPU checks, both beta paths and the full 28-day ecology soak (**22m33s**).
   Browser job126094603227 exceeded the unchanged 20-minute limit (public annotation
   confirms it); aggregate `verify` failed. Separating CPU/browser jobs was insufficient.
3. Latest evidence-only **89ffe45**,
   [push run41688294291](https://github.com/huytruong1810/Vibe/actions/runs/41688294291),
   again passed CPU and both beta paths; its documentation-only ecology job was
   scope-skipped, not another full soak. Browser job126099802397 instead exited with
   code 1 after 12m31s in `npm run test:browser`, within its job envelope. Public
   annotations identify only exit code 1; the director's supplied log now identifies
   C18's 328.8 ms book-opening measurement against 100 ms. PR twin run41688308406
   also failed. Do not describe this second failure as another timeout.
4. Inspect the new phase receipt from full browser CI, identify the slow stage,
   reproduce its actual failure, then repair it before C19.
   All 23 local journeys previously passed; that does not establish the remote cause.
   Keep assertions, HD/artifact budgets and aggregate `verify`. Consider deterministic
   sharding only if evidence shows total browser runtime remains the problem; do not
   merely raise timeouts or skip cases. Stored-credential access was rejected earlier;
   do not repeat or bypass it. Record unavailable logs honestly if access is still absent.
5. Re-read the C19 ticket/spec and record any plan adjustments before implementation.
   Keep the CI repair and C19 feature in separate commits, with validation for each.

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
