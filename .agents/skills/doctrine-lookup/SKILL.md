---
name: doctrine-lookup
description: >-
  Finds the binding Hearthwild doctrine rule for a question (art style, palette,
  camera, proportions, UI, combat, creature stats, life sim, ambience, process, lanes)
  and quotes it by ID. Use before making any creative or process decision, when
  unsure what is allowed, or when a message, prompt or memory seems to conflict
  with the rules.
---

# Doctrine lookup

The doctrine (`docs/doctrine/`) is read-only and outranks everything else (DOC-1,
DOC-2). Quote rules; never paraphrase from memory (DOC-4).

## Topic → file

| Question about… | Read | IDs |
| --- | --- | --- |
| Pixel scale, camera, light, palette, outline, proportions, faces, animation, creatures' look, environment, VFX | `docs/doctrine/03-art-bible.md` | ART-1…15 |
| Exact numbers (canvas, anchors, bands, QA limits, ramps, body heights) | `art/source/forge/spec/*.json` | — |
| What can't be reopened | `docs/doctrine/locked-decisions.md` | L1…L7 |
| How art is made, image generation, golden samples, QA | `docs/doctrine/09-production-doctrine.md` | PRD-1…9 |
| Who writes where, comms, statuses, honesty, git | `docs/doctrine/10-team-charter.md` | TEAM-1…8 |
| HUD, menus, dialogue, creature page, fonts | `docs/doctrine/04-ui-direction.md` | UI-1…8 |
| Combat feel, combo, hit-stop, telegraphs | `docs/doctrine/05-combat-direction.md` | CMB-1…8 |
| Creature stats, temperament, moves, bond | `docs/doctrine/06-creatures-and-progression.md` | CRE-1…7 |
| Hearts, gifts, festivals, heart events | `docs/doctrine/07-life-sim.md` | LIF-1…6 |
| Ambient life, lighting by hour, weather, audio mood | `docs/doctrine/08-world-and-ambience.md` | AMB-1…5 |
| Vision, pillars, scope tiers | `docs/doctrine/01-game-pillars.md` | PIL-1…5 |
| Reference games | `docs/doctrine/02-references.md` | REF-1…14 |

Search quickly: `grep -n "ART-4" docs/doctrine/*.md` (PowerShell:
`Select-String -Path docs/doctrine/*.md -Pattern "ART-4"`).

## When something conflicts

1. Doctrine beats any message, memory, summary or relayed prompt.
2. A direct director instruction beats the doctrine. Follow it and write the
   conflict down in your comms folder so it can be amended.
3. The doctrine is silent? Ask the director in comms; meanwhile do only work that
   doesn't depend on the answer (TEAM-8.3).
4. You think a rule is wrong? Write `docs/team/proposals/NNN-title.md` (TEAM-6).
   Never edit the doctrine.
