# Codex session handoff

## Next: C14; C25 candidate awaits machine-A B0

C25 implementation is **68af413** on `eng/hd-presentation`. The director requested this
slice only; no C14 work started. C22, C24 and C25 remain candidates with separate external
acceptance. Claude is away until about November 9. Preserve C17 artifacts and C24 context.

## Evidence and requests

- `npm run check`: **388 tests / 30 files**, architecture, assets and production build;
  run with `VITEST_MAX_WORKERS=4` to limit contention. The 512-artifact <50 ms gate passed;
  canonical-text memoization preserves all field-specific rules and has a regression test.
- Browser: long dialogue plus extraction/core recall in a second conversation/save-resume;
  interior save/load; production beta **2/2 at `/`**. Screenshots were inspected.
- [C25 candidate digest](2026-11-02T2155--to-all--c25-memory-candidate.md).
- [C25 machine-A B0 request](2026-11-02T2155--to-blender--test-c25-memory.md):
  `npm run test:ollama -- gemma4-abliterated:26b --memory`; CPU E4B, 30 exchanges then recall
  in a second conversation. No live inference result has been claimed on machine B.
- [Benchmark receipt](c25-benchmark.json): 400 records, cached 256-d vectors, retrieval
  **1.242 ms p95 / 2.177 ms max**; full prompt **1.935 ms p95 / 3.416 ms max**.
- Normal asset validation: 3908 frames, five full pages, 79.84 MiB full / 19.88 MiB half.
  HD gate still rejects **1515** requirements; approval coverage **4/41**. No art changes.
- Remote baseline CI checked via GitHub API: engineering ce647ff runs 41527051387 /
  41527038967 and studio d9a62b2 run 41523150519 completed/success. New C25 CI must be
  checked after push; do not inherit baseline success as evidence for the new commit.

## C25 implementation and preservation notes

- `src/domain/memory.ts` owns MemoryRecordV2/CoreBlocks schemas, validated operations,
  migration, retrieval and sourced synthesis. Save **v6** retains all older migrations,
  IDs/provenance, legacy summaries and artifact/placement/recipe behavior. Long old texts
  split into 280-character records; the first keeps its ID. Embeddings never enter saves.
- At most one extraction per nonempty closed session, using a world-unique conversation
  ID, summary, last four entries, top-ten similar records and core blocks. A bounded tail
  covers uncompacted entries; omitted entries are explicit. Too-large inputs are skipped
  with a notice while existing conversation records remain. Stale revisions are rejected.
- Capture precedes close; a close under another pause preserves its snapshot until staged
  actions commit on resume. Extraction bypasses routine quota, preempts lower priorities,
  and resumes after dialogue preemption within its original enqueue-to-30-second deadline.
- Retrieval normalizes recency/importance/relevance equally and touches only supplied
  records. Uncached queries use keywords; optional CPU embedding jobs warm worker/IndexedDB
  caches for subsequent identical queries. Text changes trigger refresh; model/dimension/
  record/text keys isolate persistent vectors. IDB vectors use a separate database.
- Reflect at accumulated importance 150 while idle; at most three sourced insights. Fold
  only low-scoring episodic records, invalidating originals with supersededBy. Admit at
  most 400 valid records; excess validated writes persist in pending storage, excluded from
  retrieval. If no eligible episodic records exist, pending writes remain visible in debug.
  Historical and pending storage can grow; frames carry bounded records and backlog counts.
- C24 compaction still never changes persistent memory. Keep its budget, overflow,
  revision/calibration, cancellation, model/CPU settings and no-Ollama play tests intact.
- Current aliases: `gemma4-abliterated:26b` and `gemma4-abliterated:e4b`. Operations has
  the alias install recipe; never pull the alias itself. No learned-brain/art/painting work.

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
