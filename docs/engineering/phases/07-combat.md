# Phase 7 — real-time combat and bounded progression

## Components and contracts

Complete implementation: [combat.ts](../../../src/domain/combat.ts). Move data: [definitions.ts](../../../src/content/definitions.ts). Integration: [simulation.ts](../../../src/domain/simulation.ts).

| Component/value                | State / responsibility                                           | Interface and invariants                                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AttackDefinition` / `ATTACKS` | Player attack timing, power, stamina, range                      | Data defines windup/active/recovery in ticks. Physical strike and origin-element attack share the same state machine.                                       |
| `CREATURE_MOVES`               | One attack and defensive cadence per species/micro-type          | Distinct names, powers, ranges, cooldowns, and guard periods. Content changes do not require creature subclasses.                                           |
| `CombatStateMachine`           | Player's current attack record                                   | `start`, `phase`. No overlapping attack; stamina is consumed once. Hit entity IDs are retained throughout that swing.                                       |
| `HitDetectionSystem`           | Broad-phase and exact attack arc/range checks                    | Query spatial candidates, then test actual position, facing, ownership, HP, and previous hits.                                                              |
| `ElementPolicy`                | Pure macro-element matchup                                       | Strong 1.5, neutral 1, resisted .75; dual defenders average. Hybrid companion attacks average attacker-element matchups too.                                |
| `DamagePolicy`                 | Pure bounded damage calculation                                  | Defense attenuation, wellbeing effectiveness, guard reduction, minimum one damage. No HP or XP mutation inside the calculator.                              |
| `PartnerCombatController`      | Companion target and defensive cadence selection                 | Select only a living valid enemy; shared movement executes the resulting goal. Defensive windows are tick-driven.                                           |
| `EncounterService`             | Encounter identities, resolution, current duel/target            | `open`, `startBattle`, `resolve`, `retreat`, snapshot/restore. Rewards are issued only for an unresolved encounter. Daily eligibility is consumed at start. |
| `ProgressionService`           | Pure level/reward calculations                                   | Bounded reward uses levels, not squared lifetime-XP differences. Maximum level 50.                                                                          |
| `CombatSystem`                 | Actor integration, attack deadlines, damage and encounter events | `attack`, `advance`, snapshot/restore. Emits hit/victory/rescue receipts for the host to commit/observe.                                                    |
| `PlayerState`                  | Body accessor view plus origin, dash/attack timers               | Separate maximum HP and current HP; rendering never changes either.                                                                                         |

## Timing and hit flow

A physical strike has four windup ticks, two active ticks, nine recovery ticks, range 2.2 tiles, and costs five stamina. An elemental strike has seven windup, three active, sixteen recovery ticks, range 3.5, and costs sixteen stamina. Stamina regenerates through simulation ticks.

During active ticks, gather nearby candidates, check exact current range/facing, reject protected ownership targets, and record each hit identity before applying damage. An entity cannot be hit again by the same swing merely because rendering runs faster. Human assaults and attacks on NPC companions outside a duel remain nonlethal/protected and grant no XP. Nature selects retaliation or flight; active violence prevents dialogue.

Dash costs 22 stamina, moves in substeps, and gives a short tick-based invulnerability window. Wind origin reduces dash cooldown. Terrain collision remains authoritative even during invulnerability.

Player elemental attacks also enqueue environmental effects from Phase 2. Cosmetic slash rings and particles are not hitboxes.

## Damage and progression formulas

```text
damage = max(1, floor((power + attack × .6)
         × elementalMultiplier × max(.25, wellbeing)
         × (guarded ? .5 : 1) × 20 / (20 + defense)))

reward = round(clamp(24 × 2^(clamp(opponentLevel - ourLevel, -4, 4) / 2), 3, 96))
level  = min(50, 1 + floor(sqrt(max(0, experience) / 25)))
```

These reference values are deliberately bounded and data-oriented. They remove the old runaway squared-XP reward. Progression never scales previously earned XP by wellbeing. Winning can grant XP to both player and active partner; encounter resolution prevents duplicate awards.

## Encounter lifecycle and failure handling

Player wildlife encounters begin on a valid hit. Nature determines retaliation or flight. Diet and satiety independently enable autonomous hunts, while authored aggression can trigger territorial conflict without a food reward. The partner moves toward the active target, uses its authored attack/cooldown, and returns to following when the encounter ends.

NPC battles require an eligible villager, a player companion, nearby actors, no current duel, a ready NPC partner, and an unused absolute-day allowance. The villager watches rather than walking back to work during the duel. Closing or abandoning combat does not refund the daily allowance.

Defeated humans and companions receive a recovery deadline through `NeedsSystem` and retain identity/ownership. Killed unbonded wildlife instead retires and produces finite carrion. Autonomous hunting grants food, not XP; human assaults grant neither XP nor duel credit. Walking far enough away ends an encounter without granting a victory reward. Player defeat resolves active encounters, returns the player and companion to their origin, restores basic health, and preserves belongings.

Combat state and attack deadlines are saved. A restored encounter does not replay its reward. LLM inference cannot run the damage function, waive daily eligibility, or change a target's stats.

## Complexity and verification

Hit detection O(bounded spatial candidates). Combat advancement scans living bodies for stamina, bounded acquisition candidates and active stable-ID pursuits; historical encounter records are capped at 256. No all-pairs target search is used. Damage/matchup/reward operations are O(1) for one/two elements. Local partner attacks use per-actor tick deadlines.

[mechanics.test.ts](../../../tests/mechanics.test.ts) checks matchups, bounded rewards, one-time resolution, daily limits, and dash collision. [simulation.test.ts](../../../tests/simulation.test.ts) checks pause/session integration and checkpoint fidelity. Browser controls exercise real attack commands independently of render timing. Add a content test whenever a new move changes hit count, range, or interruption behavior.

Generic pairwise combat, stable-ID pursuit causes, hunting reservations, nonlethal human assault events, sleep interruption, and recovery/carrion transitions are specified with public contracts and tests in [unified_entities.md](../unified-entities.md#social-violence-and-encounters). All entities use the same element and damage policies; humans receive affinities from hometown/village.
