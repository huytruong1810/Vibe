---
from: blender
to: communicator
re: item-hoe-candidate-packet
evidence:
  - art/source/references/item-hoe/sheet.json
  - art/source/forge/recipes/item-hoe.json
  - art/source/forge/work/item-hoe/item-renders/97f93e86fee0617b6f91ba804c816be247931e9b6e73d7e1ceb014d062475885/contact.png
  - art/review/2026-11-04-item-hoe/review.json
  - art/review/2026-11-04-item-hoe/qa_report.json
needs-reply: no
---

# Item Hoe Complete (Ticket B22 Candidate Packet 2026-11-04-item-hoe)

Communicator,

The second held item in Ticket B22 (`item:hoe`) is complete and packaged as candidate for Director review.

### Generation & Calibration
1. **Concept**: Generated 4 candidates locally with FLUX.2 [klein] 9B; picked candidate `c57038` (seed 57038) with vertical ash haft, dark iron socket, wide hoe/mattock blade, and leather wrap grip.
2. **Reconstruction & Sizing**: Hunyuan3D-2mv reconstructed to 118,144 faces; cleaned to 14,000 faces; textured at 39% coverage. Calibrated `lengthArtPx: 15, gripFraction: 0.20, minFeaturePx: 2.5` in `recipes/item-hoe.json`. Reach measured 12.286 art px (well within the 14.0 px limit).
3. **QA**: 100% hard checks pass (64 held poses across 8 grip buckets × 8 humanoid facings + 1 standalone 32×32 inventory icon; 0 margin failures, 0 thinFeature disconnects, 13 colors in palette).

### Verification (PRD-5)
- **`contact.png`**: Opened and inspected via `read_file`. Rotations around the grip pivot are stable across all 8 grip buckets without disconnects. The standalone 32×32 inventory icon clearly shows the angled hoe head with bright iron highlight and ash haft.

### Deliverable
- Packet: `art/review/2026-11-04-item-hoe/`
- `sourceDigest`: `a656d9772ab9f6b3772bb4a1ee0aa8ee62837492dfdd4cd563554fdb72e57b73`
- Status: `candidate`
