# Work queues (TEAM-8.4)

One file per member. Take the **top ticket that is `open`**. Change only your own
tickets' `status:` and add a dated `evidence:` line. Codex maintains ticket content
and keeps each queue at least two open tickets ahead. The director may reorder or
cancel anything.

- [codex](codex.md): toolsmith, doctrine steward (DOC-5), engineering
- [blender](blender.md): forge production and world layout (machine A)
- [communicator](communicator.md): hub, reference sheets, 2D, music, digests (machine B)

## Ticket format

```markdown
### X9 · Short title

- status: open | in-progress | blocked: <reason> | candidate | done
- goal: one sentence
- inputs: files, messages, approvals it needs
- done when: a command that must pass, or an evidence path that must exist
- evidence: YYYY-MM-DD <path or commit>
```

`candidate` means it's waiting on the director (L7). Only the director's record makes
art or a proposal `director-approved`. If a ticket is blocked, mark it `blocked:` with
the reason and take the next open one. Don't sit idle waiting for a reply.
