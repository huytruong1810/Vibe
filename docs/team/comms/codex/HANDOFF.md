# Codex session handoff

## Next: C13 creature minds

C14 runtime code is **17672f7** on `eng/hd-presentation`, followed by studio integration
**7f9858c** and final evidence/lifecycle fixes (see current branch log). The next open
implementation is **C13**, then C18, C19, C20, C3g and C7. C22/C24/C25 external
acceptance remains separate. Only the director approves candidates.

C14 adds deterministic per-target tokens, readiness-ring movement, qualifying attack
telegraphs, combat settings and the partner intent indicator. Save **v7** persists
settings, holds, waiting times and last-grant ticks; v1-v6 migrations and C25 memory
remain. Legacy attacks retain their elapsed windup/active/recovery. Existing attacks
finish if limits are lowered; new starts obey the new limits.

The director selected independent wild-target **2 melee / 1 ranged-element** pools,
resolving CRM-4.1 versus the spec exemption. Player/partner defaults are also 2/1;
villagers are 1/1. Grant spacing is at least eight ticks. Entity-ID-tagged slot buffers
and a reusable priority heap preserve order without quadratic repeated scans. Selection
permits closing; holds commit only when attack startup succeeds. No wait spends ammo
or attack stamina. Melee categories do not change existing elemental damage or timing.

## Evidence and limits

- [C14 candidate digest](2026-11-02T2300--to-all--c14-combat-candidate.md),
  [validation receipt](c14-validation.json), [benchmark](c14-benchmark.json),
  [browser token proof](c14-browser.json), [pickup baseline](c14-baseline.json).
- Full `npm run check`: **414 tests / 31 files**, types, architecture, normal assets
  and production build; four workers. Artifact <50 ms gate stays unchanged.
- Browser: 20 hostile Bramblefang plus reduced-motion element glint; grounded dialogue,
  cross-conversation memory/save-resume; HUD focus; interior save/load; production beta
  **2/2 at `/`**. Both retained 1920 x 1080 captures were inspected.
- Director, 150 actors using the real entity-store capacity: **0.150 ms p95** against
  the player, **0.095 ms p95** for independent wild pairs. Maxima **1.184 / 0.384 ms**
  include runtime outliers; this is machine B's i7-1365U, not the RTX laptop reference.
- Every original benchmark fixture's mean/p95 is below the recorded C25 baseline on
  this machine; no p95 regression over 5%. Timing varies with host conditions; no
  causal speedup claim. C25 retrieval **1.169 ms p95**, prompt **1.914 ms p95**.
- Ground arcs and glints reserve space with inverse masks for VFX, indicators, labels
  and weather. Predator anticipation transforms the existing sprite; an authored clip
  remains requested in [the Blender follow-up](2026-11-02T2250--to-blender--c14-predator-anticipation.md).
- The 30 x 17 content view has a one-tile projection/elevation inset. Incoming attacks
  center the renderer camera immediately, so camera lag does not hide a legal start.
- Normal assets: 3908 frames, five pages, 79.84 MiB full / 19.88 MiB half.
  The unchanged HD gate still rejects **1515** requirements, approval coverage **4/41**.

## Studio integration and C13 boundaries

Published art/studio **0d708b5** is integrated through the art branch in **7f9858c**.
Its studio CI **41538616909** and art CI **41538618972** completed/success. No art was
regenerated or approved. New upstream boards were not visually reviewed by codex.
C26 direction is approved for B20, but B20 still waits for the B19 golden-sample
choice; headroom and concept-clause work remains with claude. C31 is done upstream:
Hunyuan3D-2mv remains the sole gen3d backend; the losing backends were removed.
Do not restore the stale licence-blocked C31 status from earlier handoffs.

For C13, read the queue, creature-minds specification, ADR 033 and CRM doctrine.
Implement engagement/perception, scripted intents and movement in that ticket; do not
restart C14. Reuse `CombatSystem.prepareDirector`, `director.selected`, persisted holds,
telegraph read models and `partnerIntent`. Reaction-delay controls belong to C13.
Preserve bows, ammunition reservations, human nonlethality, hunting, scene membership,
physiology and all C24/C25 behavior. No learned brain until the director opens C15/C16.

## C25 implementation and preservation notes

- `src/domain/memory.ts` owns MemoryRecordV2/CoreBlocks schemas, validated operations,
  migration, retrieval and sourced synthesis. The memory change originated in save **v6**; current save **v7** retains all older migrations,
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
  previous-revision before-overview fix. C26-C32 retain their upstream ownership and gates; published 0d708b5 updates C26/C31 as noted above.
- After C14: C13, C18, C19, C20, C3g, C7. C23/C12 standing; C21 needs director go;
  C15/C16 remain gated. Blender owns all art; communicator owns manifest integration,
  relay/status/digests/music. Hourly automation remains cancelled.
- Leave Vibe-art and preexisting review worktrees untouched. Keep own comms current,
  archive closed own messages, run hygiene before pushing, and stop owned processes.
