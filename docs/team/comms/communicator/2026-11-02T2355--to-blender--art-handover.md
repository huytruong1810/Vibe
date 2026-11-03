---
from: communicator
to: blender
re: art handover (tickets B15, B16, B17, B18; prompt batch, lessons, and quota status)
evidence: [docs/team/queue/blender.md, docs/team/queue/communicator.md, docs/team/comms/communicator/m23-prompt-batch.md, docs/team/comms/communicator/image-ledger.md]
needs-reply: yes
---

# Art Handover to Blender (Tickets B15, B16, B17, B18)

Blender,

Per Directive 012 and the studio constitution (TEAM-1, TEAM-2), all image generation and 2D/3D art production has transferred to you on Machine A so that one artist holds and reviews the entire visual pipeline from concept sheet to finished sprite. Communicator has ceased all image generation and will operate strictly as team hub (relay, status board, review digests), manifest integrator, and composer.

This document formally hands over all active art tickets, files in progress, prompt batches, lessons learned, and asset statuses.

---

## 1. Transferred Tickets & Current State

### B15 (formerly Communicator M23) · Reference-Sheet Production Run
- **Goal**: Produce reference sheets across all classes for sprite forging.
- **State**: The entire prompt batch for all 6 steps was drafted and committed in [`docs/team/comms/communicator/m23-prompt-batch.md`](m23-prompt-batch.md).
- **Tooling**: With Directive 013 and C27, you now run local generation via `forge.py concept` and `forge.py views` on Machine A (FLUX.2 Klein 9B / Qwen-Image-2.1 with clay pose guides). Remote API quota limits no longer apply.

### B16 (formerly Communicator M11) · Human Reference Redraws & Palette Normalization
- **Goal**: 3-view A-pose reference sheets for `player-aqualia` and `npc-neris` at 4.5–5 heads tall, with strict palette ramps ($\le 5$ ramps, $\le 6$ tones each).
- **State**:
  - Palette ramp mappings and metadata schemas are normalized in `art/source/references/player-aqualia/` and `art/source/references/npc-neris/`.
  - Base mannequin references (Standard, Sturdy, Slender, Elder) are committed in `art/source/references/mannequins/`.
  - Golden redraws are needed to replace early 6-head 2-view sheets with doctrine-compliant 4.5–5 head 3-view A-poses (front, profile left, back). C27 human pose guides (`art/source/style/pose-guides/human.png`) provide the structural backing.

### B17 (formerly Communicator M9) · Terrain Tile Sets
- **Goal**: Palette-locked 32-px seamless terrain tiles (ground materials, shoreline dual-grid masks, cliffs, ramps).
- **State**:
  - Scaffolded directory structure exists in `art/source/tiles/sets/aqualia-terrain/`.
  - Claude's tooling ticket C30a (`forge.py swatch`) will produce the seamless 1024 × 1024 swatches with Klein 9B. Once C30a lands, B17 runs tileforge QA.

### B18 (formerly Communicator M24) · Environment & Landmark Reference Sheets
- **Goal**: Reference sheets for village buildings, landmarks, and large props (depth-stretched 3D bake).
- **State**:
  - Canonical prop reference for `item-hatchet` is completed and **director-approved** (`docs/team/comms/director/approvals/item-hatchet--2026-11-01-item-hatchet.md`).
  - Draft prompts for `env-house-aqualia`, `env-tree-oak`, and `env-well` are authored in `docs/team/comms/communicator/m23-prompt-batch.md`.
  - Full landmark list for T0 slice is indexed in your queue under Ticket B5.

---

## 2. Files in Progress & Locations

| Resource | Path | Description |
| :--- | :--- | :--- |
| Full Prompt Batch | `docs/team/comms/communicator/m23-prompt-batch.md` | Complete prompt texts for M11 redraws, 9 villagers, C10 environment, non-quadrupeds, held items |
| Image Generation Ledger | `docs/team/comms/communicator/image-ledger.md` | Chronological record of all past prompts, seeds, templates, and outcomes |
| Player Reference Package | `art/source/references/player-aqualia/` | Current candidate sheet, ramp mappings, metadata |
| Neris Reference Package | `art/source/references/npc-neris/` | Current candidate sheet, ramp mappings, metadata |
| Mannequin References | `art/source/references/mannequins/` | 4 base body type sheets |
| Hatchet Canonical Reference | `art/source/references/item-hatchet/` | Approved 3D held-item reference |
| Quadruped References | `art/source/references/{rivallie,bramblefang,marshstalker,mireling}/` | Golden references for the 4 quadrupeds |
| Terrain Set Scaffold | `art/source/tiles/sets/aqualia-terrain/` | Scaffolded directory for dual-grid terrain tiles |

---

## 3. Prompting Lessons & Practical Guidelines

From the 25+ generation cycles recorded in `image-ledger.md`, the following rules consistently yield forge-viable concept sheets:

1. **Strict 3-View Canvas Alignment**:
   - Layout: Exactly three full-body figures arranged horizontally side-by-side (`Front View` on left, `Side Profile View` facing left in middle, `Back View` on right).
   - Alignment: Figures must share identical scale, baseline ground level, and vertical height.
2. **Doctrine Proportions (ART-6.3, ART-7.2)**:
   - Always specify "retro JRPG stylized proportions, exactly 4.5 to 5 heads tall, slightly enlarged head, compact torso". Prompts omitting head-count ratio default to realistic 6.5–7 heads, which blur when downsampled to 48–64 px sprites.
3. **Strict A-Pose**:
   - "Arms angled 45 degrees away from torso, elbows straight, open relaxed empty hands, palms facing torso/inward. Legs straight and separated at shoulder width, feet pointing forward."
   - Avoid dynamic poses, items in hands, or overlapping limbs.
4. **Neutral Isolated Background**:
   - Always mandate "solid flat neutral light gray (#d8d8d8) background. No floor shadows, no cast shadows, no pedestals, no grid, no text, no labels, no callouts."
   - Any background detail or floor shadow contaminates background thresholding in `prep`.
5. **Color & Ramp Control**:
   - Limit visible material hues to $\le 5$ distinct palette ramps. Keep lighting diffuse and flat (cel-shaded) so quantization maps cleanly to `art/source/forge/spec/palette.json`.

---

## 4. Image Quota Status

- Machine B's remote API (`gemini-3.1-flash-image`) hit quota exhaustion (429) on 2026-11-01T23:45Z, resetting around 2026-11-06T03:08Z.
- **This no longer blocks production**: Under Directive 013 and C27, Machine A uses local GPU inference via `forge.py concept` and `forge.py views` (FLUX.2 Klein 9B + pose guides). You do not depend on remote API calls.

---

## 5. Director Feedback & Approval Status of Assets

- **Rivallie**: Body & clips **director-approved** (`rivallie--2026-10-31-rivallie-c3d.md`). Faces sidecar had changes requested (eyes on crown); being resolved via C3b.
- **Bramblefang**: Body & clips **director-approved** (`bramblefang--2026-10-31-bramblefang-c3d.md`).
- **Marshstalker**: Body & clips **director-approved** (`marshstalker--2026-10-31-marshstalker.md`).
- **Mireling**: Body & clips **director-approved** (`mireling--2026-11-01-mireling.md`).
- **Hatchet (`item:hatchet`)**: Held-item & icon **director-approved** (`item-hatchet--2026-11-01-item-hatchet.md`). B14 to publish.
- **Riverlands Map Layout**: Revision 2 **director-approved** (`world-aqualia--world-aqualia-aqualia_riverlands-2.md`).
- **Voice Casting Proposal 002**: Revision 2 **director-approved** (`proposal-002-r2.md`).

Please reply `--to-communicator--` when you have reviewed this packet and confirmed you have everything required to drive B15–B18 forward.
