# Architecture decision records

These records explain why the implementation differs from the original draft. Status is accepted for the reference game; changes require updated tests and, where relevant, a versioned save migration.

## ADR 001 — one authoritative simulation worker

**Problem:** splitting creatures into a background matrix while combat/NPC movement runs independently on the main thread creates competing positions, clocks, and ownership.

**Decision:** one worker owns all authoritative state. Main-thread adapters send validated commands and consume disposable snapshots. Rendering and inference have separate time/budget boundaries.

**Alternatives:** main-thread-only simulation is simpler but exposes animation to pathfinding/serialization spikes. Multiple authoritative workers add synchronization and consistency costs that are unjustified for 1,000 creatures and 30 villagers.

**Consequence:** worker messaging, transferable-buffer ownership, snapshot cost, and lifecycle errors need explicit integration tests. A worker is not a substitute for bounded algorithms.

## ADR 002 — data-oriented hot state with small domain services

**Problem:** entity inheritance and object-heavy matrices make bulk updates and saves expensive; putting every heterogeneous NPC field into arrays sacrifices readability.

**Decision:** typed creature/terrain columns, ordinary bounded NPC records, pure math functions, explicit stateful services. Shared value types clarify units without allocating wrappers inside loops.

**Alternatives:** a generic ECS framework, actor-per-entity framework, or class hierarchy could provide tooling, but would add dependencies and abstractions without solving a measured reference-game problem.

**Consequence:** column length/ownership validation is essential. Superseded by ADR 009 for identity: storage slots can be reused, persistent entity IDs cannot. System order remains visible in the host.

## ADR 003 — utility decisions and Boids, not Bird Swarm Algorithm

**Problem:** an optimization algorithm does not define collision, survival goals, taming, combat interruptions, or credible local flock movement.

**Decision:** need utility selects intentions; explicit modes handle execution/interruption; shared incremental navigation handles obstacles; local Boids terms shape herd movement. Coarse distant movement is bounded and collision-aware.

**Alternative:** treating every bird-swarm optimization update as an animal decision conflates unrelated concerns. Full per-creature GOAP or a behavior-tree editor is unnecessary for the reference species and two added predators.

**Consequence:** these layers can be tuned independently. Dense-neighbor caps and coarse migration are documented approximations.

## ADR 004 — constrained geography with procedural variation

**Problem:** climate noise alone does not guarantee a volcanic village, river settlement, coast, six reachable outposts, or a usable first ten minutes.

**Decision:** finite seeded climate/geography, explicit river/coast/volcano fields, authored settlement anchor/templates, protected road corridors, guaranteed wells/starter resources, generation-time connectivity proof.

**Alternative:** unconstrained terrain followed by unlimited regeneration can stall and still fail. A fully authored map would reduce variation and require different content tooling.

**Consequence:** settlement locations are stable across seeds in the reference while surrounding climate/resources vary. Generator changes must be versioned once saves are released.

## ADR 005 — grounded, budgeted local agency

**Problem:** thirty continuous LLM loops are not a credible baseline for ordinary laptop hardware. Dialogue-only models lack autonomous continuity.

**Decision:** deterministic schedules and local social behavior always execute; occasional LLM jobs observe, retrieve, reflect, and propose constrained plans. One request at a time, dialogue priority, bounded contexts, deadlines, and a real-time background cap.

**Alternatives:** conversation-only AI misses the desired autonomy; unconstrained research-style inference disregards latency, memory, and gameplay budgets.

**Consequence:** model availability, schema reliability, throughput, and believability require separate evaluation. Required entry checks do not imply the game should crash on an outage during play.

## ADR 006 — proposals are not committed world facts

**Problem:** valid JSON can still invent items, destinations, relationships, and completed promises. Executing physical effects while all clocks are frozen introduces temporal inconsistencies.

**Decision:** strict action union, actor-scoped facts, semantic destinations, resource/gift allowances, fixed social consequences, staged dialogue offers, revalidation and receipts after close. Store witnessed facts, attributed hearsay, reflections, and conversation separately.

**Alternative:** direct tool execution from model output is easier to prototype but gives the model unnecessary authority and makes saves/races difficult to reason about.

**Consequence:** a model can be mistaken in dialogue while the world remains coherent. Structured commitments survive lossy memory summaries. Closing or restoring cancels obsolete asynchronous results.

## ADR 007 — recoverable care and bounded progression

**Problem:** always-positive wildness guarantees every bond expires. Scaling XP/max HP by wellbeing causes destructive stat feedback. Squared lifetime-XP differences permit runaway rewards.

**Decision:** neglect increases wildness; sustained care reduces it. Keep maximum HP and earned XP independent of wellbeing; retain minimum movement. Award bounded level-based XP once per encounter. Defeat supports recovery.

**Consequence:** the reference is a forgiving persistent ecology, not an irreversible survival/extinction simulator. Tune coefficients in policy/content and update boundary tests together.

## ADR 008 — exact two-slot carried inventory

**Problem:** starting equipment and creature-care supplies can silently turn a strict two-slot design into several hidden inventories.

**Decision:** two item instances total, no stacks or separate equipment bag. Origin clothing/bonuses are passive; attacks innate; held tools use a slot. Crafting writes left and clears right atomically.

**Consequence:** players must use/drop/combine items deliberately. Recipe reachability and full-hand conservation deserve dedicated tests; an equipment expansion is a product change, not a convenient implementation detail.

## ADR 009 — coherent versioned snapshots, not full event sourcing

**Problem:** separate world and memory saves can restore inconsistent histories. A complete event-sourced simulation adds substantial replay/version complexity.

**Decision:** validate a coherent worker snapshot, regenerate versioned terrain, restore deltas, and store two checksummed transactional checkpoints. Include NPC memory/commitments in the same payload. Keep bounded diagnostic events and persistent milestone IDs.

**Consequence:** derived paths/queues are recomputed and unfinished offers canceled. Checksums detect accidental corruption, not tampering. Export/import is the recovery path for cleared/quota-constrained browser storage.

## ADR 010 — 2D height surfaces and replaceable placeholder presentation

**Problem:** “2.5D” can imply incompatible physics/render stacks and uncontrolled asset work.

**Decision:** one elevation per tile, explicit ramps, cliff faces, stable foot-depth sprites, Pixi v8, opt-in synthesized audio and bounded weather/lights. The original 480×270 placeholder presentation is superseded by ADR 015.

**Alternatives:** isometric projection or a true 3D world would change navigation, collision, picking, asset production, and rendering. They are not hidden requirements of a top-down height game.

**Consequence:** stacked walkable floors and a graphical content editor are future features. Presentation quality can be disabled without changing authoritative outcomes.

## ADR 009 — shared bodies and independent controllers

**Problem:** separate player, NPC and wildlife bodies duplicate positions and physiological/combat rules; NPC care exemptions make visible survival behavior meaningless.

**Decision:** one `EntityStore` owns all living bodies. Player, villager and wildlife controllers submit intents over shared movement/resources/damage. Small accessor adapters preserve ergonomic APIs without duplicate state. Species, elemental affinity, diet, Nature and relationships remain independent components. Stable uint32 IDs resolve to reusable slots, and transport has a Uint32 ID view.

**Alternatives:** inheriting player/NPC classes from a creature class couples unrelated inventory/memory features. Keeping separate bodies and synchronizing copies permits disagreement. Treating slot indices as identities prevents safe wildlife replacement.

**Consequence:** save v3/content v2 migrate old indices once while retaining generator v1. Human IDs remain fixed for the authored cast; new wildlife receives a fresh ID. [Unified contracts](unified_entities.md) and a captured real v2 fixture validate the change.

## ADR 010 — latched fatigue and whole-world sleep acceleration

**Problem:** releasing forced sleep after its first positive tick causes oscillation; jumping the clock skips hunts, resource use and social schedules.

**Decision:** Rest is the fifth shared need. A forced obligation survives emergency waking until 50% recovery. Accelerate by repeating ordinary fixed ticks, checking safety after each. Pause/restore return to 1×. Network budgets and deadlines remain real-time; background starts/proposals wait.

**Alternatives:** making exhaustion uninterruptible traps sleepers in combat or starvation. Calendar jumps and local-only acceleration create inconsistent ecology. Resetting needs for sleeping NPCs hides resource shortages.

**Consequence:** deterministic survival remains operational during model outages and acceleration. Safe fast-forward can stop immediately, so 8× is a user-selected maximum rather than a throughput promise.

## ADR 011 — relationship-based predation and finite provenance

**Problem:** exclusive predator/prey categories cannot describe defensive herbivores or predators hunted by other predators. Generic processed meat can accidentally permit cannibalism; reviving eaten wildlife duplicates food and identity.

**Decision:** separate attack eligibility, temperament, edible species and hunger. Humans/companions are protected. Mortal wildlife yields one finite carrion record and a delayed replacement vacancy. Food retains originating species through recipes. Births require species/habitat/resource/global capacity and use new IDs. NPC pantries/gifts consume finite supplies; NPCs have no personal inventories.

**Alternatives:** automatic revival plus carrion creates food duplication. Universal hostility makes fed predators attack indefinitely. A full reproductive genetics or logistics simulation adds cost without being needed for this reference food web.

**Consequence:** player assaults provoke remembered, bounded nonlethal conflict without XP. Agreed duels retain their separate daily rule. Population outcomes need the full 28-day seasonal soak, not just a short combat demo.

## ADR 015 — HD projection and identity-safe shared art pipeline

**Decision:** adopt a 1920×1080 reference view and 64-pixel display grid while retaining logical simulation units and save-v3. Validate canonical art bindings and clip metadata with Zod; compile standard independent Pixi atlas pages with official AssetPack, padding and no rotation. Art owns source exports, engineering owns generated outputs. Expose only disposable poses and bounded sequenced cues from the worker.

**Alternatives rejected:** enlarging prototype sprites as finished HD art; filename/village-number identity inference; automatic diagonal rotation; per-actor animation tickers; putting damage timing in animation data; changing tile coordinates or saves to fit display pixels.

**Consequences:** native target scene and player/Rivallie proofs must precede bulk production. Missing or incomplete HD clips block visual acceptance, while explicit prototype fallbacks keep the full world playable. Texture leases and adaptive quality bound presentation cost separately from simulation/inference. See [HD specification](hd-presentation.md).

## ADR 016 — explicit equipment and committed ammunition

**Problem:** modular clothing and ranged weapons must not create hidden inventory space or duplicate arrows after interruption or restore.

**Decision:** keep two carried slots and six worn slots. Equipping atomically exchanges item instances. NPC combat loadouts accept weapons and finite ammunition only. A bow reserves one charge at attack start and consumes it once at authoritative release; interruption cancels the reservation. Fixed-tick swept projectiles resolve their first valid collision. Save v4 persists both reservations and committed release state.

**Alternatives rejected:** an implicit quiver, resources in NPC pockets, ammunition consumed by artwork, recoverable arrows before a pickup conservation model, and changing base HP/XP when garments change.

**Consequences:** equipment changes are blocked during incompatible attacks. NPC resupply consumes settlement stock; fletching consumes real flint and reeds. Sprite layers share one pose sample and do not decide combat timing.

## ADR 017 — globally simulated pocket scenes

**Problem:** interiors can duplicate actors, pantry quantities and ecology if implemented as independent game instances.

**Decision:** maintain one entity store and clock. Stable scene IDs map to compact saved membership codes. Transfers revalidate proximity, access and the destination before changing the existing body atomically. Spatial queries, navigation, resources, combat and perception use scene membership. Interior pantry service points reference the exterior settlement account. Caves receive individuals from the same global population budget.

**Alternatives rejected:** copying an NPC indoors, pausing distant scenes, duplicating pantry stock, changing existing outdoor footprints, or granting access because dialogue prose mentions an invitation.

**Consequences:** exits remain usable after permissions expire. Preloading leaves the actor in the source scene without invulnerability. Disposable terrain copies accompany scene changes over the worker boundary; authoritative arrays remain owned by the worker.

## ADR 018 — hybrid authoring with revision-bound approval

**Problem:** reproducible primitive drawings do not establish the desired visual quality, and frame counts cannot certify identity or genuine animation coverage.

**Decision:** support recorded Pillow construction, Blender bakes and master ingestion through explicit offline inputs and pinned toolchains. Source manifests distinguish proofs and candidates. Engineering approval binds the complete dependency digest, including scripts, models, palettes and pose metadata. Partial candidates remain review assets and cannot replace working gameplay clips.

**Alternatives rejected:** a global single-atlas limit, automatic approval from an HD declaration, running arbitrary source commands during compilation, or treating deterministic hashes as aesthetic approval.

**Consequences:** art can produce assets independently while engineering compiles multi-page catalogs. Normal builds need committed exports, not Blender, model downloads or neural matting. The latest handoff audit and unresolved source-pipeline corrections are recorded in [the alignment response](art/engineering-alignment-response.md).
