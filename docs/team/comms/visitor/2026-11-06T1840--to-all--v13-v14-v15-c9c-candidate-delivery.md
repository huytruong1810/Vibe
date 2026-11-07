---
from: visitor
to: all
date: 2026-11-06T18:40:00Z
subject: V13, V14, V15, C9c candidate delivery — combat combos, voice blips, creature 6-stats, and canvas contract
---

# Changed

- **V13 (`CMB-M1…M5`) Combat Combo Chaining, Dash-Cancels & Finisher Knockback (CMB-2):**
  - In `src/domain/combat.ts`: defined `COMBO_ATTACKS.strike` (Hit 1 jab 4/2/9, Hit 2 sweep 4/2/8, Hit 3 finisher 6/3/11). Added `chainIndex` (0 | 1 | 2) to `AttackState` and enabled recovery chaining in `CombatSystem.attack`. Scaled finisher impulse (2.5x) and widened recoil clamping to `[-8, 8]`.
  - In `src/domain/simulation.ts`: allowed dash-canceling during recovery of Hits 1 and 2, while locking commitment on Hit 3 finisher and during windup/active frames.
  - In `src/domain/save-schema.ts`: added optional `chainIndex` to attack schema and expanded recoil range.
  - In `tests/combat-combo.test.ts`: 4 unit tests covering 3-hit recovery chaining, expiration reset, recovery dash-cancels, and finisher knockback impulse (all 4 passed).
  - Commit: `0d54b060`.
- **V14 (`AGT-M1` / `AGT-M4`) Dialogue Voice Blips & Audio Ducking (AGT-4.2, Proposal 002-r2):**
  - In `src/presentation/audio.ts`: defined `VILLAGER_VOICES` and `DEFAULT_VILLAGER_VOICE` with exact procedural syllable parameters for all 10 Aqualia villagers matching Proposal 002-r2. Implemented `dialogueBlip(npcId)` with attack/decay envelopes, pitch inflections, and cadence throttling. Implemented `setDialogueDucking(active)` and `isDucked()` reducing ambient noise volume by 60% during dialogue.
  - In `src/presentation/hud.ts` & `src/main.ts`: wired speech bubble event handlers to `dialogueBlip` and `setDialogueDucking`.
  - In `tests/audio-voice.test.ts`: 4 unit tests covering all 10 villager voice configurations, cadence throttling, and ducking transitions (all 4 passed).
  - Commit: `cc8d06d6`.
- **V15 (`CRE-M1…M6`) Creature 6-Stat Progression & Move Loadouts (CRE-2..CRE-6):**
  - In `src/content/definitions.ts`: added `attunement` and `resonance` to `CreatureDefinition` with balanced base stats across all 8 species while strictly preserving canonical `hp` values to maintain backwards compatibility with legacy saves.
  - In `src/domain/entities.ts`: defined `StatName`, `CareAction`, `Temperament`, and 15 authored `TEMPERAMENTS` (+10%/-10%, favored/disliked care action). Implemented `calculateEffectiveStat` matching CRE-3.3 formula (`floor((2*base + pot + floor(cond/4))*lvl/100) + (isHp ? lvl+10 : 5)`). Implemented `revealedPotentialCount(bondHearts)` milestone unlocks (2/4/6/8/10 hearts -> 1/2/3/4/6 stats). Added `potentials`, `conditionings`, `temperaments`, and `loadouts` to `EntityStore` with care action conditioning accumulation and 4-move active loadouts.
  - In `src/domain/save-schema.ts` & `src/domain/save-v3.ts`: added optional additive creature fields and updated v3 projections to strip them during migration to maintain strict legacy validation.
  - In `tests/creature-stats.test.ts`: 5 unit tests covering 6-stat formula, 15 temperaments, care conditioning, progressive potential reveal, and 4-move active loadouts (all 5 passed).
  - Commit: `681f8cd9`.
- **Phase 5 (`C9c`) Presentation Canvas Contract Documentation (`docs/engineering/hd-presentation.md`):**
  - Documented multi-canvas human rendering contract specification rules:
    - `human.locomotion`: 80×80 px, anchor `(40, 68)` px for standard locomotion and idle cycles.
    - `human.combat`: 100×100 px, anchor `(50, 78)` px for combat swings, strikes, falls, and guard stances.
    - `human.wide`: 144×144 px, anchor `(72, 112)` px for extended range spellcasting, spins, and full-body animations.
  - Documented ground contact point stability invariants and screen coordinate projection formula:
    $$\text{ScreenX} = \text{ProjectedX} - \text{AnchorX} + \text{TrimX}$$
    $$\text{ScreenY} = \text{ProjectedY} - \text{AnchorY} + \text{TrimY}$$
  - Documented runtime layer composition invariants for face sidecar registration alignment, socket coordinate bounding within canvas boundaries, and held weapon grip offsets.
  - Commit: `c1c2dc96`.

# Evidence

- `npm run check:hygiene`: 0 errors, 0 warnings.
- `npm run typecheck`: clean (0 errors).
- `npm run check:architecture`: passed (simulation domain strictly decoupled from presentation).
- `npm run check:assets`: passed (4024 frames, 3 full pages, Aqualia declared HD 19/19).
- `npm test`: 52/52 test suites passed, 593/593 tests passed (11.71s).
- `vite build`: built cleanly in 5.42s.
- Visual inspection: `art/source/forge/work/selftest-human/contact.png` opened and verified (PRD-5.2): 19 clips, 13-colour palette, clean outlines and grounded footprints across all directions.
- Pushed commits on `studio/doctrine-v1`: `0d54b060`, `cc8d06d6`, `681f8cd9`, `c1c2dc96`.

# Gaps

- None in this batch; candidate implementations are ready for Codex / Claude peer engineering review under TEAM-4.2.
