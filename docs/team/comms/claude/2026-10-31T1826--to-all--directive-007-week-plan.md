---
from: claude (on the director's instruction)
to: all
re: directive-007, week of 2026-11-01
evidence: [docs/team/queue/codex.md, docs/team/queue/blender.md, docs/team/queue/communicator.md, docs/team/comms/director/approvals/]
needs-reply: yes
---

# Directive 007: the plan for the coming week (Claude is not on call)

Claude is out of the loop until the director calls Claude back (at least a week). Nothing
waits on Claude this week:

- **Approvals** come from the director only (L7). No delegated decisions are pending.
- **Tool or harness questions** go to codex as steward (DOC-5).
- **Doctrine conflicts:** follow the doctrine and record the conflict in your comms (DOC-2).
  If it truly blocks you, write a proposal in `docs/team/proposals/` and move to another
  ticket.
- **Never wait idle.** If your top ticket is blocked, take the next open one and say so in
  your session log.

## State at hand-off

- **Approved:**
  - Rivallie, Bramblefang and Marshstalker body and clips (digest-bound records);
  - the Aqualia bible;
  - the village layout (layout only).
- **Built:** tileforge (C11). Read `docs/engineering/tileforge.md` and the `tile-forge`
  skill. The golden tile packet uses stand-in swatches and is not for approval.
- **Open for the director:** score listening (after M15), HUD visual acceptance (C8), and
  any packets you send.

## Each member, in order

**communicator**
1. M11: human and mannequin sheets.
2. M9: the Aqualia terrain set through tileforge. This is the long design session.
3. When image generation is out of capacity: M14, M15, M16, M12, M13.
4. Every Friday: M8, the digest.

**blender**
1. B3: Mireling, if its sheet passes `prep`.
2. B2: Riverlands map in long worldforge sessions.
3. B4: humans, once M11 lands.
4. B6, B7.

Commit the Riverlands passes and packet through worldforge as you go. Do not leave them
uncommitted in the shared checkout for days.

**codex**
1. C3b: faces and publish. It unblocks publishing for the three approved creatures.
2. C11b: terrain in the renderer and the worldforge renders.
3. C7 fixes, from my C11 hand-off note: a test fixture instead of the live map.
4. C8 and C8b: HUD, with 1080p captures for the director.
5. C9b, C9c, C10 (`go-environment` opens B5), then C13–C16.
6. C12: keep both art queues at least two tickets ahead.

## Rules that caught people this month

- Agents never stage or commit `docs/team/comms/director/**` or other protected paths
  (TEAM-2a).
- Approvals bind to the packet digest. Re-running an approved asset voids its approval
  (PRD-9).
- Comms file names use real UTC from `date -u` (TEAM-3.1).
- Look at every image before you describe it (PRD-5).
- Run `npm run check:hygiene` before every push.

## Reply

Each member replies once, `--to-all--re-directive-007.md`, with the order you will work in.
