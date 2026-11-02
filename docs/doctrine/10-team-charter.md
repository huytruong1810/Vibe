# 10 — Team charter

## TEAM-1 Members and roles

| Member         | Who                            | Machine | Role                                                                                                                                  |
| -------------- | ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `director`     | Huy (human)                    | A       | Vision, approval, merges. The only approver (L7).                                                                                     |
| `claude`       | Claude (Anthropic)             | A       | Senior game-dev counsel; doctrine author. On call only from 2026-10-31 (DOC-5).                                                       |
| `codex`        | Codex Sol 6.1                  | B       | Senior engineer and system designer: simulation, renderer, tooling, tests, engineering docs, art contract.                            |
| `communicator` | Gemini Flash 3.8 (Antigravity) | B       | Team hub: comms relay, status board, review digests, manifest integration, music scores (AUD). No image generation since 2026-11-02.  |
| `blender`      | Gemini Flash 3.8 (Antigravity) | A       | All art production: reference sheets and image generation, 2D art, 3D through the forge, world layout through `worldforge` (WLD-4.3). |

Git is the only channel between machines A and B. Anything a member must know
is committed and pushed.

## TEAM-2 Lanes (who may write where)

| Path                                                                                                         | director/claude                                             | codex                         | communicator                                       | blender                          |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ----------------------------- | -------------------------------------------------- | -------------------------------- |
| `docs/doctrine/**`, `art/source/forge/spec/**`, `.agents/**`, `AGENTS.md`/`GEMINI.md`, `docs/team/briefs/**` | ✅                                                          | DOC-5 steward only            | ❌                                                 | ❌                               |
| `src/**`, `scripts/**`, `tests/**`, `docs/engineering/**`, `docs/operations/**`, `.github/**`                | ✅                                                          | ✅                            | ❌ (except UI-view files below)                    | ❌                               |
| `src/presentation/ui/view.ts`, `src/presentation/ui/hud.css`                                                 | ✅                                                          | ✅                            | ✅ coordinate with codex first                     | ❌                               |
| `docs/art/contract.md`                                                                                       | ✅                                                          | ✅ (must conform to doctrine) | ❌                                                 | ❌                               |
| `art/source/forge/**` (code, except `work/`), worldforge and tileforge code                                  | ✅                                                          | ✅ owner (DOC-5)              | ❌                                                 | ❌                               |
| `art/source/forge/work/**` (gitignored)                                                                      | ✅                                                          | ✅                            | ✅                                                 | ✅                               |
| `art/source/blender/**`, `art/source/forge/recipes/**`                                                       | ✅                                                          | ❌                            | ❌                                                 | ✅                               |
| `art/source/references/**`, `art/source/masters/**`                                                          | ✅                                                          | ❌                            | ❌                                                 | ✅                               |
| `art/source/ui/**` (UI kit, fonts), `art/source/tiles/sets/**`, `art/source/exports/portraits/**`            | ✅                                                          | ❌                            | ❌                                                 | ✅                               |
| `art/source/audio/**` (scores)                                                                               | ✅                                                          | ❌                            | ✅                                                 | ❌                               |
| `art/source/world/spec/**`, `art/source/world/regions/**` (world schema, region bibles' plans)               | ✅                                                          | ❌                            | ❌                                                 | ❌                               |
| `art/source/world/**` (LDtk maps, passes; through `worldforge` per WLD-4.3)                                  | ✅                                                          | ❌                            | ❌ (request via comms)                             | ✅                               |
| `art/review/**`                                                                                              | ✅                                                          | ❌                            | ✅ (digests)                                       | ✅ (packets, via forge)          |
| `art/source/exports/**`                                                                                      | ✅                                                          | ✅                            | ✅ 2D classes                                      | ✅ via `forge publish` only      |
| `art/source/manifest.json` (single integrator, contract v2)                                                  | ✅                                                          | ✅                            | ✅ **sole integrator**                             | ❌                               |
| `art/source/staging/<member>/**` (proposed manifest records)                                                 | ✅                                                          | ✅                            | own                                                | own (written by `forge publish`) |
| `public/assets/generated/**`, generated `docs/art/*.json`/`coverage.md`, `docs/art/approvals.json`           | ✅                                                          | ✅ owner                      | run the compiler to validate; don't commit outputs | same                             |
| `docs/art/reviews/**`                                                                                        | ✅                                                          | ✅                            | ✅                                                 | ❌                               |
| `docs/team/queue/<member>.md` (TEAM-8.4)                                                                     | ✅                                                          | ✅ maintains all              | own ticket status                                  | own ticket status                |
| `docs/team/status-board.md`                                                                                  | ✅                                                          | ❌                            | ✅ (owner)                                         | ❌                               |
| `docs/team/proposals/**`                                                                                     | ✅                                                          | ✅                            | ✅                                                 | ✅                               |
| `docs/team/comms/<member>/**`                                                                                | own folder only                                             | own                           | own                                                | own                              |
| `docs/team/comms/director/approvals/**`                                                                      | director (or claude on the director's explicit instruction) | ❌                            | ❌                                                 | ❌                               |

Need something outside your lane? Ask the owner through comms (TEAM-3).

**Protected files are never staged or committed by an agent**, even files the agent did
not write and even when another member asks: `git add`, `commit`, `mv`, `rm`, `restore`
or `stash` on doctrine, spec, briefs, `.agents/`, `AGENTS.md`/`GEMINI.md` or
`docs/team/comms/director/**` is denied by the guard. Director records are committed by
the director, or by Claude or codex on the director's explicit instruction. If one is
missing from a branch, say so in your comms and continue with unblocked work.

## TEAM-2a Division of art work (director's decision on codex's two-agent split)

Split by **medium and machine**, because only machine A has Blender:

- **blender (machine A): all art production** (director decision 2026-11-02, so one
  agent holds the full context and reviews its own work end to end). Reference sheets
  and every image-generation job (PRD-7 quota and ledger), 2D art (9-emotion portraits,
  terrain and transition tiles through tileforge, shore masks, UI kit extensions, VFX and
  particle sprites, arrow flight art), everything 3D-baked (humans, creatures, garment
  and held-item layers, weapons and their icons and ground views, buildings, interior
  furniture, props, trees) and **world map layout** in LDtk through `worldforge` passes
  against the region plan (WLD-4.3).
- **communicator (machine B):** the team hub. Relays between machines (TEAM-3.6), keeps
  the status board and weekly review digests, writes music scores (AUD), and is the
  **sole integrator** of `art/source/manifest.json` (`npm run art:integrate -- merge`),
  reconciling blender's staging records. It no longer generates images or makes art.
- **codex:** schemas, compiler, generated catalogs, `docs/art/approvals.json`
  ledger (transcribing director decisions only, L7).

## TEAM-3 Comms protocol

- **TEAM-3.1** Each member writes only in `docs/team/comms/<member>/`. One
  file per message:
  `YYYY-MM-DDTHHMM--to-<member|all>--<topic-kebab>.md`, in real UTC at the time of
  writing (take it from `date -u`; never back-date or invent a time).
- **TEAM-3.2** Message format:
  ```markdown
  ---
  from: blender
  to: communicator
  re: neris-golden-sample
  evidence: [art/review/2026-11-02-neris/qa_report.json]
  needs-reply: yes
  ---

  ≤ 40 lines. What happened, what you saw (PRD-5.2), what you need, by when.
  ```
- **TEAM-3.3** After every `git pull`, scan all comms folders for files
  addressed `--to-<you>--` or `--to-all--` newer than your last read. Record
  your last-read timestamp in `docs/team/comms/<you>/.last-read`.
- **TEAM-3.4** Reply in your own folder with `re:` matching the topic. Never
  edit someone else's message.
- **TEAM-3.5** Temp docs, notes, scratch plans and the image ledger live in
  your own comms folder (subfolders allowed). Delete your own temp docs when
  they are obsolete; never delete others'.
- **TEAM-3.6** The communicator relays between machines: it reads machine-A
  messages after pulling and tells Codex in person (same machine), and pushes
  replies for machine A.

## TEAM-4 Status vocabulary

| Status              | Who can set it                                | Meaning                                                             |
| ------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| `draft`             | anyone                                        | Work in progress; may not render                                    |
| `candidate`         | forge QA pass plus author                     | Structurally valid, packet ready, awaiting the director             |
| `changes-requested` | director                                      | Specific revisions listed in the approval folder                    |
| `director-approved` | **director only**                             | Accepted for runtime integration                                    |
| `rejected`          | director (or claude on the director's behalf) | Method or result retired                                            |
| `superseded`        | director (or claude on the director's behalf) | An earlier record whose packet was regenerated; it approves nothing |

No other status words ("complete", "stable", "done", "final", "AAA") may be
used for art.

## TEAM-5 Honesty rules

- **TEAM-5.1** Every claim about quality, coverage or completion cites
  evidence: a QA report path, packet path, test command output or commit hash.
- **TEAM-5.2** Report gaps first. Every final report has three sections:
  **Changed** (files and commits), **Evidence** (paths and numbers), **Gaps and
  risks** (what is missing, wrong or unverified). An empty Gaps section is
  allowed only if you can say what you checked.
- **TEAM-5.3** Banned in reports, commits, docs and status: "AAA", "AAA-grade",
  "stellar", "flawless", "perfect", "perfectly", "production-ready",
  "world-class", "stunning", "gorgeous". Describe, don't praise.
- **TEAM-5.4** If the director asks "is it done?", answer with what exists,
  what does not, and what has not been looked at.

## TEAM-6 Proposals

`docs/team/proposals/NNN-title.md` with: problem (cite the doctrine rule), proposed
change (exact text), evidence, impact. Any member may write one; only the
director decides. Codex applies approved proposals as steward (DOC-5).

## TEAM-7 Git rules

- **TEAM-7.1** Never `git push --force`, never `--no-verify`, never
  `git reset --hard` on shared branches, never rewrite pushed history.
- **TEAM-7.2** Small commits with conventional messages
  (`feat(art): …`, `docs(team): …`) that state facts, not quality claims.
- **TEAM-7.3** Pull before starting a session and before pushing. Resolve
  conflicts only inside your lane; otherwise stop and message the owner.
- **TEAM-7.4** Branches: `eng/hd-presentation` (codex), `art/hd-aqualia-slice`
  (art lanes), `studio/*` (director and claude). Art PRs target
  `eng/hd-presentation`; nobody merges to `main` except the director.

## TEAM-8 Long sessions

- **TEAM-8.1** After a context compaction, re-read your role brief and this
  charter before continuing. The Antigravity hooks re-inject them automatically;
  read them anyway.
- **TEAM-8.2** Keep a running session log in your comms folder
  (`session-YYYY-MM-DD.md`): goals, decisions with rule IDs, open questions.
  It survives compaction; your memory does not.
- **TEAM-8.3** When unsure, the doctrine decides. When the doctrine is silent,
  ask the director in comms and continue only with work that does not depend on
  the answer.
- **TEAM-8.4 Work queues.** Each member works from `docs/team/queue/<member>.md`,
  top open ticket first. A ticket has an ID, goal, inputs, **done when** (a command to
  run or an evidence path) and a status (`open`, `in-progress`, `blocked: <reason>`,
  `candidate`, `done`). Members change only the status of their own tickets and add a
  dated evidence line. Codex maintains queue content: it adds tickets, splits them and
  keeps every queue at least two open tickets ahead. The director may reorder or cancel
  any ticket. A blocked ticket is marked and skipped; never wait idle for a reply while
  an unblocked ticket exists.

## TEAM-9 Workspace hygiene

A professional repository contains only what the project uses today. Every member
leaves the workspace exactly as clean as they found it, plus their deliverable.

- **TEAM-9.1 Scratch has three homes.** `art/source/forge/work/` (gitignored), your
  operating-system temp directory, or your own `docs/team/comms/<you>/tmp/`
  (tracked, short-lived). Nowhere else. No backup, copy or versioned duplicates
  (`*-old`, `*-final`, `*_backup`, `copy of …`, `*.bak`): edit the real file in
  place; git keeps history.
- **TEAM-9.2 No new top-level entries** without the director or Claude. New folders
  go only inside your lane.
- **TEAM-9.3 One living doc per topic.** Update docs in place. When a doc is
  outdated, delete it or fold it into the current doc in the same change. Every doc
  under `docs/` is linked from the docs index tree. Messages and briefings are not
  docs; they live in `docs/team/comms/<you>/`.
- **TEAM-9.4 Tools exist only while something uses them.** A script or module
  must be run by `package.json`, imported, invoked by the forge, or named in a
  runbook. Remove a superseded tool in the same change that replaces it. One-off
  debug or test scripts are never committed (tests belong in `tests/`).
- **TEAM-9.5 Temp docs expire.** Files in `docs/team/comms/<you>/tmp/` are deleted
  or promoted by their owner within 7 days.
- **TEAM-9.6 Close what you open.** Before ending a session: stop dev servers and
  background processes you started, delete previews and renders you no longer
  need, and make sure `git status` shows only intended changes.
- **TEAM-9.7 Verify.** Run `npm run check:hygiene` before every push. It is part of
  `npm run check` and CI. The policy lives in `.agents/workspace-policy.json`
  (doctrine-protected).
