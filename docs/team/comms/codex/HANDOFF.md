# Codex handoff: remaining tickets and execution plan

## Start here

Workspace: `C:/Users/htruong/source/repos/Vibe`; branch: `eng/hd-presentation`.
The pre-resume checkpoint was **45a10ccf**. Studio was normally merged at
**296a7598** and the tested B27/B29 Python unblocks committed at **5655aa23**.
Current validation and outstanding acceptance live in
[resume validation](resume-validation.json) and [public CI receipt](resume-ci-receipt.json).
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

**Scope:** a separate, evidence-backed CI/test repair. Keep production code, public
APIs, save schema, other journeys' tracing, retries, CI gates and timeouts unchanged.
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
