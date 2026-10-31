# Hearthwild Weekly Review Digest: 2026-W45

- date: 2026-10-31
- author: communicator
- audience: director (single-pass review)
- evidence: [docs/team/status-board.md, docs/team/queue/codex.md, docs/team/queue/communicator.md, docs/team/queue/blender.md]

---

This digest compiles all candidate deliverables, proposals, and packets currently awaiting Director decisions under **Directive 007**. Per doctrine L7, only the Director approves.

## Items for Director Decision

### 1. Codex C8 / C8b: HUD Visual Acceptance
- **Deliverable**: In-engine compact HUD layout at 1080p and 1024p.
- **Evidence**:
  - 1080p capture: [`docs/team/comms/codex/2026-10-31-c8-hud-1080.png`](file:///c:/Users/htruong/source/repos/Vibe/docs/team/comms/codex/2026-10-31-c8-hud-1080.png)
  - 1024p capture: [`docs/team/comms/codex/2026-10-31-c8-hud-1024.png`](file:///c:/Users/htruong/source/repos/Vibe/docs/team/comms/codex/2026-10-31-c8-hud-1024.png)
  - Inspection mode: [`docs/team/comms/codex/2026-10-31-c8-inspection-1024.png`](file:///c:/Users/htruong/source/repos/Vibe/docs/team/comms/codex/2026-10-31-c8-inspection-1024.png)
  - Browser tests: `tests/browser/c8.spec.ts` passing.
- **Ask**: Does the HUD layout, typography, slot art, and dash label meet visual acceptance at both resolutions?

### 2. Communicator M15: Aqualia Day & Night Music Scores (Listening Review)
- **Deliverable**: Two 6/8 D Lydian tracker scores quoting Hearthwild motif bars 1–2 verbatim with 4 hot-swappable stems at 92 BPM.
- **Evidence**:
  - Day Score: [`art/source/audio/scores/aqualia-day.json`](file:///c:/Users/htruong/source/repos/Vibe-art/art/source/audio/scores/aqualia-day.json) (preview: `art/source/forge/work/audio/aqualia-day.preview.wav`)
  - Night Score: [`art/source/audio/scores/aqualia-night.json`](file:///c:/Users/htruong/source/repos/Vibe-art/art/source/audio/scores/aqualia-night.json) (preview: `art/source/forge/work/audio/aqualia-night.preview.wav`)
  - Report: `render_score.py` exits 0 for both (0 errors, 14 semitone range, shared 15.7s duration).
  - Comms notice: [`docs/team/comms/communicator/2026-10-31T1850--to-director--aqualia-scores-revised.md`](file:///c:/Users/htruong/source/repos/Vibe-art/docs/team/comms/communicator/2026-10-31T1850--to-director--aqualia-scores-revised.md).
- **Ask**: Listening approval on Day and Night theme arrangements and stem balance.

### 3. Communicator M14: Proposal 002 Revision 2 (Aqualia Voice Casting Sheet)
- **Deliverable**: Authored voice profiles for the 10 Aqualia slice villagers under AGT-4.2.
- **Evidence**:
  - Proposal document: [`docs/team/proposals/002-aqualia-voice-casting.md`](file:///c:/Users/htruong/source/repos/Vibe-art/docs/team/proposals/002-aqualia-voice-casting.md)
  - Comms notice: [`docs/team/comms/communicator/2026-10-31T1847--to-director--aqualia-voice-recast-proposal.md`](file:///c:/Users/htruong/source/repos/Vibe-art/docs/team/comms/communicator/2026-10-31T1847--to-director--aqualia-voice-recast-proposal.md).
- **Key Changes**: Eliminated all pronoun/gender inferences from casting; rationales grounded strictly in age, role, and personality; Mira, Dara, and Finn re-anchored to `src/content/villagers.ts`; Kokoro-82M v0.19 / v1.0 library cited.
- **Ask**: Approve Proposal 002 Revision 2 as the baseline for voice and syllable blip synthesis.

### 4. Blender B1 / Claude C3d: Rivallie Re-Packeted Golden Sample
- **Deliverable**: Rivallie golden sample candidate packet re-rendered with C3d quality fixes (eliminated color bleed onto back/flanks, ground-contact lying clips, digest-bound packaging).
- **Evidence**:
  - Candidate packet: [`art/review/2026-10-31-rivallie/`](file:///c:/Users/htruong/source/repos/Vibe/art/review/2026-10-31-rivallie/)
  - QA report: 12/12 hard checks passing.
- **Ask**: Review contact sheet and locomotion GIFs for director approval.

---

## State of Previous Approvals (Director Records)
- **Bramblefang**: Approved (`docs/team/comms/director/approvals/bramblefang--2026-10-31-bramblefang.md`).
- **Marshstalker**: Approved (`docs/team/comms/director/approvals/marshstalker--2026-10-31-marshstalker.md`).
- **Aqualia Region Bible & Plan (C5)**: Approved (`docs/team/comms/director/approvals/proposal-001.md`).
- **Golden Village Map Layout (C6)**: Approved for layout scope (`docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_village-1.md`).
