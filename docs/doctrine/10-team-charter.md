# 10 — Team charter

## TEAM-1 Members and roles

| Member         | Who                            | Machine | Role                                                                                                                              |
| -------------- | ------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `director`     | Huy (human)                    | A       | Vision, approval, merges. The only approver (L7).                                                                                 |
| `claude`       | Claude (Anthropic)             | A       | Senior game-dev counsel; doctrine author; harness and forge architect.                                                            |
| `codex`        | Codex Sol 6.1                  | B       | Senior engineer and system designer: simulation, renderer, tooling, tests, engineering docs, art contract.                        |
| `communicator` | Gemini Flash 3.8 (Antigravity) | B       | Team hub: comms relay, status board, review digests, reference sheets and image generation, 2D art (terrain, UI, VFX, portraits). |
| `blender`      | Gemini Flash 3.8 (Antigravity) | A       | 3D production through the forge: gen3d, rigging, fitting, baking, environment models.                                             |

Git is the only channel between machines A and B. Anything a member must know
is committed and pushed.

## TEAM-2 Lanes (who may write where)

| Path                                                                                                         | director/claude                                             | codex                         | communicator                                       | blender                          |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ----------------------------- | -------------------------------------------------- | -------------------------------- |
| `docs/doctrine/**`, `art/source/forge/spec/**`, `.agents/**`, `AGENTS.md`/`GEMINI.md`, `docs/team/briefs/**` | ✅                                                          | ❌                            | ❌                                                 | ❌                               |
| `src/**`, `scripts/**`, `tests/**`, `docs/engineering/**`, `docs/operations/**`, `.github/**`                | ✅                                                          | ✅                            | ❌ (except UI-view files below)                    | ❌                               |
| `src/presentation/ui/view.ts`, `src/presentation/ui/hud.css`                                                 | ✅                                                          | ✅                            | ✅ coordinate with codex first                     | ❌                               |
| `docs/art/contract.md`                                                                                       | ✅                                                          | ✅ (must conform to doctrine) | ❌                                                 | ❌                               |
| `art/source/forge/**` (code, except `work/`)                                                                 | ✅                                                          | ✅ on claude's request        | ❌                                                 | ❌                               |
| `art/source/forge/work/**` (gitignored)                                                                      | ✅                                                          | ✅                            | ✅                                                 | ✅                               |
| `art/source/blender/**`, `art/source/forge/recipes/**`                                                       | ✅                                                          | ❌                            | ❌                                                 | ✅                               |
| `art/source/references/**`, `art/source/masters/**`                                                          | ✅                                                          | ❌                            | ✅                                                 | ❌ (request via comms)           |
| `art/review/**`                                                                                              | ✅                                                          | ❌                            | ✅ (digests)                                       | ✅ (packets, via forge)          |
| `art/source/exports/**`                                                                                      | ✅                                                          | ✅                            | ✅ 2D classes                                      | ✅ via `forge publish` only      |
| `art/source/manifest.json` (single integrator, contract v2)                                                  | ✅                                                          | ✅                            | ✅ **sole integrator**                             | ❌                               |
| `art/source/staging/<member>/**` (proposed manifest records)                                                 | ✅                                                          | ✅                            | own                                                | own (written by `forge publish`) |
| `public/assets/generated/**`, generated `docs/art/*.json`/`coverage.md`, `docs/art/approvals.json`           | ✅                                                          | ✅ owner                      | run the compiler to validate; don't commit outputs | same                             |
| `docs/art/reviews/**`                                                                                        | ✅                                                          | ✅                            | ✅                                                 | ❌                               |
| `docs/team/status-board.md`                                                                                  | ✅                                                          | ❌                            | ✅ (owner)                                         | ❌                               |
| `docs/team/proposals/**`                                                                                     | ✅                                                          | ✅                            | ✅                                                 | ✅                               |
| `docs/team/comms/<member>/**`                                                                                | own folder only                                             | own                           | own                                                | own                              |
| `docs/team/comms/director/approvals/**`                                                                      | director (or claude on the director's explicit instruction) | ❌                            | ❌                                                 | ❌                               |

Need something outside your lane? Ask the owner through comms (TEAM-3).

## TEAM-2a Division of art work (director's decision on codex's two-agent split)

Split by **medium and machine**, because only machine A has Blender:

- **blender (machine A):** everything 3D-baked: humans, creatures, garment and
  held-item layers, weapons and their icons and ground views, buildings,
  interior furniture models, cave and regional props, trees.
- **communicator (machine B):** everything 2D: reference sheets, 9-emotion
  portraits, terrain and transition tiles, shore masks, UI views and frames,
  VFX, arrow flight art. Also **sole integrator** of `art/source/manifest.json`,
  reconciling blender's staging records (codex's recommendation).
- **codex:** schemas, compiler, generated catalogs, `docs/art/approvals.json`
  ledger (transcribing director decisions only, L7).

## TEAM-3 Comms protocol

- **TEAM-3.1** Each member writes only in `docs/team/comms/<member>/`. One
  file per message:
  `YYYY-MM-DDTHHMM--to-<member|all>--<topic-kebab>.md` (UTC).
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

| Status              | Who can set it                                | Meaning                                                 |
| ------------------- | --------------------------------------------- | ------------------------------------------------------- |
| `draft`             | anyone                                        | Work in progress; may not render                        |
| `candidate`         | forge QA pass plus author                     | Structurally valid, packet ready, awaiting the director |
| `changes-requested` | director                                      | Specific revisions listed in the approval folder        |
| `director-approved` | **director only**                             | Accepted for runtime integration                        |
| `rejected`          | director (or claude on the director's behalf) | Method or result retired                                |

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
director and Claude act on it.

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
