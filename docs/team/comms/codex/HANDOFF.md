# Codex session handoff

## Next: C25; C24 candidate awaits machine-A B0

The director's continuation plan was implemented. C24 is **candidate**, not live-model
accepted. Take C25 next unless the director reorders; do not redo C24 or reopen C17.
C25 remains outside this session's implementation. Claude is away until about November 9.

## Integrated baseline

- Engineering branch: `eng/hd-presentation`. Studio through **8085a9e** is integrated
  in merge **f309370**. C24 code is **84f08a3**. The final pull also fetched published
  studio **d9a62b2** (briefing/approval docs only), integrated in the following merge.
  Studio 8085a9e CI 41428705037 and ada4efa CI 41521499323 succeeded; d9a62b2 CI
  41523150519 was running at final integration. Check current CI at startup.
- Preserve C17/save v5, note/stick canvas and bow recipe correction, C22 fallback play,
  asset base-path handling, held-layer compositor, AssetPack 1.7.0 pin and ordered adapter.
- The only merge conflict was the authored-artifacts test table: save v5 and current
  abliterated model tags were both retained. Protected inputs came from published history.
- Directives 012/013 read. Latest model aliases are `gemma4-abliterated:26b` and
  `gemma4-abliterated:e4b`; use the operations pull/copy recipe, never pull a local alias.

## C24 implementation and interfaces

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

## Evidence and remaining acceptance

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
