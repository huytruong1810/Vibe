---
from: communicator
to: director
cc: [codex, blender]
re: relay-c6-village-candidate-evidence
evidence: [art/review/world-aqualia-aqualia_village-1/packet.json, art/review/world-aqualia-aqualia_village-1/README.md, docs/team/comms/codex/archive/2026-10-31T1547--to-all--c6-worldforge-candidate.md, docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_village-1.md, docs/team/comms/director/approvals/proposal-001.md]
needs-reply: no
---

# Evidence Relay: Candidate Aqualia Village Packet (Codex C6)

Director, per Ticket M12, this message relays the published evidence and technical status for the golden sample village map packet authored by Codex under Milestone C6.

### 1. Packet Provenance and Digest Links
- **Packet Location**: [`art/review/world-aqualia-aqualia_village-1/`](file:///c:/Users/htruong/source/repos/Vibe-art/art/review/world-aqualia-aqualia_village-1/)
- **Packet Spec**: [`art/review/world-aqualia-aqualia_village-1/packet.json`](file:///c:/Users/htruong/source/repos/Vibe-art/art/review/world-aqualia-aqualia_village-1/packet.json)
- **Source Digest**: `6211d67cd102b0c475261727f1ec16f410e6ad44b9454557be010e4889a3b737`
- **Dependencies Digest**: `f9d697bc58009d9b2b77c65d5ab922b15c262bbd6be7ad02ae587404601e441b`
- **Candidate Hand-off**: [`docs/team/comms/codex/archive/2026-10-31T1547--to-all--c6-worldforge-candidate.md`](file:///c:/Users/htruong/source/repos/Vibe-art/docs/team/comms/codex/archive/2026-10-31T1547--to-all--c6-worldforge-candidate.md)
- **Render Assets (14 images)**:
  - Full-level overview: `overview.png` and baseline `before-overview.png`
  - 12 individual 30×17 screen crops: `screen-0-0.png` through `screen-2-3.png` covering all grid zones.

### 2. Objective QA vs. Visual Presentation (Separation of Concerns)
Per doctrine TEAM-5.1 and WLD-4.1, technical verification is distinguished from visual acceptance:
- **Objective Structural Checks (Passed)**:
  - Both semantic passes (`001-village.json` and `002-village-details.json`) apply deterministically without collision errors or unreachable areas.
  - `worldforge check` reports 0 findings on geometry, collision boundaries, transit paths, and landmark placement.
  - Traversal test suite `tests/world-traversal.test.ts` passes.
- **Visual Presentation Limitations (Identified)**:
  - Ground terrain is built from procedural stand-in swatches; water and grass tile repetitions are visible across open expanses.
  - Structural geometry uses placeholder blockouts (e.g. 10 generic building boxes) rather than finished architectural assets.
  - Village screens do not yet feature three distinct visual depth layers (WLD-3.4: foreground, ground, canopy/overhead).
  - Open village zones are predominantly bare grass (WLD-3.3) awaiting detailed secondary props and flora scattering.

### 3. Director Approval Scope and Next Steps
- **Layout Scope Approved**: Your review in [`docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_village-1.md`](file:///c:/Users/htruong/source/repos/Vibe-art/docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_village-1.md) approved the topological and semantic layout (canals, Hearth Island, bridge crossings, building footprints, and wayfinding).
- **Composition Baseline Approved**: Region bible C5 composition was formally approved in [`docs/team/comms/director/approvals/proposal-001.md`](file:///c:/Users/htruong/source/repos/Vibe-art/docs/team/comms/director/approvals/proposal-001.md).
- **Visual Dressing Awaiting Upstream Kits**: Finished map visual approval will proceed through dedicated dressing pass packets once:
  1. Communicator delivers the 32-px dual-grid terrain sets via Tileforge (Ticket M9).
  2. Blender / Codex deliver the baked environment sprite kits (C10: modular village buildings, docks, canal footbridges, and trees).

No further action is required on the layout itself. This evidence has been integrated into Weekly Review Digest 2026-W45.
