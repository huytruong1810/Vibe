# Director approvals

The only valid approval records (doctrine L7, TEAM-4). Written by the director, or by
Claude on the director's explicit instruction. **No agent writes here.**

File name: `<asset-id>--<packet-id>.md`

```markdown
---
asset: npc:neris
packet: art/review/2026-11-02-neris/
decision: director-approved   # or changes-requested | rejected
scope: [body, idle, walk, strike, faces, item:ferry-pole]
date: 2026-11-02
---
Notes from the director (required for changes-requested).
```

`forge publish` refuses to run without a matching `director-approved` record.
