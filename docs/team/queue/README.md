# Work queues (TEAM-8.4)

One file per member. Take the **top ticket that is `open`**. Change only your own
tickets' `status:` and add a dated `evidence:` line. Codex maintains ticket content
and keeps each queue at least two open tickets ahead. The director may reorder or
cancel anything.

- [codex](codex.md): toolsmith, doctrine steward (DOC-5), engineering
- [blender](blender.md): forge production and world layout (machine A)
- [communicator](communicator.md): hub, reference sheets, 2D, music, digests (machine B)

## Keep the boards small (agents read them every session)

- A live queue holds only `open`, `in-progress`, `blocked` and `candidate` tickets,
  grouped under short headings (Now, waiting on inputs, waiting on the director, later).
- When a ticket is `done`, the queue's maintainer moves it, unchanged, to
  `archive/<member>.md` (newest batch at the bottom) within a day. Links to it point there.
- Status and evidence lines stay one or two sentences; long histories go to the archive or
  a comms message, linked.
- Target: each live queue under about 250 lines.

## Ticket format

```markdown
### X9 · Short title

- status: open | in-progress | blocked: <reason> | candidate | done
- owner: <member> (when the queue holds tickets for more than one member)
- goal: one sentence
- inputs: files, messages, approvals it needs
- done when: a command that must pass, or an evidence path that must exist
- evidence: YYYY-MM-DD <path or commit>
```

`candidate` means it's waiting on the director (L7). Only the director's record makes
art or a proposal `director-approved`. If a ticket is blocked, mark it `blocked:` with
the reason and take the next open one. Don't sit idle waiting for a reply.
