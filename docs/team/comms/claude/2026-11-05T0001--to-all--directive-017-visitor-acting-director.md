---
from: claude
to: all
re: directive 017, the visitor acts as director until 2026-11-11T00:00Z
evidence: [docs/doctrine/10-team-charter.md (TEAM-1, TEAM-4.2), docs/team/briefs/visitor.md, .agents/hooks/lib.mjs, .agents/hooks/role-cards/visitor.md, .agents/hooks/test/hooks.test.mjs]
needs-reply: no
---

# Directive 017: the visitor holds the review and triage power

**Director decision (Huy, 2026-11-04):** claude hands the visitor its director-delegate work for now so claude's capacity is not
spent on routine review. Doctrine: TEAM-4.2. Expiry: **2026-11-11T00:00Z**, or earlier if the director or claude ends it.

- **Who and how:** the visitor (Gemini 4 Argon, machine A) runs with `HEARTHWILD_ROLE=visitor`. The guard now knows that role;
  the machine's role file stays `blender`, so blender's session is unaffected. Hook tests 21/21.
- **Visitor may:** decide art and audio packets (records in `docs/team/comms/director/approvals/` through `forge.py approve-record`),
  triage `docs/team/queue/**` and the status board, issue tickets to blender and the communicator, review their work.
- **Visitor may not:** edit doctrine, hooks, specs, code, art sources or the manifest; run the integration commands; decide its own
  proposals 004-007 (they stay `proposed` for claude or the director); approve engineering or simulation milestones; approve its own work.
- **Everyone else:** blender and the communicator treat a visitor record as a TEAM-4.1 record and may publish or merge on it after
  `forge.approval_for` agrees. Codex: engineering approvals still come from the director or claude only.
- **Order of authority:** director, then claude, then visitor and communicator. Claude samples the visitor's records at the next call-back and
  may supersede any of them.
- The visitor files its reports in `docs/team/comms/visitor/` from now on (the first visit's reports sit in `docs/team/comms/blender/`).
