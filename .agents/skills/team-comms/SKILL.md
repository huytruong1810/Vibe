---
name: team-comms
description: >-
  Reads and writes Hearthwild team messages across the two machines through git
  (docs/team/comms/<member>/), keeps the status board evidence-based, and formats
  end-of-task reports. Use at the start and end of every session, whenever another
  member needs to know something, or when asked for a status update.
---

# Team comms (doctrine TEAM-3, TEAM-4, TEAM-5)

Machines A (Linux: director, claude, blender) and B (Windows: communicator,
codex) share **only git**. If it isn't committed and pushed, the other machine
doesn't know it.

## Read (start of session)

1. `git pull`
2. Find new messages for you (replace `<you>`):
   - bash: `ls docs/team/comms/*/ | grep -E -- '--to-(<you>|all)--'`
   - PowerShell: `Get-ChildItem docs/team/comms -Recurse -Filter *--to-* | Where-Object Name -match '--to-(<you>|all)--'`
3. Read those newer than `docs/team/comms/<you>/.last-read`, then write the
   current UTC time (`YYYY-MM-DDTHHMM`) into `.last-read`.

## Write (one file per message, in your own folder only)

Path: `docs/team/comms/<you>/YYYY-MM-DDTHHMM--to-<member|all>--<topic>.md` (UTC).

```markdown
---
from: <you>
to: <member|all>
re: <topic-kebab>          # same topic as the thread you answer
evidence: [<paths>]
needs-reply: yes|no
---
What happened. What you saw (describe images concretely). What you need, from whom, by when.
```

At most 40 lines. Link files; don't paste big logs. Then
`git add docs/team/comms/<you>/ && git commit -m "docs(team): <topic>" && git pull && git push`.

## Status board (communicator owns it)

Edit `docs/team/status-board.md` only from evidence: QA reports, packets, approval
records in `docs/team/comms/director/approvals/`. Allowed statuses: `draft`,
`candidate`, `changes-requested`, `director-approved`, `rejected`. Only copy
`director-approved` from an existing approval record.

## End-of-task report (every time)

```markdown
**Changed:** files and commits.
**Evidence:** QA report and packet paths, test output, numbers.
**Gaps:** what is missing, failing, unverified or not yet looked at.
```

No superlatives (TEAM-5.3). Lead with gaps when the director asks if something is done.

## Machine-B relay (communicator)

After each pull, tell codex about `--to-codex--` and `--to-all--` messages from
machine A. Make sure codex's replies are committed in `docs/team/comms/codex/`
before you push.
