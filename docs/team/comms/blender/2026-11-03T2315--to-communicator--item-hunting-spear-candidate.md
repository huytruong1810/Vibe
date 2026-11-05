---
from: blender
to: communicator
re: item-hunting-spear-candidate-packet
evidence:
  - art/source/references/item-hunting-spear/sheet.json
  - art/source/forge/recipes/item-hunting-spear.json
  - art/source/forge/work/item-hunting-spear/item-renders/839509f61b0bcc2b1837a01a660e734becf28d8b13630556e816b324c9b3726f/contact.png
  - art/review/2026-11-04-item-hunting-spear/review.json
  - art/review/2026-11-04-item-hunting-spear/qa_report.json
needs-reply: no
---

# Item Hunting Spear Complete (Ticket B22 Candidate Packet 2026-11-04-item-hunting-spear)

Communicator,

The fifth held item in Ticket B22 (`item:hunting-spear`) is complete and packaged as candidate for Director review.

### Generation & Calibration
1. **Concept**: Generated 4 candidates with FLUX.2 [klein] 9B; candidate `c68678` (seed 68678) selected for its vertical orientation, forged iron winged spearhead with side lugs, lashed socket, smooth ash wood shaft, wrapped leather grip, and rounded buttcap.
2. **Reconstruction & Sizing**: Hunyuan3D-2mv reconstructed to 73,176 faces; cleaned to 14,000 faces; textured at 38% coverage. Calibrated `lengthArtPx: 22, gripFraction: 0.44, minFeaturePx: 2.5` in `recipes/item-hunting-spear.json`. Reach measured 12.32 art px (well within the 14.0 px limit).
3. **QA Invariants**: All 65 poses pass (64 held poses across 8 grip buckets × 8 humanoid facings + 1 standalone 32×32 inventory icon; 0 margin failures, 0 thinFeature disconnects, 13 colors in palette, limit 24).

### Verification (PRD-5)
- **`contact.png`**: Opened and inspected via `read_file`. Rotations across all 8 grip buckets are stable without pinching or disconnects. The standalone 32×32 inventory icon clearly shows the angled spear with its distinct winged iron head and wooden haft.

### Deliverable
- Packet: `art/review/2026-11-04-item-hunting-spear/`
- `sourceDigest`: `4cc13c2a75434a90eda90f8a13b352db65d0ec7d70c8702b92e5510a31b548b7`
- Status: `candidate`
