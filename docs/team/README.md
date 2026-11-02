# Team workspace

The mutable part of the docs. Rules: [team charter](../doctrine/10-team-charter.md).

| Path                                                            | Who writes                                             | What                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| [comms/&lt;member&gt;/](comms)                                 | that member only                                       | Messages, session logs, image ledger, temp docs (TEAM-3) |
| [comms/director/approvals/](comms/director/approvals/README.md) | director (or claude on instruction)                    | The only valid approval records (L7)                     |
| [status-board.md](status-board.md)                              | communicator (director, claude)                        | Asset and workstream status; every line cites evidence   |
| [queue/](queue/README.md)                                       | codex maintains; each member updates own ticket status | Ordered work per member (TEAM-8.4)                       |
| [proposals/](proposals/README.md)                               | anyone                                                 | Doctrine change proposals (TEAM-6)                       |
| [briefs/](briefs)                                              | director + claude only                                 | Role briefs (doctrine-protected, DOC-1)                  |

## Daily loop for every agent

1. `git pull`.
2. Read new messages addressed `--to-<you>--` or `--to-all--` in every
   `comms/*/` folder; update your `.last-read`.
3. Re-read your brief if you have just started, or after a compaction.
4. Take the top open ticket in `queue/<you>.md` and work it in your lane. Log
   decisions in `comms/<you>/session-<date>.md`.
5. Report with Changed / Evidence / Gaps (TEAM-5.2); commit; pull; push.
