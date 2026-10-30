# Verification and measurement record

## Reproduce

```sh
npm ci
npm run assets:build
npm run check
npm run format:check
npm run test:browser
npm run benchmark
npm run benchmark:render
npm run soak
npm run test:ollama -- qwen2.5:3b
```

The unit/integration suite uses the same domain source as the worker. Browser journeys use real Chrome/WebGL, a real worker, native UI controls, and IndexedDB; only the local model HTTP responses are mocked. The real-model smoke is separate and never silently passes because a mock was used.

## Preserved engine baseline — October 30, 2026

Clean `npm ci --offline` succeeded. Strict typechecking, architecture boundary checks, **109 unit/integration tests**, the production build, **four Chrome journeys**, and formatting checks passed. The build emits the application successfully with upstream Zod comment-annotation warnings.

Measured on Windows x64, Node 22.22.3, Intel Core i7-1365U (12 logical CPUs), 39.7 GiB system RAM:

| Measurement                                 | Result                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Initial actors                              | 1,031: player, 30 villagers and 1,000 nonhumans                                               |
| World generation                            | 570.10 ms                                                                                     |
| Dispersed simulation tick                   | 0.709 ms p95                                                                                  |
| Dense scene reaching 128 detailed creatures | 2.534 ms p95; 12.841 ms maximum                                                               |
| Render snapshot construction                | 3.000 ms p95                                                                                  |
| Structured cloning                          | 1.618 ms p95                                                                                  |
| Checkpoint validation + serialization       | 127.46 ms; 706,049 bytes                                                                      |
| Node RSS after benchmark                    | 126.4 MiB                                                                                     |
| Full-season ecology soak                    | 28 days; 1,209,600 ordinary 30-Hz ticks; 672 validated checkpoints; fresh-host restore passed |
| Wildlife throughout the soak                | 742–1000 living; daily totals 983–999; final 987                                              |
| Committed ecology transitions               | 2,085 retired wildlife; 2,072 new identities; all eight species retained                      |

The benchmark ran separately from the soak and browser checks. The soak took 497.2 seconds of headless execution; its wall time includes some concurrent verification work and is not a performance qualification. Population targets are caps with delayed recovery, not a promise of exactly 1,000 living wildlife at every tick. Seasonal/transient dips are recorded rather than hidden; the run detected no permanent species loss or runaway growth.

The preserved baseline Chrome journeys show integer-scaled prototype presentation and the shared needs/inspection controls. Screenshots are integration evidence, not sustained minimum-hardware FPS certification. Results and screenshots are in `artifacts/benchmark.json`, `artifacts/soak.json`, `artifacts/unified-entities.png`, and `artifacts/ollama-smoke.json`.

## Automated acceptance matrix

| Concern                                                                                                        | Evidence                                                |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Seeded streams, time units, pause ownership, bounded histories                                                 | `tests/core.test.ts`                                    |
| Terrain/resources reproducibility, all biomes, multiple-seed settlement connectivity, every autotile mask      | `tests/world.test.ts`                                   |
| Shared surface rules, ramps, ice, lava, collision, incremental A*, invalidation                                | `tests/world.test.ts`, `tests/mechanics.test.ts`        |
| Exact two slots, every recipe in both orders, WIP chain, no invalid consumption                                | `tests/mechanics.test.ts`                               |
| Care, diet/media, recovery, wildness boundaries, single-owner invariant, tiers                                 | `tests/mechanics.test.ts`, `tests/simulation.test.ts`   |
| Action union, source attribution, observer locality, hearsay, summary races, gift allowance                    | `tests/agents.test.ts`                                  |
| Loopback HTTP, capability/JSON errors, one-request queue, real-time budget, dialogue preemption, stale jobs    | `tests/inference.test.ts`                               |
| Complete dialogue freeze, deferred gifts, fallback, canceled replies, independent hidden pause                 | `tests/simulation.test.ts`                              |
| Windup, one hit per swing, elemental averaging, reward bounds/deduplication, absolute-day battles              | `tests/mechanics.test.ts`                               |
| Save validation, snapshots, transfer ownership, migrations, checksum fallback, retry                           | `tests/simulation.test.ts`, `tests/persistence.test.ts` |
| Full world, entry gating, movement, dialogue, map, care/taming, crafting, combat, save/resume                  | `tests/browser/journey.spec.ts`                         |
| Thirty villagers, bounded wildlife, all eight species, 28 full days, repeated checkpoint checks, final restore | `scripts/soak.ts`                                       |

The additional [entity acceptance suite](../tests/entities.test.ts) covers shared human/wildlife bodies, integer-safe IDs, five-need physiology, sleep latching and interruption, protected and finite food, hunger persistence, competing hunts, nonlethal assault consequences, unrelated-duel reward rejection, retired navigation cleanup, and a captured real v2 migration fixture. The inference suite also checks background deferral during acceleration.

## Performance procedure

`artifacts/benchmark.json` records host CPU/OS/Node/RAM, seed, entity counts, warmup/sample ticks, generation time, p95/mean/max simulation time, snapshot packing and structured-clone time, checkpoint cost/size, RSS, and detailed-tier occupancy. It includes a dense 128-creature scene as well as normal dispersed ecology.

The 8 ms p95 simulation budget and 60 FPS rendering target are engineering targets. A 16.7 ms render frame must also accommodate browser work, visible entity sorting, UI, WebGL, and model contention. No CI assertion treats timing on an arbitrary shared runner as a universal hardware guarantee.

The benchmark does **not** measure GPU FPS, browser memory, model token throughput, or memory contention. Node RSS includes the test/runtime; it is not browser GPU allocation. Browser screenshots prove presentation/integration, not sustained 60 FPS. Evaluate sustained rendering with movement, dense ecology, weather, and active inference on the actual minimum-spec laptop.

## Long-run procedure

Twenty-eight days equals **1,209,600 full 30 Hz ticks** and spans all four seven-day seasons. The soak validates creature invariants and full save schemas every simulated minute, sends deterministic failure receipts for background inference, preserves the population cap, and validates a fresh-host restore followed by further ticks.

This tests deterministic continuity and failure handling, not LLM believability. Daily assertions require 850–1,000 living wildlife and at least five of every species; the report also retains the lower transient minimum between daily samples. Seasonal balance still needs playtesting beyond this seed.

## Live local-model findings

The recommended `qwen2.5:3b` was not installed on this machine and was not downloaded automatically. Existing CPU-loaded models were exercised instead:

- `gemma4:e4b` (about 9 GB): first cold readiness attempt timed out; a warm structured readiness check succeeded, but a character dialogue exceeded the 45-second interactive deadline.
- `qwen3.6:35b` (about 22 GB): real structured readiness succeeded in approximately 52.8 seconds, but character dialogue exceeded the 45-second deadline.

These are **failed interactive-latency qualifications**, not evidence that the adapter or fallback can guarantee lively real-time generative dialogue on this hardware/model combination. The startup gate, timeout, and active-play fallback are tested. Qualify an installed smaller model with `npm run test:ollama -- MODEL` before accepting LLM latency as production-ready.

The current smoke outcome is written to `artifacts/ollama-smoke.json`. It records failures explicitly. A successful shape check alone does not prove persona consistency, accurate memory, useful plans, or multi-day social believability.

## Manual quality scenarios

1. Observe villagers moving to work and outposts; interrupt one, close dialogue, and watch schedule recovery.
2. Ask for a gift twice in one day. Verify one physical drop, one refusal, and a new allowance on another absolute day.
3. Ask for an escort and a tomorrow shrine visit. Confirm safe movement and a sourced, timed commitment rather than an invented completed promise.
4. Share news with one villager. Verify only witnesses/local conversation partners learn it, with hearsay attribution.
5. Tame a creature, maintain its needs, neglect it, and recover trust after partnership loss. Check that no second player partner exists.
6. Freeze water, burn forage away from protected roads, and watch timed thaw/regrowth with valid path replanning.
7. Fight using physical and elemental attacks at different rendering rates; verify no repeated reward/hit from one event.
8. Export/import, clear a damaged latest checkpoint in a test database, recover the earlier save, and confirm old inference callbacks cannot act.
9. Toggle low quality/reduced motion/audio. The same authoritative simulation should remain playable.

Extensive narrative content, stacked floors, mobile controls, multiplayer and a full graphical navigation/memory editor remain outside the reference. The HD Aqualia milestone adds native-art production and review through the shared contract. See the [architecture decisions](decisions.md) and [HD specification](hd-presentation.md).

## HD engineering integration — October 30, 2026

The clean offline install, generated AssetPack bundles, strict typecheck, architecture boundary, structural asset checks, **133 unit/integration tests**, and production build pass. The preserved 109 behavior tests remain included. Asset-specific tests cover malformed/duplicate catalogs and source IDs, trim/anchor registration, cross-page clips, leases, cancellation, stale responses and decoded-memory limits. Presentation tests cover eight-way selection, distance cadence, authoritative combat phases, confirmed snapshot interpolation, pause/acceleration, cue deduplication, and identical save outcomes with frequent render projections. Worker adapter tests cover immediate startup rejection on consumer failure and obsolete frame sessions.

The final worker-interface 28-day soak completed **1,209,600 ticks** and **672 schema/checkpoint validations** in **536,877 ms**. It retained all eight species, ended with **987 nonhuman creatures plus 31 humans**, bounded the detailed tier and population, and restored successfully. Daily wildlife totals were 983–999; the recorded transient minimum remained 742. This matches preserved deterministic ecology; it is not a claim that wildlife never die or always total 1,000.

The separate 1,031-entity CPU benchmark used 3,000 measured ticks after 300 warmup ticks. Dispersed simulation p95 was **0.596 ms**, dense simulation p95 **1.262 ms** with **128** detailed creatures. Render snapshot p95 was **3.328 ms**, clone p95 **1.667 ms**, checkpoint **80.19 ms / 706,049 bytes**, and Node RSS **113.2 MiB**. These measurements exclude GPU rendering and real inference. Raw data: `artifacts/benchmark.json` and `artifacts/soak.json`.

The HD completion gate remains intentionally red: **0/19** required actor appearances have native-HD declarations, seven Aqualia identities lack body artwork, 1,699 actor/clip/portrait requirements and 44 environment bindings remain unmet. See [generated coverage](art/coverage.md). Runtime support and prototype screenshots cannot replace art review. All nineteen required slice portraits resolve after integration of the reviewed canonical source records from art PR #2 commit 64e7963. The frozen legacy ledger remains unchanged; source portraits compile independently of body sprites. See the [portrait review](art/portrait-review.md).

### Browser and integrated GPU

All **ten Chrome journeys** pass: four preserved gameplay journeys, five gallery
journeys and one HD overlay/focus/quality journey. The focused overlay journey also
passes after the accessible model-label and keyed villager-control changes.

Chrome 155.0.8059.80 used Intel Iris Xe through ANGLE Direct3D11 at 1920×1080.
Each mocked-inference case sampled 180 rAF intervals after warmup:

| Scene / tier         | Median frame / p95 | Render CPU p95 | HUD update p95 |
| -------------------- | ------------------ | -------------- | -------------- |
| Dispersed / High     | 16.7 / 19.6 ms     | 1.2 ms         | 0.8 ms         |
| Dispersed / Balanced | 16.7 / 18.7 ms     | 0.8 ms         | 1.2 ms         |
| Dispersed / Low      | 16.6 / 18.9 ms     | 0.6 ms         | 0.8 ms         |
| Dense / High         | 16.7 / 18.8 ms     | 1.4 ms         | 0.7 ms         |
| Dense / Balanced     | 16.8 / 18.8 ms     | 1.4 ms         | 0.7 ms         |
| Dense / Low          | 16.7 / 19.3 ms     | 1.3 ms         | 0.7 ms         |

All cases retained 30 villagers and 1,000 nonhuman entities. Dense cases reached
128 detailed creatures and 211 visible actor/prop sprites. Atlas initialization
was 541 ms; tracked atlas/cache/framebuffer estimates were 41.5–41.9 MiB with
framebuffer scale 1. No browser errors or measured main-thread long tasks occurred.
This is a short prototype-art run on the available 39.7 GiB host. CPU render
preparation is measured separately from rAF intervals; GPU draw timing, driver
allocation and production-HD residency require further qualification. DOM
portraits, geometry and fonts are outside the tracked texture estimate.

The installed `qwen2.5:3b` candidate passed the real structured readiness probe in
7,547 ms, then its grounded dialogue exceeded the 45-second generation deadline
(53,992 ms total including startup). A short readiness response therefore does not
qualify dialogue latency or role consistency. Deterministic failure handling stays
active. See the separate live contention report when reproducing this measurement:
`npm run benchmark:render -- --live-model qwen2.5:3b`.

Art PR #2's source proofs were inspected separately. See the [first-proof review](art/first-proof-review.md)
for actual image dimensions, camera/registration gaps and the next export criteria.
