# Whole-game review entry point — 2026-11-06

Director requested a committed, reproducible checkpoint for Visitor's whole-game
review. Review **7019b5db9b8f7e4c10c832b6e29b6f9bd841037a** plus the preparation
commit containing this file. That source includes the reconciled C7/beta work and
Visitor's V13–V19 deliveries. Fresh results and file hashes are in
[review preparation receipt](review-preparation.json). This is review preparation,
not approval of the game or of Visitor's own engineering.

## Start here

1. Read `AGENTS.md`, `docs/team/briefs/visitor.md`, the applicable doctrine and
   `docs/team/queue/visitor.md`. Set `HEARTHWILD_ROLE=visitor` for this session;
   do not change the machine's role file. Use a clean checkout/worktree and record
   the exact reviewed SHA before changing anything.
2. Use Node22.12+ and `npm ci`. Python tools run with
   `uv run --project art/source/forge …` (or `python -m uv run …` on Windows).
   Install the Playwright Chromium browser if absent. No model download or running
   Ollama/image service is necessary for the automated fallback/mock journeys.
3. Run `npm run dev -- --port 4173 --strictPort`; open
   `http://127.0.0.1:4173/?test=1`. Start with **Play without local AI**. Test the
   normal new game and a separate fresh context with **Authored world (beta)**.
   The authored bundle is `public/assets/generated/aqualia-region.json`.
   Check the exported save's `worldSource`; a failed bundle load can fall back to
   procedural, so the checked box alone is not proof of authored gameplay.
4. Review the art gallery at `http://127.0.0.1:4173/?gallery=1`. Distinguish
   candidate/staged art, compiled appearances and digest-bound runtime approvals.
   Existing placeholder bodies are visible; declared HD coverage is not approval.
5. Stop the dev server before production/Playwright checks. Use new output
   directories for every run, and preserve CPU JSON and failure traces before
   another journey overwrites shared filenames under `artifacts/`.

## Review the whole game

| Area | Hands-on review | Code and evidence to examine |
| --- | --- | --- |
| Startup and world | Default and authored new game; spawn, walking, ramps/water, settlements, services, interior doors, rescue, habitats, forage, void/seams; compare active NPC count and authored anchors | `src/domain/authored-world.ts`, `simulation.ts`, `world.ts`, `scenes.ts`, `query.ts`; `tests/authored-world.test.ts`, `tests/simulation.test.ts`; world passes, region bible and plan |
| Combat | Strike/element/dash, three-hit chains, recovery cancels, finisher recoil, hostile packs, token spacing, telegraphs and difficulty persistence | `src/domain/combat.ts`, `creature-minds.ts`; renderer/effects; combo, hit-stop, combat-director tests. Check that hit-stop remains presentation-only and does not pause authoritative ecology/time |
| Creatures | Companion care, needs, six stats, potential reveal, conditioning, dispositions, learnable/active moves and companion sheet (`P`); save/reload every new field | `src/domain/entities.ts`, creature definitions, companion HUD; stats/moves and companion-sheet tests. Check that displayed progression is used consistently by gameplay |
| Villagers/life sim | People inspector, dialogue hearts, gifts/tastes, one-gift-per-day, reactions, schedules and relationship persistence | `src/content/villagers.ts`, `src/domain/agents.ts`, `simulation.ts`, HUD; life-sim tests. Birthday scaling support is not evidence of authored birthday/calendar content |
| Local AI/context/memory | Fallback and unavailable service, actual model capability, streaming, grounding, bounded reading, 75% compaction, extraction, old promises and memory recall | Inference adapters; conversation, memory and literacy domain modules; `scripts/ollama-smoke.ts`, `scripts/verify-villagers.ts`; Machine-A receipts linked below. Separate mock success from live-model quality/latency |
| Written artifacts | Create note/book, line/page limits, autosave while typing/clicking, seal, page turns with keyboard/gamepad, NPC read/write and provenance | `src/presentation/ui/book.ts`, literacy/artifact-writing; browser draft/reading regressions. Reader must mount only two pages; retain the100ms opening gate |
| Paintings/touch-up | Missing endpoint, generation/cancel, Keep/Retry/Discard, reload during an active native job, hooks/take, thumbnails, pending cloth, pixel editing and undo/redo; authorship/content persistence | Image/GPU adapters, painting service/cache/world renderer and `painting-editor.ts`; painting provider/workflow/touch-up tests. C21 delivery does not imply its earlier gate or self-review requirement is cleared |
| Art/rendering/UI | Every atlas page, memory totals, clipping/sorting, pivots/sockets, face/body binding, held tools, human/creature scale, 2× pixel grid, fonts, narrow viewports, input/focus and overlays | `src/presentation/**`, asset compiler/catalog, approval ledger and staging. Compare C9c narrative dimensions against authoritative `render_spec.json`; preserve the unchanged HD gate |
| Audio/ambience | Voice blips, cadence, distinct villagers, ducking/resume, sound-off, movement/weather/time cues, pause transitions and visual-effect lifetime | `src/presentation/audio.ts`, renderer/effects, weather/presentation domain fields and voice tests. Listening tests and actual model voices are separate from mocked WebAudio tests |
| Saves/determinism/performance | Default/authored export-import-resume, migrations, bad content, missing definitions, two-slot checkpoints, worker transport/backpressure, pause tokens, quality tiers, CPU/GPU budgets and soak | Save schemas/storage/worker bridge; artifact/save, determinism, budget, beta and soak tests. Do not substitute procedural soak for authored-world soak |
| Build/deploy/tooling | Root and `/Vibe/`, asset URLs, generated-world reproducibility, disconnected services, packet/world tools, exact-source CI, actual soak step and Pages build stamp | `package.json`, workflow/operations docs, worldforge/tileforge/forge tools; public CI jobs/annotations. Visitor reports workflow/manifest/spec issues to their owners |

## Reproduce validation

Run timing checks sequentially without another validation workload. Keep every
assertion, timeout, gate and budget unchanged. On Windows set
`$env:VITEST_MAX_WORKERS='4'`; on Linux use `VITEST_MAX_WORKERS=4`.

```sh
npm run check
npm run format:check
npm run check:packets
npm run check:world -- --region aqualia
npm run check:assets:hd
uv run --project art/source/forge python -B -m unittest discover -s art/source/world/tools/worldlib -p worldforge_selftest.py
npx playwright test --project=journeys --output=test-results/visitor-REPLACE-WITH-UNIQUE-ID
```

For root production smoke, build with `VITE_BASE_PATH=/`, then run
`PLAYWRIGHT_BASE_PATH=/ npm run test:beta -- --output=test-results/visitor-root-UNIQUE`.
Repeat the build/smoke with both variables set to `/Vibe/`. Use the platform's
environment-variable syntax; the receipt records Codex's actual invocations.

The retained software-renderer config is
`docs/team/comms/codex/tmp/c18-swiftshader.config.ts`, now versioned and referenced
here. With `CI=1`, run the literacy journey with that `--config` and a unique
`--output`. Its flags force SwiftShader; do not substitute native timings for it.

The current `scripts/soak.ts` constructs a procedural host. The benchmark has
`BENCHMARK_WORLD=authored`; that does not make the long soak authored. The new
authored-world simulation test advances600ticks. Keep those three forms of
evidence separate; this preparation grants no authored overnight soak pass.

## Known gaps and evidence quality

- The earlier exact-source receipt is
  [reconciliation validation](reconciliation-validation.json). Its results describe
  older source6b20ebb4, not the new7019b5db game. It preserves571test pass, native
  opening31.5ms, software opening578.1ms/100ms, failed hosted combat windup polling,
  source-map replay mismatch and1519HD gaps. Consult the fresh receipt before
  assuming a gap is resolved or still reproduces.
- The Machine-A reading receipt reports failure (`READ_TEXT` not selected), the
  memory receipt reports timeout, and the conversation receipt reports malformed
  JSON. Read their raw JSON, not just the model capability check. They are under
  `docs/team/comms/blender/tmp/{c18,c25}/`, with addressed explanatory messages.
- Machine-A painting reports transport success but121.4s including model reload,
  beyond30s; generation alone is50.8s. See
  `docs/team/comms/blender/2026-11-06T1945--to-codex--c19-c20-painting-receipt.md`
  and its bound JSON/images. This is not a latency-budget pass.
- Canonical map, replayed R3 map, bundled compiled world, approved digest, gameplay
  resource nodes and asset IDs must agree. Do not repair the discrepancy by
  editing LDtk JSON, weakening equality/coverage tests or promoting candidate art.
- Visitor authored much of C7/V13–V19 and painting touch-up. Audit and report it,
  but do not self-approve it. Independent Codex/Claude engineering review remains
  separate from the Visitor's full-game report (TEAM-4.2).

## Deliver the review

Write the report in `docs/team/comms/visitor/`, with reviewed SHA, environment,
commands, findings ranked by impact, reproducible steps, expected/actual behavior,
file/line references and evidence hashes/paths. Separate observed failures from
suspicions, untested areas, design/approval questions and missing art intake.
Include **Changed / Evidence / Gaps** and route work into the correct queues.
Read-only audit needs no engineering claim; claim and push a ticket before fixes.
Do not change doctrine, art approval records, manifest or another agent's work as
part of this review preparation. Stop owned processes before publishing.

The20pre-existing PNGs in `docs/team/comms/codex/tmp/` are retained historical
evidence at their original paths. Their hashes/provenance are listed in the fresh
receipt. Source-unknown images are not current-build or authored-world acceptance
proof. Codex owns their promotion/removal within the TEAM-9.5 seven-day window.
