# Codex handoff: resumed 2026-11-05

## Current resume checkpoint (supersedes pause state below)

Huy explicitly resumed the validation plan in chat. Workspace remains `Vibe`,
branch `eng/hd-presentation`, HEAD `f46fb6dc`, engineering code `33788a03`.
Fast-forward pull is up to date. No studio merge or scheduled wake was created.

- Public push42092547479: checks (including benchmark), both browser shards,
  both beta bases and verify pass at exact HEAD. PR42092568549 has the same
  successful checks; its workflow is cancelled because ecology was cancelled.
  Push ecology's actual soak step was skipped, not passed. See
  [current CI receipt](current-ci-receipt.json).
- Local unchanged-source full check:569pass/1painting-budget failure at7.853ms
  against5ms; isolated retry7.609ms. Logs: `artifacts/resume-20261105-check-elevated.log`
  and `artifacts/resume-20261105-budgets.log`. Do not replace these with hosted results.
- Quantizer experiments preserved golden output but did not reliably meet the
  local budget; all runtime/test edits were reverted. Logs remain under
  `artifacts/resume-20261105-quantizer-*`; two experimental full-check failures
  remain at `artifacts/resume-20261105-check-quantizer.log` and
  `artifacts/resume-20261105-check-interior.log`. No experimental code is delivered.
- Huy also requested the communicator unblock LDtk levels. Studio76ef620c has
  director-approved village/Riverlands R3 layout+dressing, source digest
  ae34ae141d48512ab02607d274973751db79a0853fdebb74eaa3c6d982b66d5b.
  Communicator M28 tracks intake/relay and Blender gameplay forage-node input.
  Pass008 flora are Decor, not ResourceNode. C7 activation stays separate;
  controlled studio integration and existing engineering overlap remain open.
- Build49.74s and full formatting pass on unchanged runtime source. Logs:
  `artifacts/resume-20261105-build.log`, `artifacts/resume-20261105-format.log`.
- Exact HEAD native5/5 passes in2.1min: both draft regressions, both C13 journeys,
  C18. Opening30.7ms,5measurements,2mounted pages,0page errors; Intel D3D11.
  All11 images inspected. Source/hash-bound receipt:
  `artifacts/resume-native-f46fb6dc-20261105T2046/receipt.json`.
- Exact HEAD forced SwiftShader combined run4pass/1fail in4.7min: drafts and
  C13 pass; C18 opening1433.2ms fails100ms (pause1367.4ms). Isolated C18 retry
  also fails149.9ms (pause129.9ms). Both have5measurements,2mounted pages and
  0page errors. All11+1 images inspected. Receipts/raw CPU retained under
  `artifacts/resume-software-f46fb6dc-20261105T2049/` and
  `artifacts/resume-software-c18-f46fb6dc-20261105T2055/`.
  Unique failed traces remain under the matching `test-results/resume-*` paths.
  Do not count either run as software acceptance or substitute the older40.6ms run.
- Isolated failed CPU window shows73.3ms minor GC (71.7ms safepoint wait) and
  49.6ms compositor commit wait during the pause phase. Combined run has long
  profiler/worker tasks. These observations do not establish a production fix.
  [Structured receipt](resume-validation.json) `resumedValidation` retains all data.

Next: resolve the local painting5ms budget and traced software-opening failure
without weakening runner/assertions/limits; retain current hosted/native passes.
Communicator M28 can progress LDtk intake/relay independently. C7 activation,
studio overlap, face-format intake, A acceptance and Pages remain separate.
No local whole-check or software acceptance is advanced by this checkpoint.

Historical pause evidence follows and must remain preserved.

**PAUSED by Huy at 2026-11-05T18:20Z for continuation in a new session.**
Do not resume automatically or create another wake task. Resume only on Huy's instruction.
Workspace: `C:/Users/htruong/source/repos/Vibe`; branch: `eng/hd-presentation`.
Latest engineering code: **33788a034901b333ab12d38cdfc211ab15d1e680**.
The final handoff commit is documentation only; use `git log -3 --oneline` for its SHA.
Do not work in the separate `Vibe-art` checkout.

## Changed at this pause

- Requested studio4d175582 was normally merged at **aace9882**, preserving5655aa23
  faces.py and studio approvals/queues/status. Later047ee6b9 came through112ca67e.
  Retained faces.py blob: `b24e1e9620c7e567d58d00230a0df40707b232a8`.
- Delivered forge5655aa23; face/icon intake9c6ac457; C34 **522d85ae**;
  C3g trim/dedup/exclusion **3f2cb346**, generated **8051a212**; C35 review repair
  **89d2bbb9**; gallery shared-half accounting **c482b30b**; watcher **9469018a**.
- C18 authorized production repairs: **4bbabb7b** direct worker-to-worker checkpoint
  storage through existing validation/checksum/two-slot commits; **001c7cf8** periodic
  frame backpressure requiring recycled transport, preserving ticks and command frames.
- **33788a03** fixes a separate real editor race found under software rendering:
  an older asynchronous save cleared a newer draft's dirty flag, letting Add page
  bypass the visible96-character validation and losing newer valid edits. Input
  revisions now keep newer drafts dirty and flush/revalidate before navigation.
  Two deterministic real-DOM regressions fail against original code and pass fixed.
  Files: `src/presentation/ui/book.ts`, `tests/browser/book-drafts.spec.ts`,
  `tests/browser/fixtures/book-screen.html`. No assertions/limits/schema changed.
- Code through281f4b31 was pushed before the pause.33788a03 and this handoff are
  being published as the final pause checkpoint. Confirm remote HEAD before work.
- No scheduled resume task was created. The running33788a03 check was interrupted
  on Huy's pause; the process audit afterward found no owned Node/Vite processes.
  Other-repository Python services were left alone.

## Evidence / exact limits

- [Structured receipt](resume-validation.json), especially `pauseCheckpoint`;
  [public CI receipt](current-ci-receipt.json);
  [detailed director relay](acting-director-relay.md);
  [session log](session-2026-11-02.md). Historical receipts remain intact below/in git.
- Focused forge **55/55** pass: creature faces11, finish26, face publishing5,
  portrait9, registry4. Use `python -m uv run --project art/source/forge python -B
  -m unittest discover -s art/source/forge/forgelib -p <name>_selftest.py`.
  Direct execution of finish_selftest.py does not run its tests. Broad Windows
  discovery was interrupted around GPU-window subprocess tests; no broad pass claimed.
- Source001c7cf8 full check: **568pass/2 timing failures** in two runs. Fresh-process
  budget tests2/2 pass, artifact45.57ms. Thresholds and runner unchanged. Hosted
  source281f4b31 CPU checks pass in push and PR. Do not erase local failures.
- Latest33788a03 whole check was **interrupted**, after hygiene/types/architecture/
  standard assets passed and unit tests started. Build/full-format were not reached.
  Log: `artifacts/resume-book-fix-check.log`. Last completed production build41.56s
  and full formatting pass precede this last book fix; changed files were formatted.
- Final asset rebuild and standard check pass, all generated files reproduce with
  **no diff**:4024frames/3fullpages,47.67MiB full/12.21MiB half. All four atlas PNGs
  inspected; unchanged HD gate still fails1519 coverage requirements. Zero approved
  actors until current valid manifest/ledger integration. This is not19actor proof.
- **Native281f4b31:** C13 pack, C13 Zephyrit, C18 pass3/3 in1.8min. Opening41.3ms,
  two mounted pages/no page errors. All11 screenshots inspected. Preserved under
  `artifacts/native-281f4b31/receipt.json` with file hashes and raw CPU receipt.
- **Forced SwiftShader with final book fix:** unchanged C18 passes1/1 in1min,
  opening40.6ms (pause8.3/content22.3/render0.6/modal9.4), two pages/no errors.
  It ran immediately before33788a03 against matching runtime source; receipt states
  this explicitly. Preserve `artifacts/software-book-fix-33788a03/receipt.json`.
  Exact committed-source native/software confirmation remains the next action.
- Original281f4b31 forced software run failed during overlong-line rejection,
  before the final measured48-page reopening. Trace retained at
  `test-results/software-281f4b31-20261105T181051/`; do not count its80.3ms blank-book
  opening as acceptance. Earlier source688eab26 full native27pass/2fail/1skip,
  C18 opening323.5ms, and source4bbabb7b native61.3ms remain preserved controls.
- Current CI snapshot is **281f4b31 only**: push42081278254 and PR42081296878.
  Both CPU and both beta bases pass; push browser shard2 passes. Remaining browser,
  aggregate verify and ecology were still running at pause. Refresh exact-source
  jobs, not just workflow conclusion. Soak only counts if its actual step ran.

## First actions after explicit resume

1. Check workspace/process ownership, `git status --short`, branch, then
   `git pull --ff-only`. Read brief/charter and team-comms/doctrine-lookup skills,
   new top-level addressed messages; update `.last-read`. Continue this session log.
2. Refresh public unauthenticated GitHub Actions for the actual HEAD/code source,
   including annotations on failures. No stored-credential access. The final push
   may have started new runs including33788a03; the retained281 receipt is historical.
3. Finish `npm run check` with `VITEST_MAX_WORKERS=4`, production build if check
   stops before build, and `npm run format:check`. Run CPU budgets/browser timing
   sequentially without other validation work. Do not alter limits to get green.
4. Run native C13/C18 plus the two new draft regressions against the exact source:
   `npx playwright test tests/browser/book-drafts.spec.ts tests/browser/creature-minds.spec.ts tests/browser/literacy.spec.ts --project=journeys --output=test-results/<unique-name>`.
   For forced software, retained scratch config is
   `docs/team/comms/codex/tmp/c18-swiftshader.config.ts` (untracked, not lost work).
   It inherits base config and uses bundled Chromium, flags `--enable-gpu`,
   `--use-gl=angle`, `--use-angle=swiftshader`, `--enable-unsafe-swiftshader`.
   Use `CI=1`, inherited file-scoped tracing and a UNIQUE `--output` each run.
5. Preserve timing/CPU/failed traces before another run overwrites shared artifact
   filenames. Inspect every produced PNG. Do not reuse an output directory:
   Playwright deletes it. Require all five measurements, two-page mounting,
   full functional assertions,100ms opening and unchanged traces/timeouts/CI gates.
6. Require all remote browser shards and aggregate verify green for that actual
   source. Report ecology separately. Update Changed/Evidence/Gaps, run hygiene,
   stop owned processes, inspect intended diff, commit and push normally.
   Only then advance acceptance; do not rebuild already shipped queue features.

## External gaps / branch reconciliation

- Studio **d97206ca** is fetched/read but NOT merged. It adds ten face approvals and
  overlapping visitor C34/gallery work5a1d3686/51eadd03 after Codex's own deliveries.
  Coordinate ownership before another merge. Keep the live-model evaluator; synthetic
  fallbackDialogue scores do not establish M1-M5. Message1752 below is pushed.
- Recognize new face approvals, but current creature packets have50frames/alternative
  eyesOnly grammars, incompatible with the explicitly retained25frame single-grammar
  generator/intake. Earlier25frame packets bind superseded bodies. Blender must
  synchronize retained faces.py, regenerate current-body candidates, inspect and
  obtain matching fresh review. Human60frame packets are different. Never weaken
  body binding/coverage/idle visibility/format checks. Proposal007 Part2 stays excluded.
- Communicator alone merges manifest using validated intake; Codex transcribes valid
  approvals and rebuilds afterward.17 icon images map34 existing item identities.
  Seven Nov5 B20 bodies/items supersede older records; copper-sword/shortbow retain
  Nov4 approvals pending C36. No manifest/recipe/art packet/approval edits by Codex.
- C34 official/development e4b live M1-M5, actual GGUF/projector manifests/private
  mirror and C19/C20 GPU/latency/quality evidence remain on A. Third-party aliases
  stay unverified; base licence does not prove derivative clearance. C33 still
  needs real-output hair/fringe and mean/std skin QA evidence.
- C17 is already archived. C13/C14/C18 retain outstanding acceptance gaps;
  C22 awaits current-source verify and director Pages activation; C24/C25 and
  C19/C20 retain A acceptance. C21 and learned-brain work remain gated. No new wake.

## Earlier handoff notes (historical; the pause checkpoint above governs)

The following material retains prior receipts, rejected experiments, C7 planning and
external requests. Its statements of current source/running work are superseded above.


## Start here

Workspace: `C:/Users/htruong/source/repos/Vibe`; branch: `eng/hd-presentation`.
The pre-resume checkpoint was **45a10ccf**. Studio was normally merged at
**296a7598** and the tested B27/B29 Python unblocks committed at **5655aa23**.
Current validation and outstanding acceptance live in
[resume validation](resume-validation.json) and [historical public CI receipt](resume-ci-receipt.json) and [current CI receipt](current-ci-receipt.json).
Do not work in the separate `Vibe-art` checkout.

The director resumed this work and reordered it: Python forge unblocks first,
M25/C3b integration support second, then engineering acceptance. The original
pause is no longer active. **Remaining external acceptance is not completion.**
Keep the C18 CI repair ahead of rebuilding already implemented queue slices.

A historical Windows task was registered for **2026-11-04 21:40:19 America/Chicago**
(2026-11-05 03:40:19 UTC):
`Hearthwild-Codex-Resume-01a1a4df-20261105`.
It removes its schedule before resuming the previous session. At this resume's
process check no Codex CLI resume process or matching scheduled task was present;
the three Codex processes were existing IDE app servers. See the historical
[schedule receipt](resume-schedule.json). It retains workspace-write sandboxing and
on-request approvals; automatic approval was rejected and is not enabled. Windows
must remain logged in/available. A fresh session must check whether that scheduled
session has started and avoid concurrent edits; do not create a second wake task.

Use [team-comms](../../../../.agents/skills/team-comms/SKILL.md) and
[doctrine-lookup](../../../../.agents/skills/doctrine-lookup/SKILL.md).

1. Read `AGENTS.md`, `docs/team/briefs/codex.md`, the charter and the live
   [queue](../../queue/codex.md); repeat brief/charter after compaction.
2. Run `git status --short`, confirm branch/ownership, then `git pull --ff-only`.
   Preserve unfamiliar edits. Read new top-level `--to-codex--`/`--to-all--`
   messages and update `.last-read` with real UTC time (YYYY-MM-DDTHHMM).
3. Continue [the existing session log](session-2026-11-02.md); do not restart the
   implementation from scratch. Refresh public CI receipts for the actual latest
   source SHA before choosing a repair. Queue evidence contains some older
   "pending CI" lines; the receipts below record later failures.

## Latest checkpoint: ratified proposals and studio synchronization

- Exact requested studio4d175582 merge landed/pushed at**aace9882**. Kept5655aa23
  faces.py exactly and studio approvals/queues/status. Later normally merged current
  studio047ee6b9 at**112ca67e** to adopt C33/C35 and B27 publications. No doctrine,
  approval record, recipe or art packet was edited by Codex in either merge.
- **522d85ae**: C34 GPU e4b defaults, shared scheduler, fixed-domain/pinned retrieval,
  all active interlocutor claims in extraction, additive relationship type (existing
  save9 remains readable), streamed dialogue TTFT, and `npm run test:villagers`.
  Offline evaluator tests cannot establish actual model quality. Machine A must run
  both official/development e4b and supply independent transcript-bound ratings.
- **3f2cb346**: exact alpha bounds, cropped-RGBA hash deduplication with independent
  logical registration, and review-sheet exclusion. Existing renderer pivot handling
  remains valid. **8051a212** rebuilt4024frames/3full pages at47.67MiB full/12.21MiB
  half; all four atlas PNGs inspected. Standard asset validation passes. The unchanged
  HD gate fails1519requirements. Approved actors0 until current approved bodies and
  fresh matching faces are integrated by communicator. Do not reuse withdrawn grants.
- **a633e817** regression recognizes current body / stale face mismatches. Current
  public push41976368350 and PR41976379820: CPU and both beta bases pass; browser and
  verify fail. Push ecology's soak step actually passes; PR soak is canceled. Keep
  ecology separate. **688eab26** updates obsolete browser Ollama fixtures while
  preserving larger-model and missing-background fallback coverage; browser rerun is
  underway. First corrected run has a cold page.goto timeout in C8 with pending CSS;
  inspect retained trace before attributing that failure to simulation or storage.
- Merged C33 portrait9, C35 registry3, retained creature-face11, finish26 and
  face-publication5 pass. Focused post-merge intake/presentation49pass. Before this
  later studio merge, full check566tests/47files passes in64.87s plus all build gates
  except intentional HD coverage. Final whole-source checks remain required.
- New B29 candidate creature packets from studio use**50frames**, not the required
  25frame single-grammar format. Earlier25frame packets for B20 species bind older
  bodies. Blender must rerun with5655aa23 and seek fresh face approval. Human60frame
  face packets are a different format. Never expand the integrator to accept eyesOnly
  alternatives as a shortcut. Copper-sword/shortbow retain Nov4 approvals pending C36.
- Huy's direct chat ratifies005/006/007 Parts1&3 and excludes Part2 base creature eyes.
  C33/C35 are inherited candidates, not self-approved engineering. Review gaps sent
  to visitor: C33 fringe/hair preservation and mean/std skin QA; C35 string restrictions
  versus006 arrays and primary-source licence verification. Actual GGUF manifest and
  private mirror receipts remain open. Current primary Google terms page links Gemma4
  to an Apache2 licence; do not carry older Gemma terms forward without verification.

- Follow-up commits: **89d2bbb9** C35 array contract/all-entry verification;
  unverified derivative aliases fail closed, primary-source receipts in operations.
  **c482b30b** fixes shared-half-page gallery accounting; **9469018a** excludes
  immutable art/receipt trees from dev watching. **4bbabb7b** moves routine checkpoint
  persistence between workers; native focused3/3 pass, opening61.3ms/two pages.
  Source688eab26 full-native had27pass/2fail/1skip in13.9min (C8 cold page load and
  C18 opening323.5ms), with all screenshots inspected. Forced4bbabb7b run failed C13
  pack startup and was interrupted while the next case ran; no passing SW claim.
  **001c7cf8** adds recycled-buffer backpressure only for periodic frames; focused
  worker/bridge/writer11pass, ticks/commands unchanged. Final focused Python55pass.
  Whole-source check568pass/2timing failures in two runs; both budget tests pass
  alone in a fresh process (artifact45.57ms). Thresholds/runner unchanged; no full
  check pass claimed. Build/format pass. Final assets rebuild/check pass and reproduce generated files
  with no diff; unchanged HD gate1519 gaps. Latest pushed source281f4b31 native C13/C18 passes3/3, opening41.3ms,
  two pages/no errors; all11 produced screenshots inspected and hashed receipt
  retained at artifacts/native-281f4b31/receipt.json. Forced software and current
  remote journeys/CPU remain under validation; both beta bases pass in push/PR. Native control/raw evidence: artifacts/c18-control-688eab26; passing
  native4bb evidence: artifacts/c18-native-4bbabb7b. Use unique Playwright output
  directories for every new comparison. See ADR043.

The following baseline sections preserve earlier receipts. Their test/source numbers
are historical unless repeated above. Preserve C13/C14/C18 outstanding acceptance,
C24/C25 live-A quality, C19/C20 A GPU acceptance, and C21/learned-brain gates.

## Resume checkpoint: forge and integration support

- Python: canonical NPC IDs retain colons in metadata and use slugs in paths;
  missing animate stride keys fall back to approved review strides; superseded
  body approvals are skipped. Facing-aware horizontal offsets and compact profile
  grammars preserve coverage/idle/containment gates. Finishing24, creature-face11,
  face-publication5 tests pass. Blender retries publishing from unchanged approved
  workspaces and regenerates the five changes-requested faces for new review.
- M25/C3b: explicit face/icon intake and ledger commands, immutable reviewed-export
  receipts, per-frame runtime registration, expression selection and approved atlas
  inventory markup. Read-only tests accept the three actual approved sidecars and
  17 icon images (34 canonical item bindings, including18 garments). See the
  [intake guide](../../../engineering/hd-presentation.md#approved-creature-faces-and-inventory-icons).
  Communicator still owns manifest merges; staging does not activate these assets.
- Local baseline: sequential check553 tests/46 files passes; browser30/30 passes
  in7.9minutes, with C18 opening25.3ms/two mounted pages. The earlier concurrent
  CPU run missed the painting5ms limit at7.1638ms; preserve that failure. Later
  body-binding, ledger and C13 test changes require their recorded final checks.
- Public source45a10ccf run41965203820: CPU and both beta bases pass; Zephyrit
  notice capture and C18 initial-save startup fail. Unlike earlier receipts, its
  ecology `Run npm run soak` step actually ran and passed. This proves historical
  source soak only. No current-source remote green-CI claim.
- Queue: C14 archived with its real director simulation/playtest approval. C13 and
  C18 feature approvals are recognized while their current regression/external
  gaps stay open. C17 was already archived. C24/C25 and C19/C20 live-A acceptance,
  C21 and learned-brain gates remain unchanged.

## Changed: already implemented and pushed

| Ticket | Delivered work | Commit / evidence | Remaining acceptance |
| --- | --- | --- | --- |
| C18 | Written-word workflow, scoped trace repair, phase/bootstrap diagnostics | Original8619e25; repair5e9c3e4/ec22a07;842765c/ef890fd/1df43a7; startup breadcrumbs **f9f9e5dd**; [diagnostics](c18-ci-diagnostics.json) | Current startup CI failure; machine-A reading latency; director review |
| C19 | Provider/arbiter/quantizer golden slice, managed native cancellation, settings/operations | **8f1c399**, **1c14403**; [validation](c19-validation.json) | Actual model, latency/VRAM/cancellation acceptance on A |
| C20 | Durable player/NPC painting, captions/memory, recovery, hooks and texture cache | **e2e2b0f1**; [validation](c20-validation.json); ADR037 | Browser/verify regression gate; A overnight/latency/VRAM; pending cloth art; director review |
| C13 follow-up | Observer armed before transient phases resume | **ab636702**; [capture validation](c13-capture-validation.json) | Latest tested source passes both creature shards; overall CI still fails C18 |
| C3g | Every atlas page selectable; catalog versus resident decoded memory; ADR038 | **7a3ae74b**; [validation](c3g-validation.json) | Legacy scale comparison after M11 humans |
| C32 | Exact previous-revision overview provenance, before-image inspection gate, ADR039 | **c998d532**; [validation](c32-validation.json) | Actual machine-A Riverlands revision3 packet showing revision2 as before |

C22/C24/C25/C14/C13 earlier implementations remain candidates with their recorded
external acceptance gaps. C8/C8b/C11b and the parked forge tickets retain the live
queue's scope and ownership. Do not mark every ticket done from unit tests alone.

## Evidence: current baseline

- Final combined local `VITEST_MAX_WORKERS=4 npm run check`: **545 tests /45 files**,
  **59.87s**, plus types, architecture, assets, hygiene and build. Full formatting
  passes. Logs: `artifacts/c18-bootstrap-check.log` and
  `artifacts/c18-bootstrap-format.log`.
- C20's full browser suite passed **27/27 in7.6min**, before the two C3g tests.
  Both beta bases passed2/2. All48 retained PNGs inspected; local C18 opening42.7ms.
  The current total is expected to be29 journeys; confirm through discovery before
  reporting a new full-suite result. Do not describe29 as already passing locally.
- C3g:7 gallery tests; final2 atlas checks;5 inspected captures. Five2046-square
  atlas pages,3908 frames,79.84MiB full RGBA/19.88MiB half. Existing128MiB gallery
  page-cache cap is separate from canvas/UI/driver overhead and runtime budgets.
- C32: **27 worldforge tests /48.973s**, **5 terrain tests**, read-only village
  check152 placements. Real predecessor resolution selects revision2 for target3;
  overview SHA `6dc24989b15fa96c20f47949e9014c13427d2031131882118701bae040596ef0`.
  Synthetic fixtures prove tooling behavior, not visual acceptance.

Source **98416654072a3e4a1bfe142804f6e0c2356b29ef**:

- [Push41935313601](https://github.com/huytruong1810/Vibe/actions/runs/41935313601)
  and [PR41935324774](https://github.com/huytruong1810/Vibe/actions/runs/41935324774):
  CPU checks, both beta bases and creature shard pass; literacy shard and aggregate
  `verify` fail in both. Latest checkpoint's CI must be inspected afresh.
- Both literacy failures occur during **start offline world**, awaiting setup close.
  First frame exists, no page errors; renderer load about1.6-1.8s. IndexedDB open
  begins about8.8s, success callback about33.4s; first write completes about93-96s.
  Setup awaits the initial save. This identifies the waiting phase; it does not
  prove that IndexedDB itself, rather than delayed callbacks, is the root cause.
- Push ecology is **scope-skipped** despite a successful job conclusion. PR ecology
  is **cancelled at the25-minute limit**. Neither is passing soak evidence.
- Historical1df43a7 [push41873320685](https://github.com/huytruong1810/Vibe/actions/runs/41873320685)
  did pass browser/verify before the later work. Independently, ef890fd
  push41868358995 ecology126708375448 passed22m52s; sibling PR ecology timed out.
  Preserve these as separate historical outcomes, never current-source acceptance.

Raw latest receipts: `artifacts/c18-bootstrap/source-ci.json`,
`push-shard2-annotations.json`, `pr-shard2-annotations.json`.
Tracked history/hashes: `c18-ci-diagnostics.json.startupInvestigationPause`.
Ignored local artifacts are not guaranteed available to a fresh machine.

## Plan 1: finish C18 browser and aggregate verify CI

**Scope:** Huy explicitly authorized focused production performance work in chat,
overriding the original test-only restriction. Preserve simulation behavior, public
APIs, save compatibility, other journeys' tracing, retries, CI gates and timeouts.
Keep file-scoped retain-on-failure tracing with screenshots:false and snapshots:true;
explicit1080p capture; CPU trace; compact notice; every functional assertion; all
five performance measurements; two-page mounting; and the100ms opening limit.

1. Refresh latest source browser/verify/ecology jobs and annotations using public,
   unauthenticated GitHub REST. Never retry rejected stored-credential access.
   Add a receipt timestamp to avoid stale cache responses; normalize PowerShell
   array wrappers when reading retained JSON. Cite the source SHA and run/job URLs.
2. Diagnose the initial-save wait before changing behavior. Separate storage work
   from main-thread/GPU callback starvation and worker service time. Existing
   breadcrumbs already prove a frame arrived. If another profile is necessary,
   keep it separate from the original opening CPU trace and retain failed evidence.
   Do not infer a storage defect solely from delayed IndexedDB callbacks.
3. Make one justified, reversible change at a time. Do not bypass storage, pause or
   shrink the world to manufacture a pass, discard assertions, or increase limits.
   If evidence points to a production defect outside the authorized repair scope,
   record it explicitly instead of silently broadening this ticket.
4. Run focused literacy **sequentially** in normal mode, CI=1, and forced SwiftShader
   using the temporary-config pattern. The experiment must inherit the test's actual
   trace settings. Keep scratch under own comms/tmp or OS temp; remove it afterward.
   Inspect every emitted screenshot; retain timing receipts, CPU/Playwright trace
   evidence and artifact hashes, including failures.
5. Validate the final candidate with the full browser suite, four-worker
   `npm run check`, `npm run format:check`, `npm run check:hygiene` and diff checks.
   Stop owned processes. Commit the repair separately, pull/read messages, push.
6. Require green remote **all browser shards and aggregate verify for that source
   commit**. Record ecology independently by whether the soak step actually ran.
   Update handoff, session, queue evidence and C18 diagnostics with Changed / Evidence /
   Gaps and risks. Only then move on from the current CI blocker.

Do not repeat these rejected experiments without new evidence:

| Experiment | Observed result |
| --- | --- |
| Extra startup CPU profile on current GLES headless shell | Timed out at keyboard/gamepad. RasterImplementation::Finish aggregate16.38s/max3.07s; WaitForToken max5.58s. Nested timings are not additive. |
| Disable GPU rasterization | Opening3241.8ms; rejected. |
| Full Chromium, native graphics on B | Passed37.3ms with fresh48-page label; does not establish GPU-less CI acceptance. |
| Full Chromium, forced SwiftShader/default compositor | Opening188.1ms; rejected. |
| Full Chromium, forced SwiftShader/original GLES flags | Failed seal confirmation before maximum opening. |
|720p startup then1080p functional journey | Timed out opening maximum spread; rejected/reverted. |

All experimental source edits were restored and temporary config deleted. Failed
traces inspected for continuous screencast frames:0; DOM snapshots remain. The
latest failures are retained, not passing performance receipts.

## Plan 2: close acceptance gaps without rebuilding shipped slices

After C18's gate, reread replies and collect actual evidence:

- **C19/C20:** existing machine-A requests are already pushed:
  [C19 smoke](2026-11-04T1619--to-blender--test-c19-painting.md),
  [C20 workflow](2026-11-04T2252--to-blender--test-c20-painting-workflow.md).
  Verify native cancellation/terminal acknowledgement before chat resumes, GPU
  unload/recovery, reload identity, complete player pipeline, VRAM and overnight NPC
  workflows. Run no actual model/GPU latency tests on B. Request missing receipts;
  do not count mocks as A acceptance. Record defects as scoped fixes.
- **C32:** follow the pushed [revision3 request](2026-11-04T2347--to-blender--test-c32-previous-revision.md).
  Blender runs check/render/inspection/packet with revision3. Require before-overview
  bytes/hash to match revision2/overview.png, exact lineage receipts, and inspection
  of every overview/crop. Do not regenerate historical packets or approvals on B.
- **C3g:** keep the engineering slice candidate; compare scale when M11 human art is
  integrated. Do not resize authored assets or weaken the HD gate to close this item.
- **C22/C24/C25/C14/C13:** reconcile outstanding Pages/live deployment, A smokes,
  reference-machine playtests, authored clips and director review against receipts.
  The director handles main/Pages activation; communicator owns manifest/status.

## Plan 3: advance C7's unblocked engineering, then gated activation

C7 is **partial**, not implemented end-to-end. Use
[world-builder](../../../../.agents/skills/world-builder/SKILL.md),
[worldforge guide](../../../engineering/worldforge.md), ADR021, WLD-M1..M4, the
protected Aqualia bible/plan and the current compiler/loader tests.

Current map audit:2 authored levels,1 Aqualia settlement,1 new-game spawn,10 NPCs
with50 role anchors,5 services,8 habitats and **0 ResourceNodes**. The legacy host
still creates30 NPCs/9 settlements from fixed locations. Do not put20 villagers
in void or invent missing resource/layout coordinates.

1. Re-audit current map and consumer assumptions; split concrete engineering and
   external map dependencies in the existing queue. Preserve stable IDs. Obtain
   explicit scope decisions where the one-region map and30-NPC host disagree.
2. Build one tested authored slice before expanding: map-driven player spawn,
   settlements, NPC schedule/home anchors, services and entrances. Derive positions
   from map entities; remove fixed-coordinate assumptions from consumers, including
   supplies, queries, schedules, scenes, HUD and presentation. Keep this staged
   separately from gameplay activation until all consumers are covered.
3. Adapt resource and population seeding to authored nodes/habitat regions. Request
   missing forage placements from blender through passes; never edit LDtk JSON,
   protected plans or art sources directly. Test void, navigation and level seams.
4. Design the separate WLD-M3 world/content/save version change and world provenance.
   Old generated-world saves are rejected under doctrine, not silently migrated.
   Keep this out of C18/C19/C20 fixes; preserve their working behavior in regressions.
5. Activate only after map/scope/input and review gates are satisfied. Prove new game,
   save/reload/import compatibility behavior, authored browser journeys and an actual
   authored-world soak with unchanged CI gates. Until then, call the result a
   candidate adapter/compiler slice, not authored gameplay completion.

## Gaps and risks / stop conditions

- **C21** pixel editing remains unstarted until explicit director go after C20 review.
  **C15/C16** learned brains remain gated. Do not infer authorization from "all tickets".
- Forge tickets under "Waiting for claude" and the separately owned tool/art tickets
  retain their lane/machine constraints. Audit evidence and route to owners; do not
  claim Blender-dependent work was performed on B.
- **C23** is standing: update the ledger only from actual digest-bound director records
  after integration; never self-approve. **C12** is recurring: keep queues actionable,
  maintain evidence and communicate concrete blockers without inventing completion.
- C20 uses existing save-v9 fields. Native-flight marker/Web Locks fail closed on
  unknown jobs. Only one active game tab is supported; LLM scheduling is per instance.
  Caption192x128 pixels and140 output tokens do not prove a140-image-token budget.
  Mock C20 regression quant6ms exceeded5ms despite unchanged golden bytes; retain it.
  Brand lists/grounding are conservative; notice cooldown is session-local; pending
  cloth/easel art and actual A latency/VRAM/director acceptance remain external.
- End each checkpoint with **Changed / Evidence / Gaps and risks**. Pull/read new
  messages before push, run hygiene, remove scratch and stop owned processes. A
  skipped/cancelled/timed-out soak is never passing evidence. Do not claim all
  tickets done while external acceptance, unfinished engineering or explicit gates
  remain.

Latest studio fetch d97206ca is read but not merged: ten new face approvals are
recognized, while the creature packet format mismatch remains. Visitor C34/gallery
changes overlap already delivered engineering work; ownership reconciliation is
requested in the1752 all-team message. Preserve the live-model evaluator.
