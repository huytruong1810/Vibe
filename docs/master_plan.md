# Hearthwild — Master Engineering Plan

Status: playable reference architecture; [HD Aqualia slice](hd-presentation.md) engineering integration in progress, native art approval pending. Start with the [README](../README.md), then the [architecture guide](architecture.md). The [original draft](archive/master_plan_original.md) is retained as historical input, not the current specification.

The approved [full-world presentation, equipment and scenes expansion](full-world-presentation.md) extends the visual target to all nine settlements, 42 building interiors and three caves. It defines the source/catalog-v2 art stages, modular worn equipment, nine-expression human portraits, guarded combat/finite ammunition, scene permissions and save-v4 compatibility. Its newer equipment and scene rules supersede the earlier passive-clothing and overworld-only baseline below; native art approval and final validation remain explicit gates.

The [current production workflow](full-world-presentation.md#production-method-and-content-scope) uses reviewed master artwork and Blender pixel bakes with pinned offline ingestion. Reported art-branch frame counts or a compact prototype atlas do not establish full animation coverage, visual approval or passing integration checks.

The [physical presence specification](physical-presence.md) adds durable height/mass, bounded movement and combat factors, collision-constrained recoil, footprints, mud lean and accessible camera shake. Species balance and earned progression remain separate from physique.

## Product and operating constraints

Build a lively single-player browser Action RPG with a seeded, finite wilderness, visible creature herds, recoverable ecology, elemental combat, and villagers with schedules, observations, memories, and bounded LLM autonomy.

The reference world contains **Pyrador**, **Aqualia**, **Zephyria**, their six outposts, 30 villagers, and 1,000 nonhuman creatures including villager partners: 1,031 living entities in a fresh world. Presentation uses original placeholder pixel sprites, height offsets, cliff faces, depth ordering, weather, lights, and synthesized sound.

Defaults:

| Parameter          | Value                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| World              | 512 × 512 logical tiles, 32 × 32 chunks                                                           |
| Presentation       | 64-pixel tiles, 1920 × 1080 reference viewport, independent render quality                        |
| Simulation         | Fixed 30 Hz; rendering independent                                                                |
| Detailed creatures | At most 128, selected around the player with hysteresis                                           |
| Calendar           | Seven-day week; seven days per season; 24 real minutes per game day                               |
| Persistence        | Browser IndexedDB, rotating transactional checkpoints, JSON export/import                         |
| Closed/hidden game | No offline progression; hidden tabs pause                                                         |
| AI                 | Required local Ollama capability check at entry/resume; deterministic outage recovery during play |
| Inference          | One in-flight request; two background starts per real minute; dialogue priority                   |
| Content            | Three villages, six outposts, 30 profiles, eight nonhuman species, sample recipes                 |

An 8 GB integrated-graphics laptop is the intended low-end design target, not an unmeasured claim that every installed model will fit or deliver acceptable latency. Qualify hardware using the [verification procedure](verification.md).

## Corrected mechanics

### Simulation and AI authority

The simulation worker alone changes authoritative world state. Browser adapters handle input, rendering, persistence, and network I/O. All changes cross typed, runtime-validated command boundaries with session IDs and duplicate detection.

Villagers have deterministic weekly schedules and local social encounters. Optional background model calls propose personal plans and synthesize memories; real-time movement never waits for inference. NPC prompts contain actor-scoped observations, not omniscient access to every event.

The agent architecture draws on the memory, reflection, and planning approach in [Generative Agents](https://arxiv.org/html/2304.03442v2). It does not claim to reproduce that study's evaluation or its unrestricted inference workload.

Creature AI uses utility decisions, explicit modes, incremental A*, and local [Boids steering](https://www.red3d.com/cwr/boids/). The published [Bird Swarm Algorithm](https://research.aalto.fi/en/publications/a-new-bio-inspired-optimisation-algorithm-bird-swarm-algorithm/) is an optimization method and is not used as a substitute for game AI. No Name Village supplies observable artistic/gameplay inspiration; its [developer page](https://piemastah.itch.io/no-name-village) does not document its implementation.

### Player and inventory

- Exactly two nullable carried item instances. No item stacks or separate equipment bag.
- An unordered two-item recipe atomically writes its output into the left hand and empties the right.
- Multi-stage tools use explicit WIP content; invalid recipes preserve both items.
- Tools occupy a hand. Basic combat is innate. Origin clothing and bonuses are passive.
- Fire origin reduces burning damage, Water origin improves swimming, and Wind origin shortens dash recovery.
- Full hands prevent pickup before any resource is consumed.

### Creature wellbeing and partnerships

Base maximum HP, level, and earned XP never shrink with wellbeing. Average normalized Food, Water, Recreation, Cleanliness, and Rest produce an effectiveness tier:

| Average wellbeing     | Combat multiplier |
| --------------------- | ----------------- |
| `> .75`               | 1.00              |
| `> .50` through `.75` | .75               |
| `> .25` through `.50` | .50               |
| `> 0` through `.25`   | .25               |
| `0`                   | 0                 |

Movement retains a .25 floor. Damage calculations retain a small effectiveness floor and minimum damage to avoid permanent stalemates. Food and water reaching zero cause HP loss. Correct food, water, petting, bathing, walking together, and poultices support care and recovery.

Wildness is normalized to approximately `[0,1]`. Neglect below .60 wellbeing increases it; wellbeing at or above .75 reduces it. A value above 1 breaks the partnership without deleting the creature. Only one creature can belong to the player. NPC partners fulfill the same five needs as every other living entity, using actual food, water, rest and care. Authored NPC bonds remain permanent; humans are not tameable.

Humans and bonded companions recover from defeat and produce no edible remains. Killed unbonded wildlife retires its identity, leaves finite carrion, and never also revives. Delayed replacements use new IDs and require species quotas, habitat, available food/prey, and population space.

### Dialogue and social actions

Opening dialogue acquires a worker pause token and stops movement, combat, needs, schedules, the calendar, and environmental reactions. UI and network deadlines continue.

Dialogue may propose `FOLLOW_PLAYER`, `MOVE_TO_LOCATION`, `DROP_GIFT`, `OFFER_QUEST_MARKER`, `GOSSIP_RELATIONSHIP_SHIFT`, `SCHEDULE_OVERRIDE`, or `PARTNER_GESTURE`, or choose `NONE`. Closing dialogue revalidates and commits staged offers. Every effect receives a success/failure receipt.

Gifts consume finite settlement supplies as well as a daily allowance; markers resolve actual resources; gossip changes affinity by a fixed small game-rule amount; schedules use known semantic destinations. Raw model coordinates, item creation, arbitrary affinity deltas, executable code, and a mandatory reasoning field are not supported.

Structured commitments are stored separately from prose summaries. Observations, attributed hearsay, and reflections retain distinct provenance. Failed or stale compaction retains its source records. Low-priority perception can be attention-filtered when memory is full; conversations are not silently evicted to make room for another model call.

### Combat and progression

Combat uses tick-based windup, active, recovery, stamina, and invulnerability windows. Each swing records hit targets. Eligible player wildlife encounters and agreed duels resolve once and issue bounded level-based XP. Villager assaults and autonomous hunts grant no XP.

Water beats Fire, Fire beats Wind, and Wind beats Water: strong 1.5×, neutral 1×, resisted .75×. Dual defenders average the matchups. Hybrid companion attacks also average their attack elements. Each species has an explicit attack and defensive cadence.

Agreed NPC partner duel eligibility uses the absolute day number and is consumed when a battle starts. Dialogue must close before combat. Player defeat returns the player and companion home without destroying belongings.

## Unified entities and survival

The [complete unified-entity specification](unified_entities.md) defines the shared body store, public contracts, Nature policies, physiology, sleep, predation, finite food, migration and acceptance coverage. Player input, villager plans and wildlife logic are controllers over the same entity physiology, movement and damage rules. Human elemental affinity comes from origin/village and remains independent of biological species and diet.

- Food, water, recreation, cleanliness and Rest determine wellbeing. Awake Rest drains over sixteen in-game hours; sleeping restores it over eight. Fatigue increases awake food/water depletion by up to 25%; sleep halves it.
- Zero Rest latches a forced sleep obligation until 50%. Threats, damage or critical needs can wake the entity temporarily; the obligation resumes when safe. Voluntary sleep aims for 100%.
- Safe sleeping players can accelerate ordinary full-world ticks up to 8×. Danger, damage, critical needs, waking and pause stop acceleration. Nonessential model work waits; real-time model budgets do not accelerate.
- Nature separates retaliation, territorial aggression and diet-derived hunting. Passive never appears with Neutral or Hostile labels. Predation is a relationship, not a mutually exclusive animal category.
- Bramblefang and Marshstalker supplement the six existing plant diets. Four percent of fresh nonhuman populations are predators, split equally. Hunting begins below 40% satiety and remains active until above 80%, with six-tile acquisition, twelve-tile disengagement and bounded pursuit.
- Same-species fighting is allowed; same-species consumption is rejected even after meat processing. Human variants are one species. Humans and companions are never edible.
- Player attacks against villagers are nonlethal, provoke Nature-based responses and witnessed memories, and prevent dialogue escape during active combat. Daily duel limits do not suppress self-defense.
- Villagers carry no personal inventory. Accessible pantry/spring/rest services, real forage, finite food replenishment and survival interrupts sustain them and their companions.

Save **v3**, content **v2**, generator **v1** preserve existing progress. A captured v2 fixture verifies identity, position, inventory, XP, bond, memory and commitment migration. Previously defeated actors migrate as downed; predators enter older populations only through normal vacancies.

## Dependencies and implementation gates

| Gate       | Implementation                                                    | Required evidence                                                                                  |
| ---------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Foundation | [Clocks, commands, ownership, saves](foundation.md)               | Nested pauses, stale sessions, full state validation, checkpoint recovery                          |
| Phase 1    | [Seeded geography and height rendering](phases/01-world.md)       | Repeatable terrain; connected settlements; all autotile masks; valid elevation transitions         |
| Phase 2    | [Resources and environmental reactions](phases/02-environment.md) | No pickup loss; bounded spread; protected essential routes; regrowth                               |
| Phase 3    | [Calendar, herds, and simulation tiers](phases/03-ecology.md)     | Stable identities, bounded detailed count, seasonal resource changes, full-tick soak               |
| Phase 4    | [Needs, care, and taming](phases/04-creatures.md)                 | Diet validation, one-owner invariant, recoverable wildness, protected recovery and mortal wildlife |
| Phase 5    | [Two hands, settlements, and schedules](phases/05-settlements.md) | Valid recipe graph, all profiles and locations, path interruption handling                         |
| Phase 6    | [Grounded villager autonomy](phases/06-agents.md)                 | Observation provenance, grounded proposals, budgeted queue, fallback, compaction races             |
| Phase 7    | [Combat and bounded progression](phases/07-combat.md)             | Tick timing, hit/reward deduplication, daily eligibility, recovery                                 |
| Phase 8    | [Presentation and browser usability](phases/08-presentation.md)   | Browser journeys, local AI gating, screenshots, independent visual quality                         |

The code implements these gates together through a playable full-world reference. Combat's input/collision boundary is exercised before relying on polished rendering. Phase numbers describe dependencies and documentation, not a requirement to postpone every combat test until Phase 7.

## Completion and extension policy

Run the 28-day full-season ecology soak as well as `npm run check`, `npm run test:browser`, `npm run benchmark`, `npm run soak`, and a real installed-model smoke test. Record actual results and their hardware limits. Source implementations are the single code listing; phase documents link to them and explain contracts, state, algorithms, edge cases, complexity, and tests.

Extend content through registries. Change save/content/generator versions deliberately when schemas or world meaning change. Preserve exact-origin local inference configuration and never add hosted provider secrets to browser code. See [architecture decisions](decisions.md) and [operations](operations.md).

The reference is an engineering foundation, not a content-complete commercial RPG. Production assets, a campaign, stacked floors, unbounded terrain, mobile, multiplayer, and hosted inference require separate scoped work.
