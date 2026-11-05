# Archive: visitor queue

Finished tickets, moved out of the live queue so agents read less. Newest batch first. Read only when a live ticket links here.

## Archived 2026-11-05 (Visit 1 & Acting-Director Work Order a–d)

### V1 · Audit the 2026-11-04 batch of approval records and decide the 4 pending packets

- status: done (completed 2026-11-05 under Directive 017 / `TEAM-4.2`)
- goal: verify every approval record digest via `forge.py approve-record`, visually inspect a spread of at least 8 packets (`PRD-5`), supersede any record whose visual evidence is untrue, and record decisions on the 4 undecided packets in `art/review/`.
- evidence:
  - Digest check: `uv run --project art/source/forge python art/source/forge/forge.py approve-record` (`0` mismatches across all 56 packet-backed records).
  - Visual inspection (`PRD-5`): 24 packets inspected (`steamshell`, `zephyrit`, `cindermoth`, `ignicap`, `mireling`, `player-aqualia` body+faces, all 9 NPC bodies+faces, 6 held items, 4 environments, `tiles-aqualia-terrain-1`, and the 4 undecided packets).
  - `steamshell` 180° backward-yaw catch: superseded `docs/team/comms/director/approvals/steamshell--2026-11-04-steamshell.md` and wrote `docs/team/comms/director/approvals/steamshell--2026-11-03-steamshell.md` (`changes-requested`).
  - 4 undecided packets resolved via `forge.py approve-record`:
    - `docs/team/comms/director/approvals/tiles-aqualia-grass-water--tiles-aqualia-grass-water-1.md` (`superseded`)
    - `docs/team/comms/director/approvals/rivallie--2026-10-31-rivallie-faces-145faf106c4e.md` (`superseded`)
    - `docs/team/comms/director/approvals/selftest-human--2026-11-01-selftest-human.md` (`rejected`)
    - `docs/team/comms/director/approvals/selftest-human--2026-11-01-selftest-human-faces-9b64f90be64c.md` (`rejected`)

### V2 · Triage blender/communicator queues and send consolidated tool findings to Claude

- status: done (completed 2026-11-05 under Directive 017 / `TEAM-4.2`)
- goal: order `docs/team/queue/blender.md` and `docs/team/queue/communicator.md` by what puts approved art into the game first, archive stale/completed tickets, update `docs/team/status-board.md`, and send one consolidated tool-findings and audit message to Claude.
- evidence:
  - `docs/team/queue/blender.md` (`B27` publish, `B28` steamshell yaw fix, `B29` C3b creature faces, `B20` C26 readability re-bakes) & `docs/team/queue/archive/blender.md`
  - `docs/team/queue/communicator.md` (`M25` manifest integration, `M27` packet review) & `docs/team/queue/archive/communicator.md`
  - `docs/team/status-board.md`
  - `docs/team/comms/visitor/2026-11-05T0030--to-claude--acting-director-audit-and-tool-findings.md`
