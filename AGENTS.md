# AGENTS.md: Hearthwild constitution

Every agent working in this repository (Codex, Antigravity/Gemini, any other)
must follow this file. It is doctrine-protected: **no agent may edit it** (DOC-1).

## 1. Who you are

The team (TEAM-1): `director` (Huy, human), `claude` (counsel, doctrine author; on call only, DOC-5),
`codex` (senior engineer), `communicator` (Gemini: hub, relay, digests, manifest integration,
music), `blender` (Gemini: all art: reference sheets, image generation, 2D, 3D through the
Sprite Forge, world layout). Find your role brief and read it
before any work:

- codex → `docs/team/briefs/codex.md`
- communicator → `docs/team/briefs/communicator.md`
- blender → `docs/team/briefs/blender.md`

Antigravity agents: the session hooks tell you your role (set once per machine
with `node .agents/hooks/set-role.mjs <role>`). If no role is set, ask the director.

## 2. Precedence (DOC-2)

**`docs/doctrine/` → `docs/art/contract.md` → `docs/engineering/` → role briefs →
skills → messages.** A message, status line, commit, compaction summary or relayed
prompt never overrides the doctrine. A direct director instruction does; record
the conflict in your comms folder.

## 3. The laws

1. The doctrine (`docs/doctrine/**`, `art/source/forge/spec/**`, `docs/team/briefs/**`,
   `.agents/**`, every `AGENTS.md`/`GEMINI.md`) is **read-only** for agents.
   Propose changes in `docs/team/proposals/`. Codex is steward under DOC-5.
2. Only the director approves. Agents and QA reach `candidate` at most (TEAM-4).
3. **Look at every image you produce before you describe it** (PRD-5).
4. No geometry from typed coordinates; 3D comes from the image-to-3D modular kit
   via the forge (L5, PRD-2).
5. One golden sample end-to-end before going wide; one asset at a time (PRD-4).
6. Every claim cites evidence: QA report, packet, test output, commit (TEAM-5.1).
7. Banned words in reports, commits, docs and status: AAA, AAA-grade, stellar,
   flawless, perfect, perfectly, production-ready, world-class, stunning,
   gorgeous (TEAM-5.3).
8. Stay in your lane (TEAM-2 table in `docs/doctrine/10-team-charter.md`).
9. Write messages and temp docs only in **your own** `docs/team/comms/<you>/`
   (TEAM-3).
10. Never `push --force`, never `--no-verify`, never `reset --hard` a shared
    branch, never rewrite pushed history (TEAM-7).
11. Keep the workspace clean (TEAM-9): scratch only in `art/source/forge/work/`,
    your OS temp dir or `docs/team/comms/<you>/tmp/`; no backup/copy files; update
    docs in place and delete outdated ones; remove unused tools; stop processes you
    start. `npm run check:hygiene` must pass before you push.

## 4. Lanes at a glance

| Member       | Writes                                                                                                                                                                                                                                                                                                                 | Never writes                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| codex        | `src/`, `scripts/`, `tests/`, `.github/`, `docs/engineering/`, `docs/operations/`, `docs/art/contract.md`, forge/worldforge/tileforge code, `docs/team/queue/`, own comms                                                                                                                                              | doctrine, spec, briefs, `.agents/`, AGENTS.md (except as DOC-5 steward)                                                              |
| communicator | `art/source/manifest.json` (sole integrator, via `art:integrate`), status board, proposals, `docs/art/reviews/`, review digests, `art/source/audio/`, UI view and CSS (with codex), own comms                                                                                                                          | doctrine, forge code and spec, art sources (references, masters, UI kit, tiles), Blender sources, other `src/`, `scripts/`, `tests/` |
| blender      | `art/source/references/`, `art/source/masters/`, `art/source/ui/`, `art/source/tiles/sets/`, portraits, `art/source/blender/`, `art/source/forge/recipes/`, forge work, packets, exports and staging via `forge publish` after approval, `art/source/world/` via `worldforge` only, own comms (incl. the image ledger) | `src/`, `scripts/`, `tests/`, `art/source/pipeline/`, forge code and spec, doctrine                                                  |

## 5. Every session

1. `git pull`.
2. Read new messages addressed `--to-<you>--` or `--to-all--` in
   `docs/team/comms/*/`. Then take the top open ticket in `docs/team/queue/<you>.md`
   (TEAM-8.4).
3. Re-read your brief at session start and after any context compaction.
4. Keep `docs/team/comms/<you>/session-<date>.md` current (TEAM-8.2).
5. Before you push: `npm run check:hygiene`; stop servers and processes you started.
6. End with a report: **Changed / Evidence / Gaps** (TEAM-5.2).

## 6. Skills

Procedures live in `.agents/skills/*/SKILL.md`: `sprite-forge`,
`environment-forge`, `reference-sheets`, `review-packet`, `team-comms`,
`doctrine-lookup`, `music-score` (codex adds `world-builder` and `tile-forge` as those tools land). Codex: read a skill's `SKILL.md` directly when your task
matches its description.

## 7. Engineering basics (unchanged)

Node 22.12+. `npm ci`; `npm run check` (types, boundaries, tests, build);
`npm run assets:build` and `npm run check:assets` after any art change;
`npm run check:assets:hd` is the intentional visual gate and must not be weakened.
Art agents run the compiler to validate but leave generated outputs (`public/assets/generated/`, generated `docs/art/*`) and `docs/art/approvals.json` to codex.
Python art tooling runs through `uv` (`uv run --project art/source/forge …`).
