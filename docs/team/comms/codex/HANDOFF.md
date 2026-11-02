# Codex session handoff

## Next: C14 combat director and telegraphs

The director requested a fresh handoff for the **next unblocked ticket: C14**.
C22/C24/C25 are candidates waiting for external acceptance; do not redo them or wait
idle on B0. No C14 runtime work has started. The queue order remains C14, then C13,
C18, C19, C20, C3g and C7 (TEAM-8.4). This handoff changes documentation only.

Engineering baseline: **a07acac** (C25 code **68af413**), `eng/hd-presentation`.
Pull was up to date and the workspace clean at pickup. Both a07acac CI runs now
completed/success: **41532984443** and **41532972788**, independently checked via GitHub
API. Recheck actual CI at startup; a red studio remains the priority.

Published studio advanced to **4f59fc0** after the C25 baseline. Its CI
**41530854318 completed/success**. The commit has opt-in C26 forge supersampling/
feature-preserving pixelization, proof boards, and queue changes: C26 candidate awaits
the director before B20; C31 is blocked on the director accepting the DINOv3 licence.
This documentation task did **not** merge it. At startup review/integrate the published
commit through the established branch flow; preserve local C25 queue evidence and upstream
C26/C31 statuses. Do not regenerate or approve art. Inputs were inspected via `git show`;
no claim about the appearance of those boards is made here.

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
- Current engineering/studio CI is recorded above; later documentation pushes need their
  own status check. C22 rollout and C24/C25 machine-A acceptance remain separate.

## C14 binding inputs and intended result

Read C14 in `docs/team/queue/codex.md`, `docs/engineering/creature-minds.md` sections
1, 2, 7, 10 and the director/telegraph rows of section 11; ADR 033; doctrine CRM-4,
CRM-10.3, CRM-8 and CMB-4. Doctrine wins over spec/queue/messages (DOC-2).

- CRM-4.3: **"Creatures off screen never start an attack on the player."** CMB-4.1
  requires a telegraph no later than windup start for an attack capable of over 15% max HP.
  CMB-4.2 requires predator crouch-and-shiver; CMB-4.3 says VFX and numbers never cover it.
- Pools per protected target: player **2 melee / 1 ranged-element**, partner **2/1**,
  each villager **1/1**. Hold a token from windup start through recovery end. Grant to the
  highest `waitTicks / 30 + 0.5 * aggression - 0.1 * distance`; deterministic ties and
  at least **8 ticks** between grants against a target. No wall-clock or model decisions.
- There is a binding-input discrepancy to record before choosing wild-fight policy:
  CRM-4.1 says **"Partner creatures and wild-versus-wild fights use their own token pools."**
  The queue/spec says wild-versus-wild uses no tokens. Do not silently override doctrine
  with that exemption. Protected-target implementation is unblocked; follow doctrine and
  ask the director if the intended wild-pool limits need clarification.
- Gate attack starts on grants; creatures without a token hold at
  `max(range + 1.5, kiteRange)` and circle minimally. C13 owns the later full intent,
  engagement, perception and species-brain implementation; do not pull it into C14.
- Use the specified fixed **30 x 17 tile** player-centered rectangle as the starting
  off-screen content constant, and verify edges against the renderer camera and 1080p
  projection. Keep scene membership checks. No renderer pixels enter simulation decisions.
- Expose token/grant-spacing/aggression difficulty settings through validated worker state;
  no alternate brain. Add the partner intent slot beside its portrait using current
  attack/guard/follow state until C13. Reuse existing kit/poses; request missing art from
  Blender rather than generating art or pretending an unavailable clip exists.

## C14 code entry points and traps

- `src/domain/combat.ts`: `CombatSystem.advance` currently approaches targets and starts
  attacks whenever range, cooldown and stamina allow. The `!attack && distance <= range`
  branch is the start gate. `attacks`, `pursuits`, `nextAttack`, `CombatStateMachine`,
  `attackDefinition` and `CREATURE_MOVES` already own timing and move selection. Preserve
  finite bow ammo/reservations, NPC weapons, friendly duels, hunting, nonlethal humans,
  physiology, guarding and attack resolution. Do not make token waits consume stamina/ammo.
- Release/reset holds on recovery, death, retired actors, canceled pursuits, missing or
  changed targets, scene changes and restore/dispose; avoid reservations without an attack.
  Preserve elapsed windup/active/recovery. Use entity IDs, not recyclable array slots.
- `CombatSystem.snapshot/restore/pruneRetired`, `src/domain/save-schema.ts` and
  `src/domain/simulation.ts` are persistence/integration points. Current save is **v6**.
  Token holds, wait/grant timing and gameplay settings must replay through a mid-fight save;
  introduce any schema change deliberately and retain all older migrations and C25 memory.
- Transport telegraph kind/facing/range/phase from windup tick 0 via domain contracts and
  presentation contracts. Derive the >15% threshold from the actual damage rules, including
  relevant multipliers, rather than discovering it only after the hit. Clear cues on cancel.
- `src/presentation/renderer.ts` has ground/objects/foreground/vfxLayer/labels containers;
  `projection.ts` has `HD_PROFILE` (1920 x 1080, 64 px tiles) and `CameraController`.
  Verify cue readability against VFX/damage labels; layer naming alone does not prove it.
  `hud.ts`, `ui/state.ts`, `ui/view.ts`, commands/contracts and `main.ts` cover settings
  and partner HUD state. Keep input focus, reduced motion, and even-pixel presentation.

## C14 acceptance and next-session execution

- Unit tests: token caps per target/category, independent pools, deterministic grant order,
  >=8-tick spacing, off-screen/scene rejection, release/cancel/death/restore cases, readiness
  ring behavior, and a mid-fight save replay. Assert windup/active counts, not just grants.
- Verify every qualifying creature move has its telegraph from windup tick 0, including
  element/ranged moves and multiplier cases; cancellation removes it. Test the difficulty
  command validation and partner attack/guard/follow indicator.
- Extend the existing combat/entity/browser fixtures with **20 hostile Bramblefang** versus
  the player. Capture at **1920 x 1080**, look at the capture before describing it (PRD-5),
  and retain proof of tokens, staggered starts, ground/glint cues and predator windup pose.
- Run `npm run check`, relevant browser journeys, formatting and hygiene. The artifact
  gate stays <50 ms and the HD gate must not be weakened. Run benchmark alone: compare
  against `c25-benchmark.json` on the same machine, keep the existing fixture within **5%**,
  and measure the director against CRM-8's **0.2 ms/tick** budget. Include C25 retrieval.
- Build on machine B without GPU/Blender. No LLM or GPU inference in combat (CRM-3).
  C14 does not require C24/C25 B0 to finish. Keep C14 open until work starts; report a
  candidate with evidence, not director approval. Next unblocked implementation is C13.


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
  previous-revision before-overview fix. C26-C32 retain their upstream ownership and gates; published 4f59fc0 updates C26/C31 as noted above.
- After C25: C14, C13, C18, C19, C20, C3g, C7. C23/C12 standing; C21 needs director go;
  C15/C16 remain gated. Blender owns all art; communicator owns manifest integration,
  relay/status/digests/music. Hourly automation remains cancelled.
- Leave Vibe-art and preexisting review worktrees untouched. Keep own comms current,
  archive closed own messages, run hygiene before pushing, and stop owned processes.
