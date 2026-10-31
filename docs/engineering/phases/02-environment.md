# Phase 2 — resources, gathering, regeneration, reactions

## Reference implementation and contracts

Use [resources.ts](../../../src/domain/resources.ts), [surface rules](../../../src/domain/world.ts), and the [host's interaction commands](../../../src/domain/simulation.ts). Item and species capabilities are data in [definitions.ts](../../../src/content/definitions.ts).

| Component                     | Owned state / responsibility                | Public behavior and invariants                                                                                                                                                                 |
| ----------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ResourceStore`               | Logical resources and bounded ground drops  | `item`, `consume`, `drop`, `restore`. Resource kind and remaining quantity are independent. Drop IDs remain unique across restore; no more than 512 dropped objects.                           |
| `ResourceLocator`             | Chunk buckets and temporary reservations    | `find`, `reserve`, `release`. Query by item/medium, filter depletion and other owners' live reservations, rank local candidates by distance. Reservations expire after ten simulation seconds. |
| `HarvestSystem`               | Pickup/harvest transaction rules            | Gather nearest reachable-range drop/resource or freshwater. Validate inventory capacity before decrementing a resource. Ore requires a held hatchet.                                           |
| `RegrowthSystem`              | Deadline heap and tracked depleted indices  | Discover changed depleted resources; restore quantity only after the deadline and outside active burning. Seasonal yield is explicit.                                                          |
| `SurfaceRules`                | Traversal and species bath-medium semantics | Freshwater, saltwater, sand, mud, lava, ice, and solidity share one logical source. Pixel colors never decide whether a tile is traversable.                                                   |
| `EnvironmentalReactionSystem` | Bounded queue and active timed cells        | `enqueue`, `advance`, `snapshot`, `restore`. At most 2,048 pending reactions and 32 processed per tick. New spread waits for a later queue generation.                                         |
| Interaction routing           | The host's typed command switch             | Owns authorization/order for gathering, dropping, using, elemental reactions, and care. An extra generic `InteractionResolver` facade is unnecessary; concrete rule services do the work.      |

## Data model

Per tile: resource content ID, quantity, regrowth deadline, terrain flags, fluid, reaction deadline. A tile can simultaneously have terrain, a fluid, a resource, and occupants without overloading a single byte. Dropped items are separate bounded world records, not an extra inventory.

`ResourceLocator` builds chunk-keyed buckets once from deterministic content. Depleted entries remain indexed and are filtered on query, allowing regeneration without rebuilding every bucket. Medium fields are sparsely sampled; authored village wells are always indexed. Candidate lists are bounded to eight by default.

Existing resource identity is fixed in the reference. Adding a system that creates a brand-new resource on a formerly empty tile must also update the locator, not merely write a resource byte.

## Algorithms and transaction order

**Harvest:** prefer a ground drop within range; otherwise collect nearby resource candidates and rank by squared distance. Verify tool requirements, then attempt inventory insertion. Consume quantity only after insertion succeeds. If no resource exists, adjacent freshwater can fill an empty hand with a single spring-water item.

**Regrowth:** the first depletion sets `regrowAt = now + 180`. Burning delays recovery. Yield is one unit in winter, four in summer, three otherwise. Mining shares this recoverable reference-game rule; a finite geological economy would need a separate depletion policy.

**Fire:** nonprotected, nonfluid cells can burn, lose resource quantity, and enqueue neighboring combustible resources with a decreasing spread depth. Burning lasts eight seconds; destroyed resources wait longer to regrow. Fire damage is applied through simulation state, never particles.

**Freezing/thawing:** freshwater or saltwater becomes walkable ice for a timed period; traversability changes invalidate navigation. Thaw removes the flag and invalidates paths again. Critical settlement/road cells reject destructive reactions.

**Shock:** traverse adjacent fluid cells through the bounded queue and decreasing depth. Returned affected cells are resolved against exact nearby creature positions for damage. The propagation depth and queue limit prevent a whole ocean update from blocking one tick.

Origin elemental attacks enqueue their corresponding terrain reaction ahead of the player while normal combat executes separately. Presentation effects cannot directly change these layers.

## Complexity, lifecycle, and failure modes

- Locator construction O(world area); query O(visited buckets + local candidates), bounded to three chunk rings.
- Pickup O(nearby drops + fixed local tiles); dropped items are capped.
- Heap operations O(log depleted resources); regrowth advances at most 64 ready entries per slow update.
- Reaction processing O(per-tick budget + active timed cells), bounded queue/spread depth. Queue and active timers restore from saved state.

Full hands, missing tools, missing resources, and invalid combinations fail without partial item consumption. Expired reservations release naturally. An unreachable candidate is handled by navigation/decision cooldowns, not infinite same-tick search. Protected roads prevent environmental effects from permanently closing essential routes.

## Verification

[mechanics.test.ts](../../../tests/mechanics.test.ts) covers resource conservation, full hands, recipe atomicity, timed regrowth, protected cells, ice expiry, and queue bounds. [world.test.ts](../../../tests/world.test.ts) checks shared surface rules and navigation invalidation. The browser care journey consumes real carried resources through the worker command boundary.

## Unified entity integration

The [shared entity specification](../unified-entities.md) defines body authority, stable identity transport, needs/sleep interrupts, finite supplies, food provenance and generic combat. Terrain generation remains version 1. Resource quantities remain authoritative; model proposals cannot bypass dietary, supply, survival or combat rules.
