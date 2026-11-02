# Codex session handoff

## Next: C25; C24 candidate awaits machine-A B0

The director requested a fresh handoff for the next outstanding queue item: **C25,
long-term memory v2**. C22 and C24 remain candidates awaiting external acceptance;
C25 is the next open implementation under TEAM-8.4. No C25 runtime work has started.
Do not redo C24 or reopen C17. Claude is away until about November 9.

## Integrated baseline

- Engineering branch: `eng/hd-presentation`. Studio through **8085a9e** is integrated
  in merge **f309370**. C24 code is **84f08a3**. The final pull also fetched published
  studio **d9a62b2** (briefing/approval docs only), integrated in **9a376d7**.
  Workspace was clean at this handoff start; engineering pull was up to date.
  Studio d9a62b2 CI **41523150519 completed/success**, independently rechecked.
  C24 PR run 41524008070 succeeded; code push 41523994321 and engineering-tip
  runs 41524329426 / 41524315612 were still running when checked. Recheck actual
  CI at startup; a red studio takes priority. Do not infer success from these pending runs.
- Preserve C17/save v5, note/stick canvas and bow recipe correction, C22 fallback play,
  asset base-path handling, held-layer compositor, AssetPack 1.7.0 pin and ordered adapter.
- The only merge conflict was the authored-artifacts test table: save v5 and current
  abliterated model tags were both retained. Protected inputs came from published history.
- Directives 012/013 read. Latest model aliases are `gemma4-abliterated:26b` and
  `gemma4-abliterated:e4b`; use the operations pull/copy recipe, never pull a local alias.

## C25 binding inputs and intended result

Read `docs/team/queue/codex.md` C25, `docs/engineering/memory-and-context.md`
sections 2, 3.2, 3.3 and 4, ADR 032, and AGT-10.3 through AGT-10.6 / AGT-7.
AGT-10.3: **"Memories are invalidated, never silently deleted."** AGT-10.2 still
protects C24: **"Compaction changes nothing in long-term memory."**

- Add `MemoryRecordV2` and `CoreBlocks` exactly as specified: six memory types,
  provenance/confidence, importance, created/access ticks, invalidation/supersession,
  and bounded self/player/relationship blocks. Deterministic simulation events write
  typed records directly; only validated memory operations change core blocks.
- Current save version is **5** (`save-schema.ts`); C25 introduces **v6** and the spec's
  legacy migration. Preserve IDs and provenance; map old kinds as specified, preserve
  the old summary as an episodic record (importance 5), and seed core blocks from profiles.
  Retain all earlier migrations and C17 artifacts/placements/recipe corrections.
- At conversation end, enqueue at most one extraction on `gemma4-abliterated:e4b`.
  Input: final summary, last four entries, top-10 similar existing records with IDs,
  and core blocks. Output: at most eight ADD/UPDATE/INVALIDATE/NOOP operations and
  two block edits. Validate supplied IDs, entity grounding, caps and revisions before
  applying with session provenance. Player claims stay `told`; text cannot execute actions.
- Retrieval: recency `0.995^(game hours since last access)`, importance and relevance,
  min-max normalized with equal weights. Exclude invalid records; update last access
  only for selected records. `embeddinggemma` uses 256 dimensions via `/api/embed`;
  keyword overlap is the no-model fallback. Cache embeddings in IndexedDB by model,
  dimensions, record ID and text hash; embeddings are never save data.
- Reflection uses the dialogue model while idle at importance sum 150, producing at
  most three sourced records. At the 400-valid-record cap, fold lowest-scoring episodic
  records into an episodic digest and invalidate originals with `supersededBy`.
  Never fold semantic facts or commitments, and never restore C24's old deleting path.

## C25 entry points and implementation traps

- `src/domain/agents.ts`: current `MemoryRecord`/`MemoryState`, `MemoryRepository`,
  `MemoryRetriever`, event/perception/social writes, `PlanService`, `ReflectionService`.
  Current capacity is 256; append can delete low-importance facts or refuse writes.
  Current retrieval uses unequal keyword/importance/recency weights, and reflection
  triggers from record counts/time. These are C25 replacement points, not completed v2.
- `src/domain/conversation.ts` and `simulation.ts`: `closeDialogue` currently discards
  the worker context immediately. Capture the extraction snapshot before that discard.
  A summary may lag recent turns when compaction failed or was stale; account for that
  without unbounded prompts or claiming omitted turns were processed. Conversation IDs
  are worker-local; persistent provenance must distinguish sessions across reloads.
- Extend job kinds/response validation, receipt routing and background scheduling for
  extraction/folding as needed. Preserve cancellation, stale receipt rejection, dialogue
  preemption, CPU/model settings and no-Ollama play. Check the existing two-per-minute
  background quota against AGT-7's extraction deadline (30 seconds after close).
- `src/adapters/inference.ts` owns loopback network I/O; `persistence.ts` owns browser
  storage. Domain code cannot use network or IndexedDB. Thread embedding results into
  worker-owned retrieval through validated interfaces; preserve save checkpoint stores.
- Search all old memory-kind/summary/source-ID consumers, including save validation,
  diagnostics and tests. C24 currently inserts provisional old summary/commitment context;
  replace it with typed core blocks within the existing core/memory prompt budgets.
- C18 needs the `reading` type; sight needs `sight`. Do not implement those tickets,
  C14 combat, C19 painting infrastructure, or art regeneration during this C25 slice.

## C25 acceptance and machine-A handoff

- Unit tests: every extraction operation and block edit, foreign/stale IDs, grounding,
  player claims remain told, malformed/over-cap outputs, and injection text changes no
  actions or witnessed facts. Test at most one extraction per closed conversation.
- Golden retrieval rankings with fixed vectors; keyword fallback, invalidation exclusion,
  last-access updates and cache invalidation after text/model/dimension changes.
- Migration fixtures from v5 plus older supported saves: record counts/types/IDs,
  preserved summary/provenance, artifacts and round trips. Test reflection threshold,
  sourced insights and episodic folding without semantic/commitment loss.
- Keep C24 budget, stale-session, no-memory-mutation and long-dialogue tests green.
  Run `npm run check`, relevant browser journeys, formatting and hygiene; preserve
  the serialized 512-artifact <50 ms gate and HD gate. Run benchmark/ecology soak
  with retrieval measured at no more than 5 ms per prompt; avoid competing timing work.
- Machine B uses mocks. Once concrete, extend the existing B0 smoke to two conversations:
  a fact from the first is recalled in the second. Send Blender a test request through
  own comms with model tags, CPU placement and AGT-7 measurements. No C25 live result
  or migration is claimed in this handoff; C24's existing B0 request remains pending.

## C24 implementation and interfaces (preserve)

- `src/domain/conversation.ts`: worker-owned `DialogueSession`, strict summary schema,
  bounded prompt sections, 75% projected trigger, four recent speaker entries retained,
  revision/session checks and deterministic 95% oldest-entry omission. Compaction never
  accesses persistent memory (AGT-10.2).
- `PlanService.compaction` builds dedicated jobs. The deleting `MemoryRepository.compact`
  and count-based trigger are gone. Full memory no longer refuses a dialogue.
- `configureContext` command carries context size, dialogue/background model and CPU
  preference. `InferenceJob` carries model/context/output/CPU options and compaction target;
  `agentResult` can carry prompt token counts for model-specific calibration.
- Defaults: 8192 context tokens, background CPU on, current model aliases. Input reserves
  reply tokens plus 5%; summaries are conservatively bounded for future calibration.
  See memory-and-context implementation notes for caps and calibration guardrails.
- UI setup has Conversation settings and missing-model warning/install guidance. Background
  jobs fall back to the dialogue model when missing. Frames transport 32 recent lines;
  worker context retains history. Debug shows tokens, budget, compactions and truncation.
- Session context ends on close/reload; save schema stays v5. C25 owns typed records,
  extraction, embeddings, persistent core blocks and the next save migration.

## Preserved C24 evidence and remaining acceptance

- `npm run check`: **365 tests / 29 files**, including serialized artifact validation
  below 50 ms, asset validation, architecture and production build.
- **23 focused context/memory/inference tests**; **19 browser journeys**; final long
  conversation journey rerun passed. Production beta **2/2 at `/` and 2/2 at `/Vibe/`**.
- `npm run assets:build` reproduced tracked generated outputs unchanged: 3908 frames,
  five full pages, 79.84 MiB full / 19.88 MiB half. Packet and scoped village checks pass.
- `npm run format:check` passes. HD gate still rejects **1515 slice requirements**;
  approval coverage **4/41**. Do not weaken it.
- B0 request: [2026-11-02T2056--to-blender--test-c24-conversation.md](2026-11-02T2056--to-blender--test-c24-conversation.md). Run
  `npm run test:ollama -- gemma4-abliterated:26b --conversation` on machine A; CPU e4b
  compaction, 30 exchanges, turn-3 promise recalled at turn 28. Receipt defaults to OS temp
  `hearthwild-ollama-smoke/conversation-smoke.json`; retain it in the replying member's comms.
  This harness measures full responses, not AGT-7's first streamed token. No live result yet.
- Candidate digest: [2026-11-02T2056--to-all--c24-context-candidate.md](2026-11-02T2056--to-all--c24-context-candidate.md).

## Standing follow-ups

- C22 remains candidate pending director Pages activation, engineering integration into
  studio/main, live SHA verification and 15-minute receipt. Draft PR #1 is not merged by
  this work. Only the director merges main; no deployment or hosted-Ollama claim.
- Hatchet B14 is staged, not manifest-integrated. `art:integrate` currently maps species/npc
  appearances; do not pass a fake NPC override for item sidecars. C12 records the tool gap;
  communicator M25 precedes C23 ledger work. Held-layer runtime already exists.
- Riverlands revision 2 is director-approved for layout only, per
  `docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_riverlands-2.md`;
  preview tiles/placeholders are not approved art, and C7 activation remains gated. C32 already tracks the
  previous-revision before-overview fix. New C26-C32 tickets retain upstream statuses (C31 now has the installed toolkit and
  gated-licence/build prerequisites recorded upstream).
- After C25: C14, C13, C18, C19, C20, C3g, C7. C23/C12 standing; C21 needs director go;
  C15/C16 remain gated. Blender owns all art; communicator owns manifest integration,
  relay/status/digests/music. Hourly automation remains cancelled.
- Leave Vibe-art and preexisting review worktrees untouched. Keep own comms current,
  archive closed own messages, run hygiene before pushing, and stop owned processes.
