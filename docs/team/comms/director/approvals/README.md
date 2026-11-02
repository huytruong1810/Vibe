# Director approvals

The only valid approval records (doctrine L7, TEAM-4). Written by the director, or by
Claude on the director's explicit instruction. **No agent writes here.**

**Standing delegation (2026-11-01):** the director has given Claude standing authority
to review candidate packets and write `director-approved` or `changes-requested` records,
marked `recordedBy: claude under the director's standing delegation of 2026-11-01`.
The director can overturn any record.

**Suspended 2026-11-02 → Claude's return (about 2026-11-09):** Claude is phased out for the
week (directive 011). Only the director writes records until the director reinstates the
delegation. Agents message `--to-director--` with the packet path when a packet is ready.

File name: `<asset-id>--<packet-id>.md`

The file starts with the front matter itself (no code fence):

```markdown
---
asset: npc:neris
packet: art/review/2026-11-02-neris/
packetDigest: <sourceDigest from the packet's review.json>
decision: director-approved # or changes-requested | rejected | superseded
scope: [body, idle, walk, strike, faces, item:ferry-pole]
date: 2026-11-02
recordedBy: director # or "claude on the director's instruction"
---

Notes from the director (required for changes-requested).
```

An approval covers exactly the frames behind `packetDigest` (PRD-9). Regenerated frames
need a new record; the old one is marked `superseded`. Agents never stage or commit
files here (TEAM-2a); the director, or Claude or codex on the director's instruction,
commits them.

`forge publish` refuses to run without a matching `director-approved` record.
