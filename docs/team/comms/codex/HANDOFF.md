# Codex session handoff

## Next session: C24 conversation context and compaction

The director asked for a fresh-session handoff. **Take C24 next**, after the startup
integration review below. C24 is open and its implementation is independent of the
remaining C22 director rollout. No C24 runtime work was done in this handoff session.

Local baseline before this documentation update: `fb1373b` on `eng/hd-presentation`,
clean at session start; `git pull --ff-only` was up to date. C22 implementation is
b2afda6, deterministic atlas follow-up c33981f, evidence fb1373b; draft PR #1 remains
open. Only the director merges main (TEAM-7.4).

### Startup integration review comes first

1. Pull/fetch, preserve dirty work, read the current brief/charter/skills and addressed
   messages. Never change Vibe-art or the preexisting review worktrees to simplify a merge.
2. Fetched art and studio now point to **4a66f31**. Four commits are not integrated here:
   3fe8a40 (hatchet publish), 0460973 (Riverlands revision 2), 901c100 (model tags),
   4a66f31 (artifact-spec table formatting). Review and normally merge published history;
   do not reset. Recheck refs rather than treating this snapshot as current forever.
3. Preserve C17's archived done status, save v5, note + stick canvas/bow recipe correction,
   C22 fallback play, base-path handling and the deterministic atlas adapter/pin. Incoming
   operations text still says required Ollama; reconcile it with shipped optional play.
   Do not reopen C17 from upstream's stale queue entry or restore its old save assumptions.
4. Read the updated directive 012, living-minds doctrine, memory/context spec and live
   queue. Current model tags are **gemma4-abliterated:26b** for dialogue and
   **gemma4-abliterated:e4b** for background work (901c100); stock tags in older local
   docs are stale. Upstream operations has the actual pull/copy alias recipe: do not
   invent an `ollama pull` command for a local alias. Machine-A installation/performance
   claims are upstream reports, not a new independent live smoke here.
5. Latest studio 4a66f31 CI 41407515427 is completed/success (901c100 failed before
   the formatting follow-up). Recheck actual studio CI; a red studio is top priority.
   Revalidate merged code and
   generated outputs before proceeding. Current local evidence predates these four commits.

### C24 binding inputs and behavior

Read `docs/engineering/memory-and-context.md` sections 1, 3.1 and 4, ADR 032, and
AGT-1.3 / AGT-10.1-10.2 / AGT-7. Use the merged versions with the updated model tags.
AGT-10.2: **"Compaction changes nothing in long-term memory."** TEAM-8.4 says a blocked
item is skipped rather than waiting while an unblocked ticket exists.

- Worker-owned `DialogueSession`: transcript, structured summary, summarized-through
  index and revision; open on interact, close on dialogue end, reload ends the session.
- Default context size 8192; send that same value as Ollama `num_ctx`. Input budget
  reserves the reply and 5% margin. Calibrate estimates from `prompt_eval_count`.
- Stable prompt order: identity/rules, core blocks, retrieved memories, world facts,
  conversation summary, recent turns, new player line. Spec sub-budgets: core 300,
  memories 600, facts 300 tokens. C25 will supply typed persistent core/memory records.
- At projected 75% of input budget, enqueue one session compaction job, below dialogue
  and above plans, using the background model on CPU by default (`num_gpu: 0`).
- Keep K=4 recent turns verbatim. Validate `CompactionSummary` (gist, asked/promised/
  decided/open/mood with spec caps); apply only to the matching unchanged session
  revision. Reject stale receipts and retry on a later turn, including close/reopen cases.
- At 95% overflow, deterministically omit oldest verbatim context and show `truncated`
  in debug. Replies must remain usable and compaction must not mutate NPC memory.
- Settings/setup: background model, CPU toggle, context size, missing-model install
  guidance and warning/fallback to dialogue model. Keep C22 no-Ollama play functional.
- Remove the old count-triggered memory-compaction deletion path. Leave C25 extraction,
  embeddings, typed memory and save migration to C25; do not turn C24 into that ticket.

### Concrete code traps to inspect before editing

- `src/domain/agents.ts`: MemoryRepository.compact currently deletes cited records;
  needsCompaction uses counts; PlanService.job omits conversation turns and caps input
  at 2800; background selects memory compaction. Its job messages allow system/user only.
- `src/domain/simulation.ts`: dialogue open/send/close and acceptInference route results;
  dialogue send currently refuses at `dialogue.lines.length >= 31` (about 15 exchanges),
  and can refuse when appending conversation memory fails. These conflict with the
  required 30-turn exercise. Separate usable session context from old memory-cap behavior
  and keep frame/UI transcript transport bounded; do not simply enlarge every payload.
- `src/domain/contracts.ts`: current DialogueState is the frame-facing contract.
  `src/adapters/inference.ts`: one model, fixed num_ctx=4096, discarded prompt token
  count, bounded one-in-flight scheduler, background quotas and dialogue preemption.
  Preserve receipt validation, cancellation/session reset and no hosted inference.
- UI/settings plumbing is in main.ts, presentation/hud.ts and presentation/ui/view.ts.
  Existing agent/inference/simulation tests cover old compaction: update their intent
  to transcript compaction and assert unchanged persistent memories, not weaker checks.

### C24 acceptance

Unit/property tests: one 75% trigger, last four turns verbatim, stale/session receipt
rejection, deterministic 95% fallback, prompt always within budget, persistent memory
unchanged. Cover model/num_ctx/CPU options, token calibration, abort/preemption, missing
background model and C22 fallback mode. Debug shows tokens, budget and compactions.
Run `npm run check` and relevant browser tests; preserve the serialized <50 ms artifact
budget and all HD gates. Avoid competing local CPU work during the timing check.

Machine B uses mocks. After the implementation is concrete, request Blender B0 through
own comms: a 30-turn conversation on the updated 26b + CPU e4b tags, a turn-3 promise
recalled at turn 28, and compaction/reply latency evidence against AGT-7 in operations.
No such C24 live smoke or implementation is claimed yet.

## Newly published art / process follow-ups

- Hatchet B14 is published/staged by 3fe8a40; read upstream blender's
  `2026-11-02T0416--to-communicator-codex--hatchet-published.md`. Manifest integration
  is not present in these four commits. Communicator M25 precedes Codex C23 ledger work;
  inspect tool compatibility for item sidecars and report refusals rather than bypassing.
  That message's pending-compositor wording is stale: runtime held composition already
  shipped in 2b3bb5b and is integrated locally. Do not rebuild it; modular human-body
  integration is still separate.
- Riverlands revision 2 is a candidate, not an approval or C7 activation. Read upstream
  blender's `2026-11-02T0430--to-director-communicator--riverlands-revision-2.md`.
  It requests a worldforge before-overview fix: use previous revision rather than the
  blank initial draft. Triage this through C12 into queue work; do not divert C24 based
  only on this handoff. Other reported art/collision gaps remain director review items.
- Order after C24: C25 -> C14 -> C13 -> C18 -> C19 -> C20 -> C3g -> C7;
  C23/C12 standing. C17 stays done, C21 needs director go, C15/C16 remain gated.
  Claude away until about November 9; parked forge work stays parked. Blender owns
  all art; communicator owns relay/status/digests/manifest integration/music.
  New approvals are director-only. Hourly automation remains cancelled.

## Preserved C22 evidence and rollout gap

c33981f code push CI **41404667063** and PR CI **41404675736** both completed/success:
reproducibility, engineering checks, formatting, both production bases, existing browser
journeys and benchmark. Local check: 355 tests / 28 files; browser journeys 19; forge 61;
hooks 20; root production smoke 2. Earlier 28-day ecology soak passed. Evidence-only
fb1373b push/PR CI (41406785547 / 41406801160) also completed/success. No runtime tests were rerun for this doc update.

All 7,816 decoded frame crops and source/trim dimensions match the pre-repack atlas;
all ten PNGs inspected. Retained receipt: `2026-11-02-c22-atlas-qa.json`; decoded
79.84 MiB full / 19.88 MiB half, 3,908 frames / five full pages. Approval coverage
4/41 and 1,515 slice gaps remain. Preserve the AssetPack 1.7.0 pin and ordered adapter.

As checked for this handoff, Pages is disabled and PR #1 is draft. Director merges
reviewed workflow into main, integrates engineering into studio, selects Pages >
GitHub Actions and allows the default-branch workflow-run deployment in github-pages.
Then verify the live SHA and 15-minute receipt. No live deployment/hosted-Ollama smoke
is claimed. Never copy credentials into files or messages; use configured credentials.

Keep own session/comms evidence current, archive closed own threads, run hygiene before
pushing and stop owned processes. Do not rewrite published history or edit protected rules.
