# Codex session handoff

## Next: C13 creature minds

C14 runtime code is **17672f7** on `eng/hd-presentation`, followed by studio integration
**7f9858c** and final evidence/lifecycle fixes **0c49ded** (pushed). The next open
implementation is **C13**, then C18, C19, C20, C3g and C7. C22/C24/C25 external
acceptance remains separate. No C13 runtime work has started; this handoff changes
documentation only. Codex reaches candidate at most.

## First action: recheck and repair red studio CI

Pickup was clean and `git pull` up to date. Before C13, recheck these actual runs;
a red studio has priority over new ticket implementation:

- Engineering **0c49ded** runs **41560267885 / 41560260797** were still reported
  in progress by the GitHub API during this handoff. In 41560267885, beta-browser
  at both `/` and `/Vibe/` completed/success; `verify` and `ecology-soak` remained
  in progress. Do not infer a final success from the local 414-test receipt.
- Published studio **cda6dd5** run **41560860063 completed/failure**. Its `verify`
  job **125670843897** failed at the item contract self-test below; its ecology
  scope job succeeded. Previous studio **4858407**, run **41559789215**, also failed.
  Last observed successful studio **92f9278**, run **41556477158**, completed/success.
- Failing command: `python -m uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p items_selftest.py`.
  Check annotations only report exit 1, not the assertion/traceback. Retrieve the
  job log and reproduce on the failing upstream tree before deciding the fix.
  Inspect `items_selftest.py` (especially its CLI test), `items.py`, `forge.py` and
  the changed item recipe inputs. Root cause is **not established** here. Keep
  gates intact; do not run Blender/GPU generation to repair a CPU contract test.

New studio **cda6dd5** and art integration branch **4bf2372** are fetched but **not
merged** into engineering. They include forge tooling, B19 packets, face proof,
recipes and team directives; no appearance claim is made about their images.
Repair/review through the established studio -> art -> engineering flow, preserving
C14/C25 queue evidence. Do not disturb the Vibe-art worktree.

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

## Integrated studio baseline and newer messages

Published art/studio **0d708b5** is integrated through the art branch in **7f9858c**.
Its studio CI **41538616909** and art CI **41538618972** completed/success. No art was
regenerated or approved. New upstream boards were not visually reviewed by codex.
C26 direction is approved for B20, but B20 still waits for the B19 golden-sample
choice; headroom and concept-clause work remains with claude. C31 is done upstream:
Hunyuan3D-2mv remains the sole gen3d backend; the losing backends were removed.
Do not restore the stale licence-blocked C31 status from earlier handoffs.

These newer messages were read with `git show origin/studio/doctrine-v1:<path>`;
they are not yet in engineering's working tree. Read them after integration:

- `docs/team/comms/claude/2026-11-02T2330--to-all--directive-014-standing-review-delegation.md`:
  director delegation lets claude review Blender packets; codex still reaches candidate.
- `docs/team/comms/claude/2026-11-03T0003--to-all--directive-015-communicator-personal-assistant.md`:
  proposed assistant/reviewer routing has unanswered delegation questions. Its final
  instruction says directive 014 remains in force and communicator makes no approvals
  until the director answers. Do not treat the role headline as unconditional authority.
- Voice casting revision 2 is director-approved in upstream
  `docs/team/comms/director/approvals/proposal-002-r2.md` (record inspected); apply
  its ten casting records when reaching audio, not during C13.
- C27 pose guides and C30a swatch landed upstream; C30b portraits remain separate.
  Upstream also introduces a **C32 inventory-icon ticket** in claude's section,
  colliding with engineering's **C32 previous-revision worldforge packet ticket**.
  Reconcile IDs/links during queue integration; do not erase either task or assume
  that an icon update closes the Riverlands fix.

## C13 binding inputs and intended result

Read C13 in `docs/team/queue/codex.md`, `docs/engineering/creature-minds.md`
sections 2-6 and 8-11, ADR 033, and doctrine CRM-1.4, CRM-2/3, CRM-5/6/7/8/9/10.
The specification's section 1 predates C14: its claims that telegraphs are absent
and attack starts are unrestricted are stale. The tested code above is the baseline.

- CRM-1.4: **"The brain runs only when it matters."** Keep calm feeding, drinking,
  bathing, wandering, sleeping and herding on today's needs utility. Add
  calm/alert/engaged/disengaging, a 6-12-tick notice beat, and the specified calm/leash
  transitions. Preserve hunger-latched hunting, reservations, retaliation and territory
  as engagement reasons; do not retain an omniscient attack-start path beside perception.
- Build the allocation-free, scene-aware `PerceptionGrid` and `crm-obs-1` 64-float
  observation; retain the existing `SpatialIndex` for other callers. Perception uses
  the species' radius and facing cone, full circle within two tiles, and the reeds/
  deep-water visibility reduction. Keep `crm-cond-1` versioned for later conditioning;
  no global/hidden inputs or v1 raycast system.
- Implement all 12 intents and `CREATURE_TACTICS` for all eight species. Use the
  specified legality masks, +0.1 current-intent hysteresis, six-tick commitment,
  deterministic jitter, and 3-6-tick cadence staggered by stable entity ID. A hit or
  telegraph may schedule a reaction 2-4 ticks later, **never earlier than two ticks**.
- Movement executes intents: intercept, evade to safe medium, flank at the readiness
  ring, feint/guard, pack call and retreat. Add per-species boids and home/leash state;
  until C7 activates authored habitats, use the spawn/home fallback with a 12-tile radius.
- Flight is traversal for **both Zephyrit and Cindermoth**: water and steps up to two
  elevation levels, never solid walls; land for eat/drink/bathe/sleep. Airborne actors
  remain hittable and cast shadows. Use existing clips; request missing art from Blender.
- Add the engaged tier (48 full-rate slots, deterministic selection) and loaded-region
  2 Hz scripted fallback without dropping the remaining combatants from execution or
  inventing full-rate work outside the loaded region. Benchmark 150 engaged creatures,
  not only the 48 whose brain is scheduled most frequently.
- Partner `focus` / `regroup` use validated commands and the same brain with the partner
  flag; expose real intent beside the portrait. The current store has trust/ownership,
  **no durable bond-hearts field**: make its mapping/addition explicit under CRE/CRM,
  rather than silently labeling trust as hearts. Add reaction-delay settings through
  the current worker/settings path. Debug: intent, target, token, top three scores and
  one actor's observation inspector. Learned runtime/training remains C15/C16, gated.

## C13 entry points and integration traps

- `src/domain/combat.ts`: `autonomous`, `pursue`, `hit` and `pursuits` currently own
  engagement causes. `advance` still executes pursuit movement and starts/resolves
  attacks. Replace creature movement/choice deliberately; do not run the old pursuit
  step and the new executor on the same actor. Preserve human/NPC weapons and behavior.
- **Selection is not a held token.** `prepareDirector` sets transient
  `director.selected`; only a successful start calls `director.commit`. Requiring
  an already-held token to unmask the first attack deadlocks. Keep grant permission
  and windup-through-recovery holds distinct; waits consume no ammo/stamina.
  C14 categorizes the current default move; a brain choosing strike versus element
  must negotiate the actual target/category with the director before startup so it
  cannot spend a melee grant in a full ranged pool. Preserve the director heap,
  independent wild pools, eight-tick spacing and off-screen/scene checks.
- `src/domain/creatures.ts`: `CreatureDecisionSystem`, `SteeringSystem`,
  `HerdController`, `SimulationTierManager`, `creatureTraversal`, `moveOnTerrain`.
  `src/domain/simulation.ts:step` separately updates detailed creatures, coarse ones,
  NPCs, survival and finally combat. Reorder against the spec's pipeline and ensure
  each engaged actor moves once; scene membership and physiology still apply.
- `src/domain/world.ts`: `Traversal`, `SurfaceRules`, `TerrainNavigation` enforce
  ground rules. `src/domain/navigation.ts:NavigationService.key` currently includes
  lava/water only; add air to all relevant cache/search keys when adding flight, so
  flying paths cannot be reused by walkers. Preserve ground defaults and solid collision.
  Presentation currently marks only Cindermoth ungrounded; Zephyrit must be covered too.
- `src/domain/entities.ts` owns slot columns and stable IDs. New engagement/intent/
  reaction, memory, home/pack and RNG state must survive save/restore and slot reuse.
  Current save is **v7**; introduce the next schema deliberately, preserve every older
  migration and C25 memory, save the scripted rules/schema identity, and clear stale
  target/pack references on death, retirement, scenes, restore and dispose.
- `src/domain/presentation-contract.ts`, `simulation.frame`, renderer/animation and
  `src/presentation/ui/exploration.ts` carry poses, cues, flight and partner intent.
  Reuse C14 telegraph timing and masks; guard should use the explicit intent rather
  than leaving the periodic defense path active in parallel. Player windups can be
  observed through action timing even when they have no enemy telegraph record.

## C13 acceptance and first implementation slice

After the CI repair/integration, start one end-to-end scripted creature scenario
(observation -> engagement -> director permission -> intent -> one movement step ->
registered attack -> saved replay), then expand to all eight species. No C13 runtime
changes were made by this handoff. Keep C13 open until the new session starts work.

- Tests: honest scene/radius/cone perception; calm brain suppression; 3,000-tick
  same-seed/input intent hash; illegal masks; reaction floor/commitment/cadence;
  lifecycle cleanup; flight versus ground traversal/cache separation; partner commands;
  uninterrupted versus mid-fight-restored **intent and motion** replay. C14's existing
  replay test compares combat state/player HP, not the full new brain/movement stream.
- Assert every CRM-6.4 species identity, including pack gathering/flanking **before**
  the first strike and leader-loss break, Rivallie <30% retreat to water, marsh leash,
  Mireling guard bias, Steamshell guard/vent, Zephyrit hit-and-run, Cindermoth ranged
  preference, and Ignicap retaliation/retreat/corner burst. Do not omit hard cases.
- Add `engagedCombat150` and CI assertions: brain <=1.0 ms/tick, movement <=1.0,
  director <=0.2 (CRM-8). Report distributions/maxima and the measured machine;
  retain C14 director and C25 retrieval/prompt cases. Run benchmarks alone.
- Browser: six-Bramblefang pack and Zephyrit skirmish at 1920 x 1080, with notice,
  stalk, staggered commit and break visible. Inspect every capture before describing it.
  Keep the C14 20-hostile/telegraph, HUD focus, interior save/load and C25 memory journeys.
- Run `npm run check` with `VITEST_MAX_WORKERS=4`, meaningful browser regressions,
  formatting and hygiene. Preserve the artifact <50 ms gate and HD rejection rules.
  No model/GPU inference, art generation or approval by codex; post a candidate with
  evidence. Next unblocked implementation after C13 is C18.

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
