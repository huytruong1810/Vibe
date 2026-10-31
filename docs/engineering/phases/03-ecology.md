# Phase 3 — calendar, collective movement, simulation tiers

## Components and interfaces

The implementation lives in [core.ts](../../../src/domain/core.ts), [creatures.ts](../../../src/domain/creatures.ts), and [navigation.ts](../../../src/domain/navigation.ts).

| Component               | Responsibility / state                                      | Contract and invariants                                                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `WorldCalendar`         | Elapsed simulation seconds                                  | Derive absolute day, weekday, season, hour, and label. A day lasts 1,440 real simulation seconds. Daily limits use absolute day, never weekday.                                                  |
| `SeasonSystem`          | Pure authoritative weather derivation                       | `weather(calendar)`. Deterministic petals/clear/leaves/snow or rainy days; no particle count feeds back into weather. Regrowth and herd goals use the same season.                               |
| `SpatialIndex`          | Uniform buckets of all living entity slots (transient only) | `clear`, `insert`, `query`; fixed cell size eight tiles, bounded returned candidates. Exact range checks follow broad-phase lookup.                                                              |
| `SimulationTierManager` | Detailed identity list and tier bytes                       | `update(store,player)`. Enter within 23 tiles; retain until 28; sort by distance/stable ID; cap at 128. Player partner gets priority.                                                            |
| `SteeringSystem`        | Pure local flock vector                                     | Combine nearby same-herd separation, alignment, cohesion. Inspect at most 32 broad-phase neighbors.                                                                                              |
| `HerdController`        | Bounded herd target cache/cursor                            | Choose at most eight herd goals per second from food/water candidates; retain a goal for up to 90 seconds and reconsider on season change.                                                       |
| `PopulationDirector`    | Habitat spawning, seeded ecology stream, distant movement   | `seed`, `migrate`. Spawn same-species clusters of up to six. Keep existing identities; no unbounded reproduction. Distant movement uses actual surface collision and real resource availability. |
| `NavigationService`     | Incremental path searches and cache                         | Shared global expansion budget, bounded cache, explicit unreachable state, revision invalidation. Used by detailed creatures and villagers.                                                      |

## Collective behavior algorithm

For a creature and nearby same-herd neighbors, sum:

- Separation: inverse-distance repulsion for neighbors inside the personal radius.
- Alignment: a small contribution from average neighbor velocity.
- Cohesion: a small vector toward the local herd centroid.
- Goal seeking: direction toward the current need, companion, or migration target.

Normalize the combined desired vector, multiply by species speed and wellbeing effectiveness, then pass displacement through the shared terrain movement routine. Steering never authorizes crossing a cliff or wall. If direct movement stalls, request a path rather than increasing force until the creature tunnels through geometry.

Herd-level decisions select local food or water candidates using current need pressure. Distant migration takes small collision-checked steps toward these goals; it does not teleport across blocked terrain. This is a deliberate coarse approximation, not a complete ecosystem optimizer or optimal long-distance route planner.

## Update frequencies and transitions

| Work                                                           | Frequency/budget                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Nearby movement and combat                                     | 30 Hz                                                                     |
| Spatial/tier rebuild                                           | Every ten ticks                                                           |
| Detailed creature decisions                                    | Staggered roughly once per second per creature                            |
| Needs, distant ecology, regrowth, social encounter opportunity | Once per second                                                           |
| Herd goal choices                                              | At most eight per slow update                                             |
| Navigation expansions                                          | At most 800 per tick in the host                                          |
| Background LLM job opportunity                                 | Every 900 ticks; network scheduler additionally enforces real-time budget |

Tier transitions update a byte and an identity list, not a second copy of the creature. Position, HP, needs, ownership, XP, and recovery timers survive unchanged. Hysteresis avoids repeatedly switching near the boundary. Player-partner ownership remains singular in every tier.

## Recoverable ecology

Resources replenish on bounded seasonal timers. Coarse creatures can eat actual available forage, drink in freshwater, and bathe in compatible media; consumption updates shared quantities and regrowth deadlines. Empty habitat does not supply free food merely because it is off-screen.

Killed unbonded wildlife retires permanently and leaves finite species-attributed carrion. `EcologyService` records delayed vacancies and births new individuals with monotonically fresh IDs. Births require population space, species quotas, habitat, available food/prey and local carrying capacity. The two predators share a four-percent target; replacements cannot grow an unbounded predator population. Humans and companions recover without becoming food. The [unified ecology contract](../unified-entities.md#finite-food-and-predation) specifies the bounds and persistence rules.

## Complexity and failure modes

Spatial rebuild O(N), tier scan O(N) plus sorting nearby candidates, detailed steering O(detailed × bounded neighbors), and slow needs/ecology O(N). These replace all-pairs O(N²) flocking.

Incremental A* uses a stable binary heap, sparse g/parent/closed maps, Manhattan heuristic, and cardinal surface-valid transitions. A search stops after 16,000 expansions. Cached paths are revision-keyed, with at most 128 cache entries and bounded retained results. Failed destinations use retry cooldowns. Dynamic obstacles can invalidate derived paths; actual movement still checks every substep.

Dense herds intentionally approximate nearest-neighbor choice through bounded bucket candidates. This protects frame time but is not an exact global nearest-neighbor algorithm. Measure dense scenes separately from ordinary dispersed populations.

## Verification

[core.test.ts](../../../tests/core.test.ts) covers calendar and random streams; [world.test.ts](../../../tests/world.test.ts) covers bounded searches/indexes; [mechanics.test.ts](../../../tests/mechanics.test.ts) checks the 128-creature cap and identity preservation. [benchmark.ts](../../../scripts/benchmark.ts) reports simulation and snapshot costs separately. [soak.ts](../../../scripts/soak.ts) executes 28 full days across every season with repeated save validation and a final restore.
