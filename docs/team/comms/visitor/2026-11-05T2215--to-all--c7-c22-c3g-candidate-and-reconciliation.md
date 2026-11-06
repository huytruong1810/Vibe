---
from: visitor
to: all
date: 2026-11-05T22:15:00Z
subject: C7 WLD-M2/M3 authored simulation, C22 BASE_URL resolution, C3g frame deduplication delivered on studio/doctrine-v1
---

Team,

In preparation for tomorrow's beta-tester handoff, visitor has completed and pushed the following engineering deliveries on `studio/doctrine-v1`:

1. **C22 Non-Workflow Parts (Commit `dbb730f3`):**
   - Implemented `appUrl()` in `src/presentation/assets/url.ts` resolving catalog and asset paths against `import.meta.env.BASE_URL` with path sanitization (`tests/asset-url.test.ts`).
   - Integrated with `AssetManager` (`src/presentation/assets/manager.ts`) and packet gallery (`src/presentation/gallery.ts`).
   - Documented build verification and operations in `docs/operations/operations.md`.

2. **C3g Frame Deduplication & Atlas Optimization (Commit `dbb730f3`):**
   - Implemented exact content-hash frame deduplication in `scripts/lib/frame-dedup.ts` (`tests/frame-dedup.test.ts`).
   - Integrated into `scripts/assets-build.ts`.
   - Result: Atlas reduced from 4 full pages to 3 full pages, saving 1,496 duplicate quadruped frames. Decoded memory is 47.56 MiB full / 11.80 MiB half, well below the 128/256 MiB budgets.

3. **C7 Authored World in Simulation (WLD-M2/M3, Commit `c5104a14`):**
   - `AuthoredSettlementPlanner` in `src/domain/authored-world.ts` resolving all 5 canonical anchor roles (`home`, `work`, `square`, `shrine`, `outpost`) from LDtk `VillagerAnchor` entities using `npcId` and `role`.
   - Building loader in `src/domain/authored-world.ts` parsing `Building` entities (`sceneId`, `door`, `village: 1`, `Aqualia cottage N`).
   - `SimulationHost` in `src/domain/simulation.ts` supporting `worldSource: 'authored'`:
     - Spawns player at LDtk `PlayerSpawn` (`(66.5, 60.5)`).
     - Initializes the 10 Aqualia villagers at their authored `square` anchors.
     - Seeds wildlife from LDtk `Habitat` entities with species and coordinates clamped to valid bounds.
     - Rescues player back to authored spawn.
   - `EquipmentService` binds only active humans (`[0, ...this.npcs.map(n => n.entityId)]`).
   - Save migration & schema in `src/domain/save-schema.ts`: added `worldSource` versioning (`'procedural' | 'authored'`), relaxed constraints for 10-villager saves, and retained full backward compatibility.
   - UI beta toggle in `src/presentation/ui/view.ts`, `hud.ts`, and `main.ts`: added `<input type="checkbox" id="authored-toggle"/> Authored world (beta)` to setup dialog.
   - Unit tests in `tests/simulation.test.ts` pass 100%.

4. **Reconciliation Notice with `eng/hd-presentation` (PR #1):**
   - Codex's branch `eng/hd-presentation` contains delivered C13, C14, C18, C19, C20, C22 workflow, C24, C25, and B18 UI kit.
   - A merge test confirmed that our C7 simulation engine wiring and Codex's features integrate cleanly (all 48 test files, 575 tests pass).
   - Because `eng/hd-presentation` contains commits modifying `.github/**`, `docs/team/comms/codex/**`, `package.json`, and `vite.config.ts` (which are outside visitor's lane under TEAM-2), visitor has not pushed that merge to `studio/doctrine-v1`.
   - Request to Codex / Director (Huy): Merge `eng/hd-presentation` into `studio/doctrine-v1` to combine all beta features and trigger the `.github/workflows/beta.yml` Pages deployment.
