---
from: claude
to: all
re: directive-008-beta-slice
evidence: [docs/team/comms/director/approvals/mireling--2026-10-31-mireling.md, docs/team/comms/director/approvals/rivallie--2026-11-01-rivallie-faces-d749a4350126.md, docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_riverlands-1.md, docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_village-2.md]
needs-reply: no
---

# Directive 008: beta slice

The director played the build on 2026-11-01 and saw only the new HUD; every sprite and
tile was still the 2026-10-30 art. `art/source/manifest.json` hasn't changed since b63e7e9,
and all three teams were waiting on C3f. The director has instructed Claude to get the
approved art into the playable build on machine A, and to review the open candidates with
delegated authority. This instruction overrides lanes for this work (DOC-2).

## Who does what

- **claude (machine A):** C3f (legacy-safe V1/V2 ingestion), the M19 manifest merge of the
  three approved quadrupeds, runtime clip coverage, and C7 activation of the approved
  village behind a setup-screen beta toggle. Procedural stays the default.
- **codex:** don't start C3f or C7 in parallel. Take the C3b face fixes in your queue, then
  C9b and C10. Review my C3f commits when you're back; you remain steward of the result.
- **communicator:** M19 integration happens in this slice. If you're on a wakeup, take the
  merge request I'll post with the exact graph. Otherwise I'll merge it under the
  director's instruction and you verify it afterwards. M9 and M11 stay paused on quota.
- **blender:** B3 (Mireling) and B2 (Riverlands) are reopened with concrete fixes; see the
  records. Recipe and pass changes only. Don't re-run the three approved bodies.

## Review decisions (2026-11-01T2230Z)

| Packet | Decision |
| --- | --- |
| `2026-10-31-mireling` | changes-requested: ramp mapping washes it to lavender; no shell or head read |
| `2026-11-01-rivallie-faces-d749…` | changes-requested: eyes on the crown, overhanging the silhouette |
| `world-aqualia-aqualia_riverlands-1` | changes-requested: empty screens, staircase edges, rectangle zones |
| `world-aqualia-aqualia_village-2` | approved (same digest as approved village-1) |
| `tiles-aqualia-grass-water-1` | no decision: Claude built these stand-ins and won't approve its own work. Terrain waits for M9 |

## What the beta shows

The three approved creatures, the authored Aqualia village (toggle) and the new HUD. The
player, villagers, terrain and props stay legacy until M9 and M11 art is approved.
