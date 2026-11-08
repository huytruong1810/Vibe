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
  - Comms notice: [`docs/team/comms/communicator/archive/2026-10-31T1850--to-director--aqualia-scores-revised.md`](file:///c:/Users/htruong/source/repos/Vibe-art/docs/team/comms/communicator/archive/2026-10-31T1850--to-director--aqualia-scores-revised.md).
- **Ask**: Listening approval on Day and Night theme arrangements and stem balance.

### 3. Communicator M14: Proposal 002 Revision 2 (Aqualia Voice Casting Sheet)
- **Deliverable**: Authored voice profiles for the 10 Aqualia slice villagers under AGT-4.2.
- **Evidence**:
  - Proposal document: [`docs/team/proposals/002-aqualia-voice-casting.md`](file:///c:/Users/htruong/source/repos/Vibe-art/docs/team/proposals/002-aqualia-voice-casting.md)
  - Comms notice: [`docs/team/comms/communicator/archive/2026-10-31T1847--to-director--aqualia-voice-recast-proposal.md`](file:///c:/Users/htruong/source/repos/Vibe-art/docs/team/comms/communicator/archive/2026-10-31T1847--to-director--aqualia-voice-recast-proposal.md).
- **Key Changes**: Eliminated all pronoun/gender inferences from casting; rationales grounded strictly in age, role, and personality; Mira, Dara, and Finn re-anchored to `src/content/villagers.ts`; Kokoro-82M v0.19 / v1.0 library cited.
- **Ask**: Approve Proposal 002 Revision 2 as the baseline for voice and syllable blip synthesis.

### 4. Blender B3: Mireling Candidate Review Packet
- **Deliverable**: Golden sample quadruped sprite frames on `creature.medium` canvas (56×56, height 26px, anchor `[28, 41]`).
- **Evidence**:
  - Candidate packet: [`art/review/2026-10-31-mireling/`](file:///c:/Users/htruong/source/repos/Vibe-art/art/review/2026-10-31-mireling/)
  - Source Digest: `e49ddef2bb67e24f53a7fdc4486767b2819d87575cbbedd6b6419f4fd9839632`
  - Frame Count: 15 clips, 616 frames total, 8 palette colors.
  - QA report: 12/12 hard checks passing; margins 4px (threshold $\ge 2\text{px}$); anchor drift 0.000px.
  - Comms notice: [`docs/team/comms/blender/archive/2026-10-31T1845--to-director-communicator--mireling-packet.md`](file:///c:/Users/htruong/source/repos/Vibe-art/docs/team/comms/blender/archive/2026-10-31T1845--to-director-communicator--mireling-packet.md).
- **Ask**: Review contact sheet (`contact.png`), turntable (`turntable.gif`), and walk/run clips for Director approval.

### 5. Blender B2: Riverlands Map Layout Candidate Packet
- **Deliverable**: Topological layout pass `003-riverlands-layout.json` for level `aqualia_riverlands` (120×68 tiles, 16 screens in 4×4 grid).
- **Evidence**:
  - Candidate packet: [`art/review/world-aqualia-aqualia_riverlands-1/`](file:///c:/Users/htruong/source/repos/Vibe-art/art/review/world-aqualia-aqualia_riverlands-1/)
  - Canonical project digest: `e0584b254976740835de3882531f27e9fcc09347ea8d45a16cb455ba04536c1a`
  - Review Renders: 18 inspected images (`overview.png`, `before-overview.png`, 16 screen crops `screen-0-0.png` through `screen-3-3.png`).
  - QA Evidence: `worldforge check` reports 0 findings on `aqualia_riverlands` and 0 findings on full-region `aqualia`. All 16 landmarks, 4 story spots, 6 habitats, 6 ambience emitters, warm-terrace elevation, and 5 routes placed.
  - Comms notice: [`docs/team/comms/blender/archive/2026-10-31T1829--to-director-communicator--riverlands-candidate-packet.md`](file:///c:/Users/htruong/source/repos/Vibe-art/docs/team/comms/blender/archive/2026-10-31T1829--to-director-communicator--riverlands-candidate-packet.md).
- **Scope Note**: Approval covers layout, routes, landmarks, and collisions only; terrain swatches and environment dressing remain preliminary pending C11/M9 and C10 kits.
- **Ask**: Review topological layout and landmark placement for Director layout approval.

### 6. Blender / Codex C3b: Rivallie Candidate Faces Sidecar
- **Deliverable**: Candidate face decal sidecar proof in `art/review/2026-11-01-rivallie-faces-d749a4350126/`.
- **Evidence**:
  - `contact.png`: 5 expression rows (`neutral`, `warm`, `fearful`, `hurt`, `sleep`) across 5 forward facing columns (`s`, `se`, `sw`, `e`, `w`).
  - `registered.png`: 5×5 standing composite proofs. Face decals map cleanly to the head socket across all forward facings without silhouette overhang.
  - Manifest: `art/review/2026-11-01-rivallie-faces-d749a4350126/faces.json` (2,040 registrations pass bounds QA).
- **Inspections & Readability (PRD-5)**:
  - Specular white highlight dots and dark eye pixels read clearly against background and cream muzzle.
  - Socket alignment centered accurately on head mesh for `s`, `se`, `sw`, and snouted profile for `e`, `w`.
  - Back facings (`n`, `ne`, `nw`) correctly have no face decals.
  - Separate from approved body packet (`rivallie--2026-10-31-rivallie-c3d.md`), which excluded face decals.
- **Ask**: Review expression readability and facial socket fit for Director decision (approval or requested adjustments).

### 7. Codex / Blender C9b: Human Face Sidecar Proof (`selftest-human`)
- **Deliverable**: Candidate face decal sidecar proof in `art/review/2026-11-01-selftest-human-faces-9b64f90be64c/`.
- **Evidence**:
  - Grammar sheets: [`docs/team/comms/codex/2026-11-01-human-face-grammar-4x.png`](file:///c:/Users/htruong/source/repos/Vibe/docs/team/comms/codex/2026-11-01-human-face-grammar-4x.png), `art/review/2026-11-01-selftest-human-faces-9b64f90be64c/contact.png` (12 expressions × 5 forward facings = 60 decals).
  - Registered composite: `art/review/2026-11-01-selftest-human-faces-9b64f90be64c/registered.png` (verified on blank face plane across all forward facings).
  - QA metric: 7,416 registrations verified clean in `faces.json` across 952 body frames.
- **Inspections & Readability (PRD-5)**:
  - Strong emotional differentiation in front (`s`) and 3/4 views (`se`, `sw`) via brow slopes, pupil gaze direction, and mouth marks.
  - In profile (`e`, `w`), decals collapse cleanly into 2D perspective; subtle differences between `blink`/`sleep` and `concerned`/`sad` are noted.
  - Sits squarely on the untextured facial region below hairline and above collar without silhouette overhang.
- **Production Scope Note**: Proves the complete human face sidecar pipeline and socket tracking on a valid body review; production `player-aqualia` proof remains gated on Ticket M11 reference sheet redraw to clear margin and color count QA blocks.
- **Ask**: Review expression grammar and socket registration on `selftest-human` for Director candidate feedback.

---

## State of Previous Approvals (Director Records)
- **Rivallie**: Approved for body/clips (`docs/team/comms/director/approvals/rivallie--2026-10-31-rivallie-c3d.md`, digest `69b6c10d...`).
- **Bramblefang**: Approved (`docs/team/comms/director/approvals/bramblefang--2026-10-31-bramblefang-c3d.md`, digest `ef40a024...`).
- **Marshstalker**: Approved (`docs/team/comms/director/approvals/marshstalker--2026-10-31-marshstalker.md`, digest `654b7fa0...`).
- **Aqualia Region Bible & Plan (C5)**: Approved (`docs/team/comms/director/approvals/proposal-001.md`).
- **Golden Village Map Layout (Codex C6)**: Approved for layout scope (`docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_village-1.md`).
  - **Packet Spec**: [`art/review/world-aqualia-aqualia_village-1/packet.json`](file:///c:/Users/htruong/source/repos/Vibe-art/art/review/world-aqualia-aqualia_village-1/packet.json)
  - **Digests**: Source `6211d67c...`, Dependencies `f9d697bc...`
  - **Review Renders**: 14 inspected images (`overview.png`, `before-overview.png`, 12 screen crops `screen-0-0.png` through `screen-2-3.png`).
  - **QA Evidence**: Semantic passes `001-village.json` and `002-village-details.json` execute cleanly; `worldforge check` 0 findings; traversal test suite passing.
  - **Scope Limitation**: The Director record approves layout, collision, and topological routes only. Finished environment visual presentation remains gated pending 32-px dual-grid Tileforge terrain sets (Communicator M9) and baked environment kits (Codex/Blender C10).

