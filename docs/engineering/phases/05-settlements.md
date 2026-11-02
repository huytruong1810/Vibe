# Phase 5 — two hands, content, settlements, schedules

## Components and interfaces

Source: [inventory.ts](../../../src/domain/inventory.ts), [definitions.ts](../../../src/content/definitions.ts), [world.ts](../../../src/domain/world.ts), [agents.ts](../../../src/domain/agents.ts).

| Component/value                              | Responsibility / owned state                                                      | Contract and invariants                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ItemDefinition` / `ItemInstance`            | Immutable capabilities / unique carried instance                                  | Item ID is not a count or a mutable definition. Instances are distinct; saves reject duplicate carried identities.                 |
| `InventoryState` / `TwoSlotInventory`        | Exact two-element nullable tuple and instance serial                              | `add`, `remove`, `swap`, `combine`, `restore`. No hidden bag, stacks, or equipment list.                                           |
| `RecipeRegistry`                             | Canonical unordered pair lookup and graph validation                              | Duplicate input pairs, input-regenerating recipes, cycles, and unreachable manufactured outputs fail at construction.              |
| `CraftingService`                            | User-facing crafting transaction                                                  | Reads both items, finds one result, writes left and clears right atomically. Invalid inputs remain unchanged.                      |
| Origin definitions (`VILLAGES`)              | Spawn, culture, element, passive bonus                                            | Origin is a player choice. Clothing does not consume a hidden equipment slot.                                                      |
| `SettlementDefinition` / `SettlementPlanner` | Three capitals, six outposts, footprints, roads, semantic destinations            | All activity destinations must be walkable and all centers connected. Houses and road corridors have distinct reserved footprints. |
| `NpcProfile` / `NpcProfileRegistry`          | Profile identity, persona, role, culture, relationships, partner, weekly schedule | Thirty unique content IDs. Runtime relationship changes do not rewrite immutable identity text.                                    |
| `NpcState`                                   | Entity reference, activity, social state, overrides, daily limits, memories       | Mutable per-world record. No inventory. Permanent partner reference agrees with the creature owner column.                         |
| `ScheduleExecutor`                           | Derived goals, transient paths, retry times                                       | `destination`, `advance`, `clearDerived`. Prioritize active following/personal commitments, then authored schedule.                |

## Recipe graph and inventory algorithm

Normalize pair keys by sorted item IDs, so `flint + stick` equals `stick + flint`. A valid combine creates a fresh item instance in hand 0 and empties hand 1. A failed lookup performs no mutation. Repeated identical ingredients require two actual instances.

The reference progression includes `flint + stick → tool-head WIP`, then `tool-head + fiber → hatchet`; two reeds create fiber. The graph validator walks ingredient-to-result edges to reject cycles and performs fixed-point reachability from gatherable/base content. This prevents shipping an unreachable WIP chain or an accidental crafting loop.

Pickup, use, drop, and swap are separate typed commands. A tool is active while held. Using eligible food/water consumes that held item and restores shared satiety/hydration as well as basic recovery; poultices heal HP; using a nonconsumable reports its intended role. Drops are physical world records and can be collected again.

## Settlement and schedule data flow

Settlement placement is constrained procedural generation: authored anchor sites and building templates are embedded into seeded geography, rather than hoping noise creates enough buildable towns. Each settlement has protected roads and resources. The world map supports travel only from a settlement waystone and outside an active encounter.

An NPC schedule is a seven-element weekly array. Each day contains sorted hour boundaries mapped to semantic `home`, `work`, `square`, `shrine`, or `outpost` destinations and a descriptive activity. Coordinates are resolved by the settlement planner. Schedule entries do not directly set animation or teleport NPCs.

`ScheduleExecutor` selects the latest applicable entry and requests an actual path when its target changes. NPCs can arrive late; lateness never snaps them to the destination. Blocked destinations use cooldowns and retry. Temporary following or personal overrides expire into the current schedule entry, not an obsolete saved waypoint. Tomorrow-only overrides are keyed to an absolute day.

Villagers have no carried inventories. Food is consumed at forage/pantry sources without creating hidden storage. Gifts withdraw finite settlement stock as well as using authored daily allowances validated in Phase 6. Villager partners have permanent ownership and are moved through shared terrain rules.

## Complexity, lifecycle, and edge cases

- Inventory/lookup operations O(1) with two slots; graph validation O(items + recipe edges), plus a small fixed-point pass at startup.
- Schedule selection O(entries per day), a small authored constant; path costs follow the shared incremental budget.
- Settlement generation O(reserved areas + road lengths); connectivity proof O(road graph).

Restoring preserves item serials, current inventory, NPC positions, daily battle/gift days, tomorrow overrides, and commitments. Derived path state is recomputed. Clearing an override during a conversation cannot let time advance; pause ownership remains in the host.

## Verification

[core.test.ts](../../../tests/core.test.ts) checks profile/relationship/schedule integrity. [world.test.ts](../../../tests/world.test.ts) verifies all settlement routes. [mechanics.test.ts](../../../tests/mechanics.test.ts) covers every recipe in both orders, WIP progression, invalid pairs, full hands, ambiguous recipes, and cycles. [Browser journeys](../../../tests/browser/journey.spec.ts) verify all nine waystones, actual villager interaction, and save/resume of committed state.

Animal-food instances carry originating species through unordered crafting, dropping, harvesting and consumption. `meat + nectar → meal` unions input provenance; processing cannot authorize cannibalism. Settlement pantries, springs, beds and deterministic survival preemption are documented in [unified_entities.md](../unified-entities.md#finite-food-and-predation). Schedules resume from the current time after needs, sleep or tactical danger interrupt them.
