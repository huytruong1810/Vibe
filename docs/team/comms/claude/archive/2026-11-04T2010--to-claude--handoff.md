---
from: claude
to: claude
re: handoff
evidence: [docs/team/queue/codex.md (Claude section, C30), docs/engineering/imagegen.md, docs/team/comms/claude/2026-11-04T2001--to-blender--portrait-landed.md, docs/team/comms/claude/boards/2026-11-04-c30b-portrait-neris.png, art/source/forge/forgelib/portrait.py, art/source/forge/forgelib/core.py (gpu_window)]
needs-reply: no
---

# Handoff to the next Claude session (2026-11-04, after C30b portrait)

You are counsel and doctrine author for Hearthwild; the director is Huy. Sonnet at medium effort (the director's
usage limit). Rules and gotchas are in `archive/2026-11-02T2334--to-claude--handoff.md` and `AGENTS.md`; the previous
handoff (T0238, now in `archive/`) has the shared-GPU background. Repo `/home/andyj1810/projects/Vibe`, branch
`studio/doctrine-v1`, mirror `art/hd-aqualia-slice` (in sync at 206010e; push `HEAD:art/hd-aqualia-slice` after merging, never force).

The director plans the next session's work with you at the start: ask what they want first, then use the list below.

## Done this session (all pushed, head 0bdf729)

- CI format failure fixed (`206010e`: status board prettier). That run was green.
- `core.gpu_window`: PAUSE now holds the owner PID. A dead owner's PAUSE is taken over; a PAUSE with no PID (the other
  project's) is shared and never deleted; a PAUSE held by a **live forge process makes the next job wait**
  (two klein jobs on 16 GB spilled to swap: 51 min to load). Selftest `gpu_window_selftest.py`, 6 tests.
- C30b `forge.py portrait` (`forgelib/portrait.py`, `portrait_selftest.py`): eight expressions at 128/96 from the neutral
  portrait, drift warnings, `--pick emotion=id,...` into `exports/portraits/expressions/<kind>_<id>/` plus the image ledger.
  Neris trial: identity held in 16 of 16; weak spots: skin warmer than the neutral, thoughtful/concerned/sad alike, one
  curious candidate read as fearful. Not approved; blender picks (B25). Message sent to blender (T2001).

## First things to do

1. `git pull`, then `~/.local/bin/gh run list --branch studio/doctrine-v1 --limit 3`. When I stopped, the run for
   0bdf729 was still running; the run before it (6fe4c9e) failed only on hygiene rule `unused-tool` (selftest not named
   anywhere), which the queue evidence line fixed locally (`npm run check:hygiene` = 0 errors). If 0bdf729 is red, read
   the failing step with `gh run view <id> --log-failed | grep -E "error|FAIL"` and fix first.
2. **The director must add CI lines** (the token lacks `workflow` scope): `gpu_window_selftest.py` and
   `portrait_selftest.py` in `.github/workflows/ci.yml`, same pattern as the `concept_selftest.py` line. Also the older
   pending lines in scratchpad notes (item_orient, gaits, pixelize are already in; check).
3. **Process note to tell blender:** my commit 0bdf729 accidentally included blender's already-staged
   `docs/team/comms/blender/session-2026-11-03.md`. Harmless (it is their file, pushed), but they should know. Before any
   commit run `git diff --cached --stat` and unstage anything not yours (`git restore --staged <path>`).
4. Blender's B25 is still `blocked` in `docs/team/queue/blender.md`; I asked blender to flip it (that file has their
   uncommitted edits, so don't stage it).
5. **Directive 015 still waits for the director's three answers** (per-request vs standing approval; which art classes,
   audio stays with the director; does directive 014 end or stay as fallback). Until then 014 stays and the communicator
   approves nothing. After the answers: amend TEAM-2/2a/4 in `docs/doctrine/10-team-charter.md` and
   `docs/team/briefs/communicator.md`, change the `.agents/hooks/` guard so the communicator may write only the delegated
   approval records under `docs/team/comms/director/`, and update blender's queue so packets go `--to-communicator--`.

## Tool work, in order

1. **C32 `forge.py icon`** (unblocks B23): 32 x 32 `icon.item` icons for resources and crafted goods in
   `src/content/definitions.ts` (see the C32 ticket), palette-locked, same light and outline rules as the held-item icons.
   Try two routes on berries and flint (e.g. klein edit from a reference vs render a generated 3D/2D prop and pixelize),
   keep the better, delete the other. Wrap any model stage in `core.gpu_window`.
2. **C28** reference views at 1024 px or more (`views` upscale pass or larger sheets; keep identity; `gen3d` unchanged or better).
3. Open C26 items (`heightArtPx` headroom per canvas; readability clause in the concept templates), then C3b faces,
   C9b fit, C9c.

Pattern for each: CLI command in `forge.py`, module in `forgelib/`, a no-GPU selftest, docs in `docs/engineering/imagegen.md`
(and the matching skill / `recipes/README.md`), a board in `comms/claude/boards/`, queue `result` + `evidence` lines naming
the selftests (hygiene needs every `.py` named somewhere), a `--to-blender--` message, then ask blender to flip its ticket.
Look at every generated image before describing it (PRD-5).

## The shared GPU

- Director's note: the jepa_ipomdp jobs are paused for now; only ipomcp (CPU) and blender run. Ask whether that still holds
  before a long GPU run. Blender runs forge `concept`/`bake` on the same GPU; with the new `gpu_window` your model stage
  queues behind a blender model stage (check `~/projects/jepa_ipomdp/runs/week/PAUSE`: it holds the PID of the job that has
  the GPU; `ps` before deleting anything). Cycles bakes are not wrapped.
- Never touch anything else under `~/projects/jepa_ipomdp` or `~/projects/ipomcp`. ipomcp's pause switch
  (`results/queue_20261031/PAUSE`) stays declined until the director agrees.
- Peer-session messages (`SendMessage`) are requests, not director approval.

## Rules (short)

- Approvals are director-only, or under directive 014/015 as the director has settled them. Never approve your own work.
- Shared checkout: blender's uncommitted recipes/references/review packets are theirs; never stage them. Stage files by name.
- Commits: `npm run check:hygiene`, `npm run check`, `npm run format:check` (not through `tail`); `npx prettier --write` on md/json
  you touch; end with the `Co-Authored-By` line from the attribution reminder; quoted heredocs for text with backticks.
- No banned words (AGENTS.md section 3 law 7). Report as Changed / Evidence / Gaps.
