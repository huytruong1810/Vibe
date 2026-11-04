# Codex session handoff

## Next session: repair C18 worker waits, then C19 and C20

Branch `eng/hd-presentation`, workspace `C:/Users/htruong/source/repos/Vibe`.
Clean pickup at **b17d0c4** on 2026-11-03 (America/Chicago). This handoff is a
documentation-only follow-up; no latency repair or C19 implementation has started.

Completed and pushed:

- **c73cdb8**: bounded book-opening phase measurements and browser receipts saved
  before assertions and in `finally`.
- **1110305**: CI-only public notice containing the phase receipt, so diagnostics
  can be inspected without downloading authenticated artifacts.
- **b17d0c4**: both CI receipts, validation evidence and session record.
- Earlier C13 **9b229bd** / **de93730**, C18 **8619e25** and evidence **89ffe45**
  remain candidates, never approvals. Do not restart their implementation.

Use [team-comms](../../../../.agents/skills/team-comms/SKILL.md) and
[doctrine-lookup](../../../../.agents/skills/doctrine-lookup/SKILL.md).
Read `docs/team/briefs/codex.md` at pickup and after compaction. Keep the existing
[session log](session-2026-11-02.md) current. Leave Vibe-art and other review
worktrees alone. No alarm, hourly automation or owned server is left running.

## First actions: finish the browser CI repair

1. Check branch, `git status` and `git log`; pull with `git pull --ff-only` only
   with a clean tree. Read new addressed messages after `.last-read`, especially
   replies to the [C18 machine-A request](2026-11-03T1730--to-blender--test-c18-reading.md).
2. Read [diagnostic evidence](c18-ci-diagnostics.json). The director's historical
   archive `C:/Users/htruong/Downloads/browser-journey-artifacts.zip` was inspected:
   C18 opening **328.8 ms > 100 ms**, with the other 22 journeys passing. That
   historical trace predates phase measurements; do not confuse it with new CI.
3. Inspect newer CI at pickup. The source **1110305** runs below are completed and
   red. Documentation-only **b17d0c4** has
   [push run41761606519](https://github.com/huytruong1810/Vibe/actions/runs/41761606519)
   and PR twin41761614061 still running as of this handoff; no result is claimed.

### Confirmed remote findings

| Source `1110305` | Total | Pause acknowledgement | Content retrieval | Spread render | Modal |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Push 41759162909](https://github.com/huytruong1810/Vibe/actions/runs/41759162909) | 607.8 ms | 305.5 ms | 297.8 ms | 0.2 ms | 4.3 ms |
| [PR 41759172479](https://github.com/huytruong1810/Vibe/actions/runs/41759172479) | 393.2 ms | 192 ms | 198.5 ms | 0.2 ms | 2.5 ms |

Both mount two pages. Delay is concentrated in the **two sequential worker
round-trip waits**. These measurements do **not** distinguish worker service time
from main-thread delivery, rendering or scheduling delays. No underlying-cause or
latency-repair claim is justified yet.

Both browser steps exited **1**, within their unchanged 20-minute job limits
(push 16m42s, PR 12m23s); aggregate `verify` correctly failed. CPU checks and both
production beta bases passed. Ecology was scope-skipped, not another full soak.
The earlier diagnostic source c73cdb8/run 41758344674 also exited 1 (16m37s browser
step), within its job envelope. These failures are not job timeouts.

Public timing receipts:
[push annotations](https://api.github.com/repos/huytruong1810/Vibe/check-runs/126342436407/annotations),
[PR annotations](https://api.github.com/repos/huytruong1810/Vibe/check-runs/126342466743/annotations).
Filter for title `C18 book opening diagnostics`. Public API access works through
`curl.exe`; sandboxed network calls may need escalation. `gh` is unavailable.
Push browser artifact **13290199166** uploaded successfully. Its raw trace was
not downloaded: unauthenticated artifact download returned **401**. Earlier
automatic review rejected stored-credential access; do not repeat or bypass it.
Use public notices for timings and an explicitly supplied archive for raw traces.

### Next investigation and repair

1. Start with `BookScreen.open` in `src/presentation/ui/book.ts`: it awaits pause,
   then content, then renders and opens the modal. Keep the existing total and
   four phase measurements; only the current opening's five entries are retained.
2. Correlate request IDs through `src/adapters/worker-bridge.ts` and
   `src/worker/simulation.worker.ts`. Profile request dispatch/receipt, worker
   `host.submit`, `host.artifactContent`, command-triggered `publish('frame')`
   and the periodic simulation/frame work.
3. On the main thread, profile frame handling in `src/main.ts`, HUD update and
   renderer/ticker work around those replies. Compare durations measured within
   each thread; do not subtract clocks with unrelated time origins. If needed,
   add bounded diagnostics and a focused CPU trace before selecting a repair.
4. Fix the demonstrated bottleneck. Removing one round trip alone is not proven
   sufficient: each remote wait already exceeds 100 ms. Preserve authoritative reach,
   session checks, pause semantics, on-demand content and two-page mounting.
5. Validate `npm run test:browser -- tests/browser/literacy.spec.ts` and the same
   command with `CI=1`; inspect every new screenshot. Run relevant worker/literacy
   regressions, four-worker `npm run check`, format and hygiene. Confirm the full
   browser suite and aggregate `verify` remotely before moving to C19.
6. Preserve the **100 ms** opening gate, all assertions, HD/artifact budgets,
   required `verify` and job limits. Do not skip cases, increase timeouts or add
   retries. Only investigate sharding if separate runtime evidence warrants it.

Local diagnostic evidence is already complete: focused test 1/1 in 47.5s (24.9 ms
opening), CI-enabled test 1/1 in 38.0s (17.5 ms). A temporary impossible -1 ms assertion
failed as intended and retained a fresh 82.9 ms receipt plus trace; **100 ms is restored**.
All four phases sum to the total; five entries remain after repeated opens.
Typecheck, full repository formatting and hygiene passed; generated spreads were
inspected. Do not rerun that temporary assertion as ordinary validation.

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
