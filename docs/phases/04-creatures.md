# Phase 4 — creature needs, utility decisions, care, partnership

## Components and contracts

Complete source: [creatures.ts](../../src/domain/creatures.ts). Species and moves are immutable content in [definitions.ts](../../src/content/definitions.ts).

| Component/value                       | Responsibility / owned state                                          | Interface and invariants                                                                                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CreatureDefinition` / `SpeciesId`    | Species identity, elements, diet, bathing medium, base stats, habitat | Definitions are separate from mutable instances. Eight nonhuman profiles plus human definitions; no inherited subclass per element combination.                                                                |
| `CreatureStateStore`                  | Shared entity IDs and typed state columns                             | `spawn`, `definition`, `position`, `wellbeing`, `maxHp`, `snapshot`, `restore`, `validate`. Capacity 2,048 wildlife plus 31 humans; snapshots contain bounded, validated entity records and a next-ID counter. |
| `NeedsSystem`                         | Shared decay, starvation, sleep, protected recovery, wildness         | `advance` uses elapsed simulation time. Returns broken player partnership IDs. Never deletes a creature while another system retains its identity.                                                             |
| `WellbeingPolicy`                     | Pure effectiveness and wildness calculations                          | Exact quartile thresholds, .25 movement floor, care recovery, neglect accumulation. Does not mutate XP or maximum HP.                                                                                          |
| `CreatureDecisionSystem`              | Utility commitments, transient paths and retry cooldowns              | `decide`, `move`, `clearDerived`. Select need goals, reserve resources, request paths; failure cannot cause unlimited same-tick replanning.                                                                    |
| `CreatureMode`                        | Explicit behavior states                                              | Wander, Feed, Drink, Bathe, Socialize, Follow, Combat, Rest, Flee. Combat/defeat interrupt ordinary need planning; unused optional states remain explicit enum vocabulary, not a behavior-tree framework.      |
| `CareInteractionSystem`               | Item/range/diet/media validation and effects                          | `interact` consumes one matching item on success. NPC-owned partners cannot be retamed. Failed care leaves inventory intact.                                                                                   |
| `PartnershipService`                  | One-player-owner rule                                                 | Query partner, `tame`, `release`. Ownership is stored once in the creature column; UI selection is never ownership.                                                                                            |
| `moveOnTerrain` / `creatureTraversal` | Shared movement primitives                                            | Substep displacements at most .2 tile, validate each axis against surface capabilities, prevent tunneling.                                                                                                     |

## Data representation

All living bodies use [EntityStore](../../src/domain/entities.ts). `CreatureStateStore` is a compatibility alias for nonhuman systems over that same instance. Positions, velocities, HP, five needs, stamina, targets and timers use numeric columns; XP uses Float64. IDs are uint32 and map to reusable slots. Owner is `-1` wild, or the actual owner human entity ID. NPC partner references also use IDs, not offsets or storage slots.

Species definitions provide durable base stats; human affinity is chosen independently. Maximum HP is `base.hp + 5 × (level - 1)`. Only unbonded wildlife can retire into edible carrion. Humans and bonded companions retain identity through recoverable defeat. See [the full contracts, sleep transitions and failure rules](../unified_entities.md).

## Need and wildness formulas

Needs are normalized to `[0,1]`. Per second before fatigue/sleep multipliers, food loses `1/1800`, water `1/1400`, cleanliness `1/2100`. Rest loses `1/960` awake and gains `1/480` asleep. Recreation depends on ownership, social context, and walking near the player. NPC partners have no care exemption. Deterministic survival seeks and consumes actual supplies, forage, water and rest.

Average wellbeing is the arithmetic mean of the five needs. Combat tiers are 0, .25, .5, .75, 1 using the explicit boundaries in the master plan. Movement effectiveness is at least .25. Food or water at zero causes .25 HP loss per second. Healthy wellbeing slowly regenerates HP.

For a player companion:

```text
stress   = max(0, .60 - wellbeing) × .003
recovery = wellbeing >= .75 ? .001 : 0
wildness = clamp(wildness + (stress - recovery) × dt, 0, 1.01)
break partnership when wildness > 1
```

Correct food adds .30 trust; water adds .18; petting adds .08 after initial trust reaches .20. Taming requires at least .50 trust, a living wild creature within three tiles, and no existing player partner. These are tunable reference balance values, not hidden model decisions.

## Decision and care flow

1. Protected and migrated downed actors wait for recovery. Killed unbonded wildlife retires into carrion.
2. Sleep and deterministic survival interrupt ordinary following and schedules. Combat executes shared tactical rules; surviving partners return to care/following afterward.
3. For wild creatures, respect a short commitment unless food/water becomes critical.
4. Score wandering and unmet needs; add a switching margin before replacing the current choice.
5. Find nearby compatible candidates, reject nontraversable targets, reserve a candidate, and request a bounded path.
6. Move using goal/path direction plus herd steering. Validate actual terrain on every substep.
7. Consume real food at the goal; restore water/cleanliness only in compatible media. Expired reservations and failure cooldowns prevent permanent locks.

Hand-feeding/watering consumes the item only after range and compatibility checks. Bathing requires the species medium. A poultice restores HP and cancels an outstanding recovery delay. Release and neglected partnership loss preserve identity and remembered trust.

## Complexity and lifecycle

Store access O(1); care/taming O(two inventory slots + partner scan); global needs O(N) each slow update. Goal selection queries bounded local candidates and submits incremental navigation rather than doing full A* in one decision. Movement/steering cost scales with the capped detailed tier.

Derived paths and cooldown maps are cleared on restoration and pruned when an entity retires. They do not form a second source of ownership or needs. The snapshot includes target/commitment values and sleep obligations, so restoring does not reset every creature to a freshly fed spawn.

## Verification

[mechanics.test.ts](../../tests/mechanics.test.ts) exercises threshold edges, wildness recovery, invalid diets, exact item consumption, single-partner ownership, declining NPC needs and damageable HP, tame break, tier identity, and collision substeps. [simulation.test.ts](../../tests/simulation.test.ts) validates long-running finite state and full snapshot fidelity. The [browser scenario](../../tests/browser/journey.spec.ts) imports a validated encounter, offers actual carried reeds/water, pets, tames, and displays unlocked companion stats.

`SleepSystem`, `NatureRules`, `SurvivalController` and `EcologyService` contracts, owned state, complexity, lifecycle and tests are detailed in [unified_entities.md](../unified_entities.md). [entities.test.ts](../../tests/entities.test.ts) covers the additional five-need, sleep-latch, provenance, protection, identity and migration invariants.
