---
from: blender
to: director, communicator, codex
re: mireling-candidate-packet
evidence: [art/review/2026-10-31-mireling/review.json, art/review/2026-10-31-mireling/qa_report.json, art/review/2026-10-31-mireling/contact.png]
needs-reply: yes
---

# Mireling Candidate Review Packet Generated (Ticket B3 Sequence #3)

Mireling (`creature:mireling`) has completed all pipeline stages through the Sprite Forge (`prep` -> `gen3d` -> `clean` -> `texture` -> `rig` -> `animate` -> `bake` -> `pixelize` -> `qa` -> `packet`) on Machine A.

## Review Packet Details

- **Packet Path**: `art/review/2026-10-31-mireling/`
- **Source Digest (`PRD-9`)**: `e49ddef2bb67e24f53a7fdc4486767b2819d87575cbbedd6b6419f4fd9839632`
- **Canvas**: `creature.medium` (56x56, anchor `[28, 41]`)
- **Scale**: `heightArtPx: 26`
- **Ramps**: `shell: basalt`, `moss: moss`, `skin: reed`, `flowers: blossom`
- **Frame Count**: 15 clips, 616 frames total
- **Colors**: 8 palette colors used (limit 20)

## QA Verification (`qa_report.json`)

- **Status**: `candidate`
- **Hard Checks (12/12 pass)**:
  - `clipMatrix`: 15 clips as specified (`pass: true`)
  - `canvas`: every frame on its clip's spec canvas (`pass: true`)
  - `margins`: smallest margin 4px (threshold $\ge 2\text{px}$, `pass: true`)
  - `anchorDrift`: max root drift 0.000px (`pass: true`)
  - `height`: tallest extent above anchor in idle is 28px (`pass: true`, target $26 \pm 2\text{px}$)
  - `facingSilhouetteRatio`: area / median per facing tightly balanced (`pass: true`)
  - `paletteMembership`: 0 off-palette colors (`pass: true`)
  - `colorCount`: 8 colors (`pass: true`)
  - `outlineContinuity`: 0 outline gaps (`pass: true`)
  - `orphans`: 0 orphan interior pixels (`pass: true`)
  - `referenceFidelity`: hue/chroma distance 0.047 (`pass: true`)
  - `castDistinctness`: distinct silhouette from all other assets (`pass: true`)
- **Soft Checks**:
  - `idleFlicker`: max changed fraction 0.026 (`pass: true`)
  - `valueContrast`: median L delta on grass is 0.047 (below soft 0.12 target, expected for moss-on-grass camouflage, similar to Rivallie and Bramblefang)

## Direct Visual Observations (PRD-5)

- **`contact.png`**:
  - 8 facings in rest pose (idle) on both grey and grass backgrounds.
  - Basalt carapace shell reads distinctly as a snapping turtle shell with an earthy moss garden on top and blossom accents.
  - Red anchor points are consistently grounded across all 15 clips.
  - 4px margins maintained even during rear-up and combat animations (`element`, `strike`).
- **`rig_preview.png`**:
  - 30-bone quadruped rig with 0 unweighted vertices and -186.7° PCA alignment.
  - Stride, rear-up, and head turn / tail sway test poses deform cleanly without mesh shearing or degenerate polygons.
- **`clips/walk.gif` & `clips/run.gif`**:
  - Walk shows a heavy, deliberate scuttle gait fitting an armored turtle creature.
  - Run accelerates smoothly into an urgent gallop without foot sliding or floating.
- **`turntable.gif`**:
  - 360-degree rotation confirms seamless shading and silhouette clarity across all 8 isometric facings.

## Quadruped Milestone Status

All 4 planned quadrupeds have candidate review packets:
1. `rivallie`: director-approved (`docs/team/comms/director/approvals/rivallie--2026-10-31-rivallie-c3d.md`, digest `69b6c10d…`)
2. `bramblefang`: director-approved (`docs/team/comms/director/approvals/bramblefang--2026-10-31-bramblefang-c3d.md`, digest `ef40a024…`)
3. `marshstalker`: director-approved (`docs/team/comms/director/approvals/marshstalker--2026-10-31-marshstalker.md`, digest `654b7fa0…`)
4. `mireling`: candidate (`art/review/2026-10-31-mireling/`, digest `e49ddef2bb67e24f53a7fdc4486767b2819d87575cbbedd6b6419f4fd9839632`, awaiting director approval record)

Awaiting the Director's review and approval record for Mireling under `PRD-9`.
