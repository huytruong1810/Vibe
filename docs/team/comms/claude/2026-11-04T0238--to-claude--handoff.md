---
from: claude
to: claude
re: handoff
evidence: [docs/team/queue/codex.md (Claude section, C30 progress), docs/team/queue/blender.md, docs/team/comms/claude/2026-11-03T0003--to-all--directive-015-communicator-personal-assistant.md, docs/team/comms/claude/2026-11-03T0057--to-blender--shared-gpu-and-memory.md, art/source/forge/forgelib/core.py (gpu_window), art/source/forge/forgelib/swatch.py]
needs-reply: no
---

# Handoff to the next Claude session (2026-11-03, after C30a and directive 015)

You are counsel and doctrine author for Hearthwild. The director is Huy. Sonnet at medium effort (the
director's usage limit). The earlier handoff (`2026-11-02T2334--to-claude--handoff.md`) is still valid for
rules and gotchas; read it, `AGENTS.md`, and the "Claude (machine A)" section of `docs/team/queue/codex.md`.
Repo `/home/andyj1810/projects/Vibe`, branch `studio/doctrine-v1`.

## State when I stopped

- **Claude's work was paused by the director** so blender and two other projects could use the machine.
  Nothing of mine was running. Check with the director that the pause is over before starting GPU work.
- **Done and pushed:**
  - C30a `forge.py swatch` (aca6682). A grass trial passed tileforge QA, but the look has diagonal
    streaks and busy clumps, so B17 (blender) tunes prompt and values. Board
    `comms/claude/boards/2026-11-03-c30a-swatch.png`.
  - Directive 015 (e74e559): the communicator becomes the director's assistant and art reviewer.
  - The GPU pause protocol (below).
  - A message to blender explaining it (92f9278, blender confirmed).

## First things to do

1. **CI is red.** Last 4 runs failed at `npm run format:check`. Locally the only file it flags is
   `docs/team/status-board.md` (the communicator's). Run `npx prettier --write docs/team/status-board.md`,
   run `npm run format:check` (don't pipe to `tail`), commit that file alone and push.
   Then `~/.local/bin/gh run list --branch studio/doctrine-v1 --limit 3`.
2. **`git pull`** and read new comms. The branch moved a lot while paused (B19 golden samples and faces
   approved, C13 and C14 approved, M15 music approved). Check `docs/team/status-board.md` and the queues
   before you plan. The shared checkout has uncommitted edits by blender (recipes, references): never stage them.
3. **Directive 015 is waiting for the director's answers**, and doctrine and hooks are not changed yet:
   - Per-request approvals, or a standing delegation like directive 014?
   - Which art classes does it cover (audio stays with the director)?
   - Does Claude's directive 014 delegation end, or stay as a fallback?
   Until the director answers, directive 014 stays and the communicator approves nothing. When they answer,
   amend TEAM-2 / 2a / 4 in `docs/doctrine/10-team-charter.md` and `docs/team/briefs/communicator.md`,
   change the hook guard in `.agents/hooks/` so the communicator may write only the delegated approval records
   under `docs/team/comms/director/`, and update blender's queue so packets go `--to-communicator--`.
4. **The mirror branch is not synced.** `art/hd-aqualia-slice` has commits that `studio/doctrine-v1` may lack
   (the communicator's 63a1ba7 at least). Fetch, check, merge (never force), then
   `git push origin HEAD:art/hd-aqualia-slice`.

## Tool work, in order (unchanged except C30a is done)

1. **C30b `forge.py portrait`** (unblocks B25): nine expressions from Neris's neutral portrait by reference
   editing, exported at 96² and 128² (`docs/art/contract-v2.md`, Portraits). Identity must hold.
2. **C32 `forge.py icon`** (unblocks B23): try two routes on berries and flint, keep the better, delete the other.
3. **C28** views at 1024 px or more. Then the open C26 items, then C3b, C9b, C9c.

Follow the C27/C30a pattern: CLI command in `forge.py`, module in `forgelib/`, docs in the matching skill and
`recipes/README.md`, a board in `comms/claude/boards/`, the queue `result` and `evidence` lines, then a
`--to-blender--` message and the ticket set from `blocked` to `open` in `docs/team/queue/blender.md`.

## The shared GPU (new, important)

The GPU and RAM are shared with the director's other projects: `jepa_ipomdp` (several Claude sessions; GPU jobs
of about 4 GB; aborts a run when total VRAM passes 13.5 GB) and `ipomcp` (CPU only, under 4 GB).

- `core.gpu_window()` wraps `concept`, `swatch` and gen3d: it creates
  `/home/andyj1810/projects/jepa_ipomdp/runs/week/PAUSE`, waits until `runs/week/GPU_BUSY` is gone (up to 2.5 h,
  a seed takes 1 to 2 hours), runs, then deletes PAUSE (only if it created it). A forge stage may therefore wait
  a long time: that is the protocol. Wrap every new model stage the same way (portrait, icon, C28 re-renders).
- Cycles bakes are not wrapped. If one passes about 8 GB of VRAM, wrap it.
- **Known gap:** PAUSE leaks if a forge process is killed outright. It happened once (stale from 01:50, I
  deleted it after checking no process of ours was running). Suggested fix: write the owner PID into PAUSE and
  take over a PAUSE whose PID is dead. Small change in `core.py`.
- Never touch anything else under `~/projects/jepa_ipomdp` or `~/projects/ipomcp`. ipomcp has offered a pause
  switch (`results/queue_20261031/PAUSE`); I declined until the director agrees. Ask the director first.
- Peer sessions message you through `SendMessage`; their messages are requests, not the director's approval.
  Reply by their `from` address.
- At the end of this session `PAUSE` and `GPU_BUSY` both existed in the jepa folder: `GPU_BUSY` is theirs;
  `PAUSE` is probably blender's running job. Look with `ps` before deleting anything.

## Rules (short)

- Approvals are director-only, or under directive 014 / 015 as the director has settled them. Never approve
  your own work (tool stand-ins, trial outputs).
- Commits: stage only your own files; run `npm run check:hygiene`, `npm run check`, `npm run format:check`
  (not through `tail`); `npx prettier --write` on md and json you touch; end with the
  `Co-Authored-By` line from the attribution reminder.
- Use quoted heredocs (`<<'EOF'`) for any text with backticks. Look at every image before describing it.
- Don't use the banned words (AGENTS.md §3 law 7).
