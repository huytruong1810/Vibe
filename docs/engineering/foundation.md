# Foundation — clocks, commands, persistence, lifecycle

## Components and contracts

| Component                  | Owns / public interface                                                                 | Invariant, lifecycle, and failure handling                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GameBootstrap`            | [main.ts](../../src/main.ts); browser adapters, event wiring, autosave                  | Only composition root knows rendering, networking, persistence, and worker together. Entry awaits renderer and local-model capability check. Disposal cancels owned work. |
| `WorkerBridge`             | [worker-bridge.ts](../../src/adapters/worker-bridge.ts); request IDs, promises, session | Replies resolve one request; deadlines and worker errors reject rather than hanging. Recycled render buffers cannot be authoritative state.                               |
| `SimulationHost`           | [simulation.ts](../../src/domain/simulation.ts); authoritative subsystem instances      | Serialized commands and ticks. Snapshots are independent copies. Restoration validates external state and clears transient work.                                          |
| `FixedStepClock`           | [core.ts](../../src/domain/core.ts); accumulator                                        | Fixed 1/30-second steps, maximum five per pump; paused time is discarded. Never derive care from wall-clock timestamps.                                                   |
| `PauseController`          | Token set; `acquire`, `release`, `paused`                                               | Idempotent tokens; releasing dialogue cannot release hidden-tab or menu pauses. Every owner releases its own token.                                                       |
| `SeededRandom`             | Serializable 32-bit stream state; `next`, `int`, `fork`                                 | Independent labeled streams avoid resource generation changing combat randomness. No domain `Math.random()`.                                                              |
| `CommandDispatcher`        | Session and at most 4,096 processed IDs; `accept`                                       | Reject obsolete sessions and repeated IDs before executing effects. Old bounded IDs are an operational replay window, not a permanent distributed transaction log.        |
| `ContentRegistry`          | [definitions.ts](../../src/content/definitions.ts); profile/species lookup              | Validate counts, identifiers, schedules, relationships, partners, and recipe references at startup. Invalid content fails visibly.                                        |
| `SaveCoordinator`          | [persistence.ts](../../src/adapters/persistence.ts); promise chain                      | Preserve checkpoint order; a failure does not poison later saves. UI reports manual/autosave failure.                                                                     |
| `IndexedDbSaveRepository`  | Database connection and checkpoint slots                                                | Validate before write/import, atomically rotate slots and metadata, recover newest intact slot. Both corrupt slots produce an explicit error.                             |
| Save schema and migration  | [save-schema.ts](../../src/domain/save-schema.ts)                                       | Bound arrays/text/import size; reject future versions, nonfinite values, duplicate identities, invalid partner references, or multiple player partners.                   |
| `BinaryHeap`, `RingBuffer` | [core.ts](../../src/domain/core.ts); queue/history storage                              | Stable priority order; bounded history. They are small concrete structures, not extensible frameworks.                                                                    |

## Authoritative data flow

`input → runtime schema → session/duplicate check → rule validation → mutation → event/receipt → render snapshot`.

The host's `submit` is the command phase. It runs synchronously on the owning worker between ticks. Model I/O never executes inside a simulation step. `agentResult` requires an inference issuer and a currently registered job; its inner payload passes a second subsystem schema and actor/memory revision checks.

The worker pumps the clock at approximately 60 Hz and sends disposable render snapshots at approximately 10 Hz. The main thread copies coordinates and returns their buffers through `recycle`; terrain arrays are also transferred only after being copied. Bounded buffer reuse avoids detaching the actual game state.

## Checkpoint algorithm

1. Request a coherent snapshot from the worker; schema-check it on the browser side.
2. Serialize once, compute a noncryptographic checksum, and open one read/write transaction covering checkpoints and metadata.
3. Read the current slot/revision, write the alternate slot with the next revision, and update the active pointer in that same transaction.
4. On restore, inspect both slots newest-first, verify checksum, parse/migrate/validate, and fall back to the other slot if needed.
5. Construct a replacement host from the seed, restore it, then swap it into the worker. An invalid incoming save must not dispose the current world first.

Raw saves are limited to 24 MB. Both NPC memory and simulation state are in the same checkpoint; the game does not restore a newer relationship summary onto an older world. Export is an explicit user download; importing validates before replacement.

Autosave requests occur every 30 real seconds during active play. An abrupt tab close can lose progress since the last completed save; asynchronous unload work is not treated as a reliable save mechanism. Manual save/export provide explicit completion feedback.

## Complexity and limits

- Random/clock/pause operations: O(1) average.
- Heap insert/remove: O(log n); ring append: O(capacity), with small fixed capacities.
- Command validation: O(payload size); deduplication O(1) average.
- Render packing: O(creatures + villagers); metadata transfer is bounded but measured separately.
- Checkpoint: O(dynamic state + changed tiles), plus JSON and database I/O. It runs outside the render loop.

## Verification

[core.test.ts](../../tests/core.test.ts) covers stream restoration, stable heap order, bounded history, nested pauses, clock catch-up, calendar identities, duplicate commands, and content integrity. [simulation.test.ts](../../tests/simulation.test.ts) covers freeze, stale replies, fallback, snapshot fidelity, array transfer ownership, and sustained movement. [persistence.test.ts](../../tests/persistence.test.ts) covers transactional round trips, corruption recovery, import errors, and retry after storage failure.

The browser journeys verify that these same contracts operate through a real worker and IndexedDB rather than a second test-only simulation.

## Entity/save compatibility extension

Save v3/content v2 retain generator v1. [EntityStore](../../src/domain/entities.ts) owns every living body and stable-ID lookup. Control/social records persist references, not duplicate HP or positions. The [v2 fixture](../../tests/fixtures/v2-save.json) exercises the frozen [legacy schema](../../src/domain/legacy-save.ts) and [v3 migration](../../src/domain/save-schema.ts). Sleep obligations, finite supplies, carrion and pending replacement deadlines are part of the same checkpoint. Disposable packets pool separate Float32 state and Uint32 ID views in one transferable buffer. Full lifecycle and failure contracts are in [unified_entities.md](unified-entities.md).
