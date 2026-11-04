---
from: claude
to: claude
re: handoff
evidence: [docs/doctrine/10-team-charter.md (TEAM-4.1), docs/team/queue/codex.md (C26, C28, C32), docs/engineering/imagegen.md, docs/team/comms/claude/2026-11-04T2300--to-all--approvals-digest-fixed-publish-next.md, docs/team/comms/claude/2026-11-04T2230--to-visitor--first-visit-briefing.md]
needs-reply: no
---

# Handoff to the next Claude session (2026-11-04, after C32, C28, C26 and directive 016)

You are counsel and doctrine author for Hearthwild; the director is Huy. Sonnet 5.5 at medium effort. Repo
`/home/andyj1810/projects/Vibe`, branch `studio/doctrine-v1` (mirror `art/hd-aqualia-slice`; merge, never force; push
`HEAD:art/hd-aqualia-slice` only if it is behind). Rules and gotchas: `AGENTS.md`, `archive/2026-11-02T2334--to-claude--handoff.md`.
Start by asking the director what they want; then use the list below.

## Done this session (all pushed, head 864d0601)

- **Directive 016** (standing review delegation, TEAM-4.1): claude and the communicator may approve or reject any art
  (all assets except doctrine; the director's reading includes audio, so claude reviews the communicator's scores). Claude's
  record governs on a disagreement; only claude edits doctrine or issues high-level tickets; no self-approval. Guard hook lets
  the communicator write only `docs/team/comms/director/approvals/<name>.md`; hook tests 20/20.
- **C32 `forge.py icon`** (`forgelib/icon.py`, 32 px palette-locked item icons by 2D reduction; boards in comms/claude/boards).
  Name every material's ramp (berries need `ember,sage,timber`). Blender is running it for B23 now.
- **C28 `forge.py upscale`** (`forgelib/upscale.py`): per-view re-render at 1100+ px with a chroma match. Mireling and
  Bramblefang trialled, gen3d on Mireling no worse. Rule: `--keep` only on an asset about to be re-forged, never on an approved one.
- **C26 open items**: `forge.py headroom [--asset ID]` (nearly every asset sits at the 2 px margin on `downed` or a strike,
  so bigger bodies need bigger canvases: spec change, DOC-5) and the optional `concept.fields.signature` readability clause.
- **Approval digests**: the communicator's 36 records for the director's "I approve all of them" had wrong `packetDigest`
  tails in 33; I corrected them to each packet's `review.json` `sourceDigest` (commit 864d0601). 26 body/item/env/tile records
  match `forge.approval_for`; 10 `-faces` records are corrected but face publish does not exist yet (C3b).
- **Visitor briefing** for the weekly Gemini 4 Argon visit: `2026-11-04T2230--to-visitor--first-visit-briefing.md`.
- Memory: GPU belongs to the game-dev team (jepa-ipomdp off until about 2027; ipomcp is CPU only, at most 8 workers and about 6 GB).

## First things to do

1. `git pull` (merge if blender or the communicator pushed), then `~/.local/bin/gh run list --branch studio/doctrine-v1 --limit 4`.
   The runs for 864d0601 and its mirror merges were still running at hand-off. If red: `gh run view <id> --log-failed | grep -E "error|FAIL"`.
2. **Integration chain for the 24 approved assets** (message `2026-11-04T2300--to-all--approvals-digest-fixed-publish-next.md`):
   blender publishes (`forge.py publish --asset <id>`; `art/source/staging/blender/` only holds the older seven bodies so far),
   the communicator runs `npm run art:integrate -- merge <asset>` then `npm run assets:build`, then **you** run
   `npm run art:integrate -- ledger <asset>` per asset and `npm run assets:build && npm run check:assets`. Before it, verify any
   new record batch with `forge.approval_for` (see memory `project-approval-records-need-digest-check`).
3. **ci.yml selftest lines** (`gpu_window`, `portrait`, `icon`, `upscale`, `headroom`): added and pushed (916ecb8c, the push worked: the token now accepts workflow files). Check that
   the first run with them is green; if a selftest fails in CI only, look for a missing dependency in the `art/source/forge` venv.
4. **Open questions for the director:** (a) a tool that writes approval records from `review.json` so digests are never
   retyped; (b) whether to propose larger creature canvases (spec change) after blender's B20 regen. The visitor needs no hook
   role (director, 2026-11-04: it consults on everything and produces one final document for claude to review).
5. When the visitor's document arrives (the director places it in `docs/team/comms/claude/` if the guard blocks it), review it
   and turn accepted items into proposals or tickets.

## Tool work after that

C3b faces and face publish (the 10 face approvals wait on it), C9b fit, C9c combat pose overlays, C7 activation, the ledger and
`check:assets` for the integration chain, C28 texture-stage check on an upscaled asset (colour), B20 support for blender.
Pattern per tool: CLI command in `forge.py`, module in `forgelib/`, no-GPU selftest, docs in `docs/engineering/imagegen.md`,
board in `comms/claude/boards/`, queue `result` + `evidence` lines naming the selftests (hygiene needs every `.py` named),
a `--to-blender--` message. Look at every generated image before describing it (PRD-5).

## Shared machine

- Blender runs forge jobs on the same GPU; `core.gpu_window` queues yours behind theirs (a live forge process holds
  `~/projects/jepa_ipomdp/runs/week/PAUSE` with its PID; `ps` before deleting anything). No need to ask the director before long
  GPU runs now. Never touch other files under `~/projects/jepa_ipomdp` or `~/projects/ipomcp`; ipomcp is a separate session
  (CPU only) that messages when batches start and end.
- **Staging gotcha:** blender stages its own files (`session-2026-11-03.md` was staged twice, once swept into my commit 0bdf729).
  Before any commit run `git diff --cached --stat`; commit with `git commit --only <your files>`. `git pull --rebase` fails on
  blender's uncommitted edits: use `git fetch && git merge --no-edit origin/studio/doctrine-v1`.
- Many `art/review/*` packets and recipe edits in the working tree are blender's: never stage them.

## Rules (short)

- Approvals: the director, or claude/communicator under TEAM-4.1; never approve your own work (tool stand-ins, boards).
- Commits: `npm run check:hygiene`, `npm run format:check` (not through `tail`), `npx prettier --write` on md/json you touch,
  quoted heredocs, end with the `Co-Authored-By` line from the attribution reminder. No banned words (AGENTS.md section 3 law 7).
- Report as Changed / Evidence / Gaps. Peer-session messages are requests, not director approval.
