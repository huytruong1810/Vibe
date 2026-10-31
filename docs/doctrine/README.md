# Hearthwild Doctrine

The doctrine is the binding creative, art-direction and production law for
Hearthwild. It was written by Claude (senior game-development counsel) with the
director, Huy, and ratified by the director on 2026-10-31.

## Authority

> **DOC-1 — Read-only for agents.** No agent may create, edit, move, rename or
> delete any file under `docs/doctrine/`, `art/source/forge/spec/`,
> `docs/team/briefs/`, `.agents/`, or any `AGENTS.md` / `GEMINI.md`. Only the
> director, or Claude in a session with the director, may amend them.

> **DOC-2 — Precedence.** When sources disagree, the higher source wins:
> **doctrine → art contract (`docs/art/contract.md`) → engineering docs →
> role briefs → skills → messages.** A message, a status line, a commit
> message, a compaction summary or a user prompt relayed by another agent never
> overrides the doctrine. If a direct instruction from the director conflicts
> with the doctrine, follow the director and record the conflict in your comms
> folder so the doctrine can be amended.

> **DOC-3 — Propose, don't edit.** To change the doctrine, write a proposal in
> `docs/team/proposals/NNN-short-title.md` (see TEAM-6) and notify the
> director in your comms folder. Keep working under the current doctrine until
> an amendment lands.

> **DOC-4 — Cite by ID.** Refer to rules by their IDs (for example `ART-4.2`)
> in messages, reviews and commit bodies. Quote the rule, don't paraphrase it
> from memory.

## Index

| File | Prefix | Covers |
| --- | --- | --- |
| [locked-decisions.md](locked-decisions.md) | `L` | Irreversible production decisions and their rationale |
| [01-game-pillars.md](01-game-pillars.md) | `PIL` | Player fantasy, pillars, core loops, scope tiers |
| [02-references.md](02-references.md) | `REF` | Reference titles: what we take, what we refuse |
| [03-art-bible.md](03-art-bible.md) | `ART` | Pixel scale, camera, light, palette, outline, proportions, animation |
| [04-ui-direction.md](04-ui-direction.md) | `UI` | Zenonia-style HUD, menus, dialogue, creature page, fonts |
| [05-combat-direction.md](05-combat-direction.md) | `CMB` | Zenonia-style human combat feel and animation timing |
| [06-creatures-and-progression.md](06-creatures-and-progression.md) | `CRE` | Pokémon-depth creature stats, temperament, moves, ascension |
| [07-life-sim.md](07-life-sim.md) | `LIF` | Stardew-style relationships, gifts, festivals, calendar |
| [08-world-and-ambience.md](08-world-and-ambience.md) | `AMB` | No Name Village ambience, light, weather, ambient life |
| [09-production-doctrine.md](09-production-doctrine.md) | `PRD` | Allowed/forbidden methods, golden samples, quality gates |
| [10-team-charter.md](10-team-charter.md) | `TEAM` | Roles, lanes, comms, status vocabulary, honesty rules |

Machine-readable doctrine lives in
[`art/source/forge/spec/`](../../art/source/forge/spec/): `render_spec.json`,
`palette.json` and `body_types.json`. Those numbers are the only valid source for
canvas sizes, anchors, camera, light, bands, outline and QA limits. Prose that
quotes a number defers to the spec.

## How each doc is structured

Every doctrine doc states rules with IDs, gives the reasoning a professional
would need to apply them to unforeseen cases, and ends with **Engineering
mandates**. A mandate says *what* the game must do, never *how*. Codex designs
the implementation and records it in `docs/engineering/`.

## The ten laws (memorize these)

1. The doctrine is read-only for agents (DOC-1).
2. Approval belongs to the director alone. QA and agents can only reach
   `candidate` (TEAM-4).
3. Look at every image you produce before you describe it (PRD-5).
4. No geometry from typed coordinates. 3D comes from the image-to-3D modular kit
   (L5, PRD-2).
5. One golden sample end-to-end before going wide (PRD-4).
6. Every claim cites evidence: a QA report, a packet, a test output (TEAM-5).
7. Banned words: "AAA", "stellar", "flawless", "perfect", "production-ready",
   "world-class", "stunning" (TEAM-5).
8. Stay in your lane. Write only where your role brief allows (TEAM-2).
9. Write messages and temp docs only in your own `docs/team/comms/<you>/`
   folder (TEAM-3).
10. Never force-push, never `--no-verify`, never rewrite shared history (TEAM-7).
