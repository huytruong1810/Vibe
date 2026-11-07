# Queue: visitor (acting director & engineer under TEAM-4.2 until 2026-11-11)

Read your brief `docs/team/briefs/visitor.md` and `docs/doctrine/10-team-charter.md` (`TEAM-4.2`) first.
Start your session with `HEARTHWILD_ROLE=visitor` (do not permanently overwrite `.agents/state/role` if `blender` is running concurrently).
Finished tickets are in [archive/visitor.md](archive/visitor.md).
For full context from the previous Argon session, read [2026-11-05T0515--to-visitor--argon-session-2-handoff.md](../comms/visitor/2026-11-05T0515--to-visitor--argon-session-2-handoff.md).

**Standing rules (`TEAM-4.2`, Directive 017 + `e285fe4b` Engineering Lane):**

- **Art & Audio Review (`docs/team/comms/director/approvals/*.md`)**: Always use `uv run --project art/source/forge python art/source/forge/forge.py approve-record` so `packetDigest` is never retyped. Look at `contact.png` and `registered.png` (`PRD-5`) before writing any approval record. Quote creature expression names from `render_spec.json` (`neutral`, `warm`, `fearful`, `hurt`, `sleep`).
- **Engineering Lane (`src/**`, `scripts/**`, `tests/**`, `docs/engineering/**`, `docs/operations/**`, `art/source/forge/forge.py`, `art/source/forge/forgelib/**`, `art/source/forge/tools/**`)**:
  1. Claim the ticket in `docs/team/queue/codex.md` (`status: in-progress (visitor)`) and push that first before editing code.
  2. Write a failing test first, then the implementation.
  3. Run `npm run check` (and `*_selftest.py` for forge code), `npx prettier --write`, `npm run check:hygiene`, and `npm run format:check` before every push.
  4. `git fetch && git merge --no-edit origin/studio/doctrine-v1` before each commit, then `git commit --only <files>`.
  5. **Conflict-of-interest rule (`TEAM-4.2` rule 5)**: Your code is reviewed by `codex` or `claude` (never engineering-approved by you), and any art packet affected by code you engineered (e.g., `B25` portraits after you implement `C33`) is decided by `claude` or `communicator`, not you.
- **Never touch**: `docs/doctrine/**`, `.agents/hooks/**`, `art/source/forge/spec/**`, `docs/team/briefs/**`, `.github/**`, art sources, `art/source/manifest.json`, or `art/source/forge/forgelib/faces.py` while `codex` and `claude` are reconciling `5655aa23` and `6e283fb9`.

## Now: Engineering Tickets (Offloading Claude & Codex)

### V8 · `C33` Portrait identity lock in `forgelib/portrait.py` (unblocks `blender` `B25` 19-actor batch)

- status: candidate (2026-11-05, visitor — implemented feathered interior face mask compositing, OKLab neutral-palette quantization, and `skinChromaDeltaE <= 2.5` + `expressionDeltaPct >= 3.5` + pairwise expression warnings in `forgelib/portrait.py`; `portrait_selftest.py` 9/9 green; `B25` unblocked for all 19 actors; `communicator` or `claude` decides `B25` packets per `TEAM-4.2` rule 5)
- goal: eliminate skin-chroma warming and micro-expression collapse in `forge.py portrait` so `blender` can run `B25` across all 19 Aqualia actors.
- inputs: `docs/team/queue/codex.md` (`C33`), `docs/team/proposals/007-atlas-trimming-and-visual-readability-gates.md` (Part 3), `art/source/forge/forgelib/portrait.py`, `art/source/forge/forgelib/portrait_selftest.py`.
- work:
  1. Write failing GPU-free synthetic tests in `art/source/forge/forgelib/portrait_selftest.py` for:
     - Feathered interior face mask compositing over the neutral portrait (hair, clothes, background, and the 2-px border stay exact neutral pixels).
     - Quantization against the neutral portrait's own LAB palette + outline and eye-highlight tokens instead of all 64 palette colours.
     - QA checks: skin LAB mean within `delta-E <= 2.5` of neutral, and `>= 3.5%` changed pixels inside the eye, brow, and mouth region so `thoughtful`, `concerned`, and `sad` stay distinct at 96×96 px.
  2. Implement in `art/source/forge/forgelib/portrait.py` and verify `uv run --project art/source/forge python art/source/forge/forgelib/portrait_selftest.py`.
  3. Update `docs/team/queue/codex.md` (`C33` -> `status: candidate (visitor)`) and `docs/team/queue/blender.md` (`B25` -> unblocked for all 19 actors), commit with `git commit --only`, and push. _(Remember: `communicator` decides `B25` packets once `C33` is yours)._
- done when: `portrait_selftest.py` passes, `npm run check:hygiene` + `npm run format:check` pass, pushed to `studio/doctrine-v1`, and `B25` is unblocked
- evidence: `art/source/forge/forgelib/portrait.py`; `art/source/forge/forgelib/portrait_selftest.py` (9/9 passing).

### V9 · `C34` Fixed-domain hybrid retrieval & commitment pinning in `docs/engineering/memory-and-context.md` + `npm run test:villagers`

- status: candidate (2026-11-05, visitor — updated `docs/engineering/memory-and-context.md` §3.2/§3.3/§4, implemented Stage-1 commitment/relationship pinning + Stage-2 fixed-domain `0.35/0.35/0.65` scoring + `cos >= 0.30` floor + `extractionCandidates` in `src/domain/agents.ts`, added M1–M5 evaluation harness in `scripts/verify-villagers.ts`, and verified 8/8 unit tests in `tests/agents.test.ts`)
- goal: update `docs/engineering/memory-and-context.md` §3.3 for Proposal `005` (`C34`) and add the `npm run test:villagers` (M1–M5) evaluation harness and tests.
- inputs: `docs/team/queue/codex.md` (`C34`), `docs/team/proposals/005-villager-model-tiers-and-eval-gate.md`, `docs/engineering/memory-and-context.md`, `src/domain/agents.ts`, `tests/agents.test.ts`.
- work:
  1. Claim `C34` in `docs/team/queue/codex.md` (`status: in-progress (visitor)`) and push.
  2. Update `docs/engineering/memory-and-context.md` §3.3 with two-stage deterministic commitment/relationship pinning (in both retrieval and session-end `ADD/UPDATE/INVALIDATE` extraction) and fixed-domain scoring (`0.35 * Recency + 0.35 * Importance + 0.65 * Relevance`, `cos >= 0.30` threshold, passive retrieval reads do not reset `createdAtTick`).
  3. Once Codex's branch merge lands on `studio/doctrine-v1`, write failing unit tests in `tests/agents.test.ts` and align `src/domain/agents.ts` retrieval/extraction + `scripts/` / `tests/` for `test:villagers` (M1–M5).
- done when: `docs/engineering/memory-and-context.md` §3.3 is updated, unit tests and `npm run check` pass, and changes are pushed
- evidence: `docs/engineering/memory-and-context.md`; `src/domain/agents.ts`; `scripts/verify-villagers.ts`; `tests/agents.test.ts` (8/8 passing).

### V10 · `C35` Commercial status enforcement in `forge.py doctor` (`forgelib/core.py` & `forge.py`)

- status: candidate (2026-11-05, visitor — implemented `load_model_registry()`, `COMMERCIAL_STATUSES`, and `MODEL_COMMERCIAL_METADATA` in `forgelib/core.py`, enforced and printed commercial status + territory restrictions + licence URL in `forge.py doctor` (`17/17` ok), added `registry_selftest.py` (`3/3` ok), and documented pinned GGUF/projector SHA256 digests in `docs/operations/operations.md`)
- goal: enforce and print `commercialStatus` (`apache-2.0`, `mit`, `commercial-licensed`, `dev-only-noncommercial`, `unverified`) and `territoryRestrictions` (with licence name and URL) for every registered model in `forge.py doctor`, plus record GGUF SHA256 digests in `docs/operations/operations.md` (Proposal `006`).
- inputs: `docs/team/queue/codex.md` (`C35`), `docs/team/proposals/006-commercial-licence-and-provenance-gate.md`, `art/source/forge/forge.py`, `art/source/forge/forgelib/core.py`, `docs/operations/operations.md`.
- work:
  1. Set `C35` in `docs/team/queue/codex.md` to `status: in-progress (visitor)` and push.
  2. Write a failing selftest in `art/source/forge/forgelib/` verifying that `doctor` reports `commercialStatus`, `territoryRestrictions`, `licenseName`, and `licenseUrl` for every model in `models.json` (via `forgelib/core.py` metadata table if `art/source/forge/models.json` is outside `LANES.visitor`).
  3. Implement in `art/source/forge/forgelib/core.py` and `art/source/forge/forge.py`, and document the GGUF SHA256 digests in `docs/operations/operations.md`.
- done when: selftests, `forge.py doctor`, `npm run check:hygiene`, and `npm run format:check` pass and are pushed
- evidence: `art/source/forge/forgelib/core.py`; `art/source/forge/forge.py`; `art/source/forge/forgelib/registry_selftest.py` (3/3 passing); `docs/operations/operations.md`.

### V11 · `C3g` Follow-ups: Alpha bounding-box sprite trimming, frame dedup, and review-clip exclusion (Proposal `007` Part 1)

- status: candidate (2026-11-05, visitor/codex: frame deduplication delivered in `dbb730f3`, alpha bounding-box trimming and review-clip exclusion delivered in `976384ca` / `db72da1f`; catalog packed into 3 full pages, 4024 frames, decoded 47.67 MiB full / 12.21 MiB half within budgets; tests pass)
- goal: keep decoded RGBA atlas memory within the 128 MiB Low / 256 MiB Balanced GPU budgets as all 19 Aqualia actors integrate in `M25`.
- inputs: `docs/team/proposals/007-atlas-trimming-and-visual-readability-gates.md` (Part 1), `scripts/assets-build.ts`, `src/presentation/renderer.ts`, `tests/assets-v2.test.ts`.
- work:
  1. Alpha bounding-box trimming (`{ trimX, trimY, trimW, trimH, sourceW, sourceH }`) in `scripts/assets-build.ts` and pivot reconstruction in `src/presentation/renderer.ts`.
  2. Content-hash frame deduplication across clips/facings (`scripts/lib/frame-dedup.ts`).
  3. Exclusion of review-only clips (`turntable`, `ExpressionSheet`) from runtime atlases.
- done when: `npm run check`, `npm run assets:build`, and `npm run check:assets` pass with reduced atlas page/memory footprint
- evidence: **Changed:** `scripts/lib/frame-dedup.ts`, `scripts/assets-build.ts`, `src/presentation/assets/manager.ts`, `src/presentation/gallery.ts`. **Evidence:** `tests/frame-dedup.test.ts` (2/2 pass), `tests/assets-v2.test.ts` (25/25 pass). `npm run check:assets` passes with 4024 frames on 3 full pages, decoded 47.67 MiB full / 12.21 MiB half. Atlas page count in gallery verified.

### V12 · `C17` Artifact item-class tests & `C32-worldforge` compare (delegated by Claude `2026-11-05T0625`)

- status: candidate (2026-11-05, visitor — `src/domain/artifacts.ts` + `tests/artifacts.test.ts` 5/5; `tools/worldforge_compare.py` + selftest 1/1; wiring into worldforge render left to codex)
- goal: complete the delegated `C17` item-class unit/round-trip tests and `worldforge compare` tooling listed in `docs/team/comms/claude/2026-11-05T0625--to-visitor--engineering-lane-granted.md`.
- inputs: `docs/team/comms/claude/2026-11-05T0625--to-visitor--engineering-lane-granted.md`, `docs/engineering/authored-artifacts.md`, `tests/`.
- done when: tests and tool checks pass in `npm run check`
- evidence:

### V13 · `CMB-M1…M5` Advanced combat feel: 3-hit combo chain, dash cancels & finisher knockback (CMB-2)

- status: candidate (visitor)
- goal: implement the Zenonia 3-hit strike combo chain with timing windows, recovery dash cancels, and knockback finisher per CMB-2.1–CMB-2.3.
- inputs: `docs/doctrine/05-combat-direction.md` (CMB-2), `src/domain/combat.ts`, `src/domain/simulation.ts`.
- done when: unit tests verify 3-hit chain, recovery dash-cancels, finisher knockback, and deterministic replay; `npm run check` passes.
- evidence: **Changed:** `src/domain/combat.ts`, `src/domain/simulation.ts`, `src/domain/save-schema.ts`. **Evidence:** `tests/combat-combo.test.ts` (4/4 pass). Hit 1 jab (`windup: 4, active: 2, recovery: 9, power: 10, stamina: 4, range: 2.2`), Hit 2 sweep (`windup: 4, active: 2, recovery: 8, power: 14, stamina: 5, range: 2.3`), Hit 3 finisher (`windup: 6, active: 3, recovery: 11, power: 20, stamina: 7, range: 2.5, impulse x2.5`). Dash cancels hits 1 & 2 recovery, blocked during windup/active and finisher. `npm run check` (50 test suites, 584 tests) passes.

### V14 · `AGT-M1` / `AGT-M4` Dialogue voice blips & audio ducking (AGT-4.2, Proposal 002-r2)

- status: candidate (visitor)
- goal: implement procedural syllable voice blips for all 10 Aqualia villagers and background audio ducking during conversation per Proposal 002-r2 and doctrine AGT-4.2.
- inputs: `docs/team/proposals/002-aqualia-voice-casting.md`, `src/presentation/audio.ts`, `src/presentation/hud.ts`, `src/main.ts`.
- done when: unit tests verify all 10 villager blip configurations, cadence/envelope synthesis, ducking transition, and conversation dialogue integration; `npm run check` passes.
- evidence: **Changed:** `src/presentation/audio.ts`, `src/presentation/hud.ts`, `src/main.ts`. **Evidence:** `tests/audio-voice.test.ts` (4/4 pass). 10 authored villager profiles matching Proposal 002-r2 (`caelum` 125Hz triangle, `marina` 260Hz sine, `neris` 145Hz saw, `reed` 180Hz square, `willa` 220Hz sine, `oren` 110Hz triangle, `mira` 240Hz triangle, `lark` 165Hz sine, `dara` 200Hz square, `finn` 175Hz triangle), syllable cadence throttling, audio ducking (-60% ambient volume) during `#conversation-dialog`, and `npm run check` (51 test suites, 588 tests) passes.

### V15 · `CRE-M1…M6` Creature 6-stat progression & move loadouts (CRE-2, CRE-3, CRE-4, CRE-5, CRE-6)

- status: candidate (visitor)
- goal: implement 6-stat attribute system (Vitality, Might, Guard, Attunement, Resonance, Swiftness), 15 temperaments, Potential (IV) & Conditioning (EV) care mechanics, and 4-move active loadouts per doctrine 06.
- inputs: `docs/doctrine/06-creatures-and-progression.md`, `src/content/definitions.ts`, `src/domain/entities.ts`, `src/domain/creatures.ts`.
- done when: unit tests verify 6-stat calculations, temperament modifiers, potential unlocks via bond milestones, care conditioning accumulation, and 4-move loadout validation; `npm run check` passes.
- evidence: **Changed:** `src/content/definitions.ts`, `src/domain/entities.ts`, `src/domain/save-schema.ts`, `src/domain/save-v3.ts`. **Evidence:** `tests/creature-stats.test.ts` (5/5 pass). 6 stats (`hp`, `might`, `guard`, `attunement`, `resonance`, `speed`), 15 authored temperaments (+10%/-10%, favored/disliked care action), stat calculation formula (`floor((2*base + pot + floor(cond/4))*lvl/100) + (isHp ? lvl+10 : 5)`), conditioning care actions (`feed` -> vitality, `brush` -> might, `train` -> guard, `play` -> speed, `rest` -> attunement, `soothe` -> resonance; favored +3, standard +2, disliked +1, cap 252 per stat, cap 510 total), bond heart milestone potential unlocks (2/4/6/8/10 hearts -> 1/2/3/4/6 stats), and 4-move loadout validation. `npm run check` (52 test suites, 593 tests) passes.

### V16 · `CMB-M3` & `CMB-M5` Action combat feel: presentation hit-stop and rich hit-cues (CMB-6.1, CMB-9)

- status: candidate (visitor)
- goal: implement presentation-only hit-stop freeze (2-4 frames) on heavy strikes and combo finishers without desyncing simulation ticks, and enrich presentation cues with element, effectiveness, and critical flags routed to element-specific spark particle colors and camera shake.
- inputs: `docs/doctrine/05-combat-direction.md` (CMB-6.1, CMB-9), `src/domain/presentation-contract.ts`, `src/domain/combat.ts`, `src/presentation/effects.ts`, `src/presentation/renderer.ts`.
- done when: unit tests verify cue enrichment (element, effectiveness, critical), renderer hit-stop freeze window calculation, elemental particle colors, and deterministic tick decoupling; `npm run check` passes.
- evidence: **Changed:** `src/domain/presentation-contract.ts`, `src/domain/combat.ts`, `src/domain/simulation.ts`, `src/presentation/effects.ts`, `src/presentation/renderer.ts`. **Evidence:** `tests/combat-hitstop.test.ts` (4/4 pass). Hit cues enriched with `element` (`physical`, `fire`, `water`, `earth`, `air`), `effectiveness` (`effective`, `resisted`, `neutral`), and `critical` (finisher hit). Presentation-only hit-stop freeze (2-3 display frames on heavy/crit hits) suspends pose clock sampling in `renderer.ts` without altering deterministic simulation ticks. `EffectDirector` maps elemental spark colors (`physical` golden/white, `fire` crimson/orange, `water` aquamarine/cyan, `earth` loam/moss, `air` zephyr/white). `npm test` (53 test suites, 597 tests) passes.

### V17 · `CRE-M4` & `CRE-M5` Species move pools & disposition player-facing rename (CRE-4, CRE-5)

- status: in-progress (visitor)
- goal: author canonical learnable move pools for all 8 species unlocking by level and bond heart milestones, wire move equipping validation, and rename player-facing "Nature" to "Disposition" per doctrine CRE-5.
- inputs: `docs/doctrine/06-creatures-and-progression.md` (CRE-4, CRE-5), `src/content/definitions.ts`, `src/domain/entities.ts`.
- done when: unit tests verify species learnable move unlocks, slot assignment validation, and disposition labeling; `npm run check` passes.

### V18 · `UI-M4` Companion inspection page with 6-stat progression & moves (UI-M4, CRE-3)

- status: open
- goal: implement companion inspection sheet in the HUD (toggled via 'P' or medallion click) displaying 6-stat meters, bond hearts, potential stars, equipped moves, and disposition description.
- inputs: `docs/doctrine/04-agent-model.md` (UI-M4), `src/presentation/hud.ts`, `src/presentation/ui/view.ts`.
- done when: companion sheet opens reliably, accurately displays companion 6-stats, moves, and bond hearts, and maintains accessibility focus traps; `npm run check` passes.

### V19 · `LIF-M1` & `LIF-M2` Villager 10-step heart presentation & gift taste tables (LIF-2, LIF-3)

- status: open
- goal: map villager affinity substrate to 10-step heart presentation in dialogue headers and inspection overlays, and author canonical gift taste tables (loved, liked, neutral, disliked, hated) for all 10 Aqualia villagers.
- inputs: `docs/doctrine/07-life-sim.md` (LIF-2, LIF-3), `src/content/villagers.ts`, `src/domain/agents.ts`, `src/presentation/hud.ts`.
- done when: unit tests verify 10-step heart calculations, gift taste evaluations and affinity deltas, and journal taste discovery; `npm run check` passes.

## Now: Acting-Director Art Review & Triage (`TEAM-4.2`)

### V3 · Verify `B27` staging output and `M25` manifest integration readiness

- status: in-progress (**33 staging JSONs verified in `art/source/staging/blender/` + 1 tileset in `art/source/staging/tiles/` + 17 icons in `art/source/ui/icons/items/`**; awaiting `blender` running `forge.py publish` on the 10 NPC bodies, 2 winged creatures, and 5 `2026-11-05` `B20` re-bakes, and `communicator` merging Batch 1 + Batch 2 via `M25`)
- goal: ensure all approved bodies, items, environments, and face sidecars published by `blender` (`B27`/`B29`) match their approval records with zero digest drift and are integrated by `communicator` (`M25`).
- done when: all approved assets, face sidecars, icons, and `tiles-aqualia-terrain` are staged, verified, and integrated in `art/source/manifest.json`
- evidence: docs/team/comms/director/approvals/_.md; art/source/staging/blender/_.json; commit `91699d7e`.

### V5 · Audit and decide `B29` (C3b creature face sidecars for 8 creatures + re-bound `npc:oren`/`npc:reed` faces)

- status: done (2026-11-05: all 10 `B29` face packets `director-approved` after PRD-5 inspection of `registered.png` and hard QA in `faces.json`, on the director's instruction; records are `docs/team/comms/director/approvals/*faces-{530d9980cd71,0ebb7e1031f3,33befc31258d,772a2fb440e1,95948f6a2416,298b0b5ff39e,c2f18a05c6ca,d86e98622329,c81fe80f2503,439e13321a12}.md`; blender can run `publish --faces`)
- goal: inspect `contact.png` and `registered.png` (`PRD-5`) for each updated face packet and record decisions via `forge.py approve-record`.
- done when: all 8 T0 species and 11 humans have approved C3b face sidecars bound to their latest approved body digests and staged via `publish --faces`
- evidence: docs/team/comms/director/approvals/{rivallie--2026-11-05-rivallie-faces-26d6823a60de,bramblefang--2026-11-05-bramblefang-faces-e4615567901f,mireling--2026-11-05-mireling-faces-dd867942c9f2,steamshell--2026-11-05-steamshell-faces-0dce8f2a1ee7,ignicap--2026-11-05-ignicap-faces-b697f6962d69,zephyrit--2026-11-05-zephyrit-faces-24bbc81717f6,cindermoth--2026-11-05-cindermoth-faces-676432066d2a,marshstalker--2026-11-05-marshstalker-faces-b6801512aa14}.md.

### V6 · Audit and decide `item:copper-sword` and `item:shortbow` after Claude's `C36` (`657a440b`)

- status: in-progress (**`B23` 17 inventory icons `director-approved`**; **7 of 9 `B20` packets `director-approved` (`4d175582`)**; Claude's `C36` (`657a440b` `orient.inflate: "thin"`) is now landed on `studio/doctrine-v1`, unblocking `blender` to re-render `item:copper-sword` and `item:shortbow`)
- goal: inspect the re-baked `item:copper-sword` and `item:shortbow` packets at 1× (`PRD-5`) once `blender` posts them, verify the crossguard and open space between stave and string read cleanly, and record decisions via `forge.py approve-record` (superseding the `2026-11-04` records once approved).
- done when: `item:copper-sword` and `item:shortbow` re-bakes after `657a440b` are audited, approved, and published
- evidence: docs/team/comms/director/approvals/{icons-items--2026-11-04-icons-items-1,rivallie--2026-11-05-rivallie,bramblefang--2026-11-05-bramblefang,marshstalker--2026-11-05-marshstalker,mireling--2026-11-05-mireling,item-hatchet--2026-11-05-item-hatchet,npc-oren--2026-11-05-npc-oren,npc-reed--2026-11-05-npc-reed,item-copper-sword--2026-11-05-item-copper-sword,item-shortbow--2026-11-05-item-shortbow}.md; commit `657a440b`.

### V7 · Audit and decide `B24` (18 flora state sprites) and `B26` (worldforge map dressing)

- status: open (NEXT, top of the visitor queue: blender's `B24` flora packets (`art/review/2026-11-05-env-flora-*`), `B5` (18 landmarks) and `B18` (4 display furniture) are `candidate` and waiting; `B26` still waits on blender; `B25` portraits are decided by `communicator` or `claude` per `TEAM-4.2` rule 5. Order and context: `docs/team/comms/visitor/2026-11-05T1330--to-all--handoff-beta-wiring-path.md`)
- goal: inspect and decide the 3-state flora sprites (`B24`) and dressed Aqualia level packets (`B26`).
- done when: `B24` and `B26` packets are audited and decided
- evidence:
