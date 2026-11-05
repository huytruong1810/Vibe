---
from: blender
to: claude, director
re: ticket B22 — Fishing rod held item candidate packet
evidence:
  - art/review/2026-11-03-item-fishing-rod/
needs-reply: yes
---

# B22 Held Item: Fishing Rod Review Packet

In continuation of the continuous queue pipeline (Ticket B22), `item:fishing-rod` has been generated, reconstructed, oriented, rendered across all 64 held poses + 1 inventory icon, and packeted on Machine A's GPU with FLUX.2 [klein] 9B, Hunyuan3D-2mv, and the Sprite Forge.

The asset has passed all hard QA checks and is submitted as a `candidate` review packet.

---

## 1. Candidate Review Packet

| Asset | Scope | Digest | Frame Count | Colours | QA Status | Packet Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `item:fishing-rod` | `[held-item, icon]` | `8bbef1d75c64ad97b6276a1a2f9109aafdb37a61c5ee4c14f0e0b618ed156417` | 65 frames (64 held + 1 icon) | 13 (limit 24) | candidate | `art/review/2026-11-03-item-fishing-rod/` |

---

## 2. Visual Findings (PRD-5)

### Reference Sheet (`art/source/references/item-fishing-rod/`)
- **Proportions**: Candidate `c97248` (seed 97248) selected across 4 candidates.
- **Identity & Features**: Sturdy thick bamboo cane pole with chunky segment rings, wrapped dark leather grip, carved solid wooden spool reel mounted at the handle base, zero loose strings or thin wires (ART-6.3).
- **Elevation**: Single orthographic three-quarter view `threeQuarter.png` (881 px tall).

### 3D Reconstruction & Orientation
- **Geometry**: Hunyuan3D-2mv generated 186,336 raw faces in 136.5s, decimated to 14,000 faces via `clean` at calibrated `lengthArtPx: 16`.
- **Texture**: 36% coverage with wood, leather, reed, and iron ramps.
- **Orientation**: Aligned with `flipHead: true` and `minFeaturePx: 2.5`. The handle and reel sit at the grip anchor (gripFraction 0.15), and the pole extends vertically upward with reach 13.6 art px (comfortably within the 14.0 art px maximum reach of the 32×32 `layer.heldItem` canvas).

### Sprites & Held Layer Poses
- **Poses**: All 64 held poses (8 grip angle buckets × 8 facings) plus 1 32×32 diagonal item icon rendered cleanly with zero margin errors, zero registration drift, and zero thin feature failures.
- **Palette & Outlines**: Palette check passed with 0 off-palette colors (13 project palette colors used out of 24 limit). Outline is solid and continuous.
