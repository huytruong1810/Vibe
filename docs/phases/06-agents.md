# Phase 6 — agentic villagers, memory, grounded actions

## Complete implementation

The domain implementation is [agents.ts](../../src/domain/agents.ts), actor-scoped perception is [query.ts](../../src/domain/query.ts), and model/network scheduling is [inference.ts](../../src/adapters/inference.ts). The host integrates them through [typed commands](../../src/domain/contracts.ts). [Authored personas](../../src/content/villagers.ts) supply thirty individual backgrounds rather than thirty copies of one prompt.

| Component                             | State / responsibility                                   | Contract, lifecycle, and failure behavior                                                                                                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NpcProfileRegistry`                  | Immutable identity lookup and initial runtime records    | Create all villagers with validated culture, role, partners, social web, and weekly schedules.                                                                                                                                                      |
| `WorldQuery`                          | Actor-scoped read adapter over authoritative state       | Describe only nearby people/creatures, known destinations, eligibility, current time/weather. No model receives the whole save.                                                                                                                     |
| `ObservationFilter`                   | Perception eligibility                                   | Local witness radius and bounded event-ID deduplication. A remote event does not become universal knowledge.                                                                                                                                        |
| `PerceptionSystem`                    | Committed facts → attributed memories                    | Append event descriptions with event source IDs only for witnesses. It does not make every model utterance a fact.                                                                                                                                  |
| `MemoryRepository`                    | Record identity/revision, summary, bounded raw records   | Append, token estimate, compaction trigger/commit. Retain conversations until successful compaction; discard only eligible low-importance observations at quota. Refuse additional conversation storage rather than silently deleting source turns. |
| `MemoryRetriever`                     | Pure bounded ranking                                     | Retrieve by lexical relevance, recency, importance, stable tie order. No embedding server or vector database is required.                                                                                                                           |
| `ReflectionService`                   | Evidence-checked synthesis commit                        | Require current memory revision and supplied source IDs; append reflection as reflection, never as a witnessed fact.                                                                                                                                |
| `PlanService`                         | Job construction and fair background candidate selection | Ground prompts in persona, facts, retrieved records, summary, commitments. Compact first when needed; otherwise choose an overdue plan/reflection candidate.                                                                                        |
| `SocialEncounterSystem`               | Local social cooldown and information diffusion          | At most one encounter per slow update. Share witnessed high-importance facts as attributed hearsay, preserve root source IDs, never rebroadcast hearsay as a new fact.                                                                              |
| `AgentActionValidator`                | Model proposal authorization                             | Validate range, identifiers, known locations, daily allowance, state, and capability; execute bounded effects only on commit.                                                                                                                       |
| `InferenceProvider` / `OllamaAdapter` | Loopback HTTP boundary                                   | Model discovery, structured capability check, bounded JSON response, abortable generation, token usage. Loopback URLs only; no browser API secrets.                                                                                                 |
| `InferenceScheduler`                  | Queue, active abort controller, real-time rate window    | One in-flight request, at most 16 queued, dialogue priority/preemption, two background starts/minute. Reset aborts obsolete-session work.                                                                                                           |
| `DialogueState` / `Commitment`        | Paused interaction / persistent promise                  | Dialogue stores bounded lines, staged actions, pending job. Commitments store participants, place, time window, status, evidence independently of summaries.                                                                                        |

## Observation, retrieval, reflection, planning

Memory records contain ID, tick/day, kind, text, subjects, importance, and source IDs. Distinct kinds are `fact`, `hearsay`, `reflection`, and `conversation`.

Retrieval uses:

```text
score = 3 × lexical_overlap(query, record)
      + importance / 10
      + exp(-max(0, currentTick - recordTick) / (30 × 1440))
```

Rank and take twelve records. This is an inexpensive baseline for a small world, not semantic equivalence to the research system's embedding retrieval. Source IDs make assertions inspectable. A later embedding adapter can change relevance ranking without replacing memories, commitments, or simulation authority.

Villagers always have authored schedules. A background plan can temporarily choose a known location/activity for 30–180 simulation seconds. Physiological survival, sleep, tactical danger and existing obligations take precedence. Plans cite supplied memories; invalid targets or invented evidence are rejected. No model call is made for each movement tick. Actor-scoped facts include actual needs and current finite gift availability.

Reflection requires enough salient experience and a cooldown. It synthesizes patterns with citations to existing record IDs. Social encounters use local proximity/cooldowns and copy root evidence as hearsay; they do not recursively enqueue other LLM calls. This provides visible social continuity while avoiding inference cascades.

## Structured outputs and action authorization

Zod definitions are the shared source for runtime parsing and JSON Schema sent to Ollama. [Ollama's structured-output documentation](https://docs.ollama.com/capabilities/structured-outputs) describes schema-constrained generation, but semantic validation remains the game's responsibility.

Dialogue responses contain bounded `dialogue`, an emotion enum, and exactly one discriminated `action`. There is no required free-form internal `thought` field.

Prompt construction targets at most 2,800 estimated input tokens within the configured 4,096 context. Optional facts/summary/commitment context is reduced first, then whole memory records are selected. Serialized JSON is never cut mid-record. Jobs list only source IDs actually supplied, so compaction cannot evict an unseen record merely because it was originally a candidate. Token estimation remains a heuristic; schema and game-rule validation still protect the world when a model fails.

| Action                      | Required data and concrete authorization/effect                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NONE`                      | No extra fields; dialogue alone.                                                                                                                                                  |
| `FOLLOW_PLAYER`             | Duration 5–180 seconds; start following after conversation release, terrain-aware path execution.                                                                                 |
| `MOVE_TO_LOCATION`          | Semantic destination and duration; resolve the villager's actual destination, reject blocked locations, create temporary override.                                                |
| `DROP_GIFT`                 | Only berries/water/fiber; nonnegative affinity, unused daily allowance, bounded drop capacity, adjacent safe placement. Consume allowance only after successful placement.        |
| `OFFER_QUEST_MARKER`        | Known resource content ID; look up actual available nearby resource, then add a bounded marker. No invented quest entity.                                                         |
| `GOSSIP_RELATIONSHIP_SHIFT` | Existing third-party ID, tone, bounded claim; a fixed ±1 directed affinity change, not an arbitrary model-supplied delta.                                                         |
| `SCHEDULE_OVERRIDE`         | Tomorrow, known destination, start hour and duration; reject duplicate tomorrow obligation and plans extending into the sleep schedule. Create a separately persisted commitment. |
| `PARTNER_GESTURE`           | Existing permanent partner and supported gesture vocabulary; commit a short timed presentation gesture.                                                                           |

Malformed JSON, unknown fields, unsupported IDs, obsolete jobs/sessions, stale actor revisions, or failed prerequisites produce receipts and no unauthorized effect. A valid JSON response can still fail the game rules.

## Dialogue pause and asynchronous races

1. Player interacts within three tiles. Acquire the dialogue token in the worker, stop movement, and publish the acknowledged paused frame.
2. Record the player's text as conversation data; create a job with session, actor revision, memory revision, and evidence IDs.
3. Continue rendering/UI/network deadlines while all timed world systems remain paused.
4. Parse a response, append its spoken text as conversation, stage any action without claiming it occurred.
5. On close, cancel the pending reply, release only the dialogue token, revalidate staged offers, execute them serially, and publish committed/rejected receipts.
6. A battle is requested after dialogue release. A hidden/menu pause still prevents combat.

Background results arriving during a pause wait for world resumption. Results from a restored/closed session are ignored. An active-play timeout can produce deterministic fallback dialogue and a normally validated offer; startup and explicit resume still require the real model capability check.

## Compaction and provenance

Compaction triggers above ten conversation records (roughly five exchanges), approximately 1,500 conversation tokens, or high total record pressure. Token estimation is conservative UTF-8 bytes divided by three, not a claim of tokenizer accuracy.

Send an existing summary plus a bounded oldest source batch, retaining recent records. Commit only if the memory revision still matches and cited IDs belong to that batch. Replace the summary and evict the selected batch in one synchronous domain operation; the next database checkpoint persists them together. Failed/stale output leaves the source batch intact.

Structured promises are never evicted by prose compaction. A model can summarize poorly, misunderstand someone, or roleplay uncertainty; it cannot create a completed promise, item, relationship change, or physical event merely by mentioning it.

## Budgets, complexity, and evaluation

Perception O(villagers) per relevant committed event. Retrieval O(memory limit × query terms) plus a bounded sort. Social encounter search O(30²), an intentionally small fixed population. Context, response text, queue, records, heard IDs, commitments, and markers all have explicit caps.

Dialogue preempts background requests through cancellation. It has a 45-second generation deadline; background generation has 30 seconds. Cold-start capability checks have 60 seconds. These are failure bounds, not desirable UX targets. Queue budgets use real time, so accelerated simulation cannot flood Ollama.

Automated checks: [agents.test.ts](../../tests/agents.test.ts), [inference.test.ts](../../tests/inference.test.ts), [simulation.test.ts](../../tests/simulation.test.ts), and [browser journeys](../../tests/browser/journey.spec.ts). [The live smoke script](../../scripts/ollama-smoke.ts) checks an installed model without downloading one. Human evaluation must separately assess persona consistency, retained promises, useful plan changes, uncertainty, and multi-day social behavior; schema correctness alone does not establish believable autonomy.

## Unified entity integration

The [shared entity specification](../unified_entities.md) defines body authority, stable identity transport, needs/sleep interrupts, finite supplies, food provenance and generic combat. Terrain generation remains version 1. Resource quantities remain authoritative; model proposals cannot bypass dietary, supply, survival or combat rules.
