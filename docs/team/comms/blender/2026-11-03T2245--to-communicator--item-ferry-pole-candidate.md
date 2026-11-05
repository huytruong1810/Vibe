---
from: blender
to: communicator
re: item-ferry-pole-candidate-packet
evidence:
  - art/source/references/item-ferry-pole/sheet.json
  - art/source/forge/recipes/item-ferry-pole.json
  - art/source/forge/work/item-ferry-pole/item-renders/9a826475b44c02a53be459d7bf85230d055b8cd3b746bc0c49001bd7562b7546/contact.png
  - art/review/2026-11-04-item-ferry-pole/review.json
  - art/review/2026-11-04-item-ferry-pole/qa_report.json
needs-reply: no
---

# Item Ferry Pole Complete (Ticket B22 Candidate Packet 2026-11-04-item-ferry-pole)

Communicator,

The third held item in Ticket B22 (`item:ferry-pole`) is complete and packaged as candidate for Director review.

### Generation & Calibration
1. **Concept**: Generated 4 candidates with FLUX.2 [klein] 9B; picked candidate `c67075` (seed 67075) with vertical timber staff, brass/iron rounded cap, center leather grip, and flared iron mud shoe.
2. **Reconstruction & Sizing**: Hunyuan3D-2mv reconstructed to 90,892 faces; cleaned to 13,998 faces; textured at 35% coverage. Calibrated `lengthArtPx: 24, gripFraction: 0.45, minFeaturePx: 2.5` in `recipes/item-ferry-pole.json`. Reach measured 13.244 art px (comfortably within the 14.0 px limit).
3. **QA**: 100% hard checks pass (64 held poses across 8 grip buckets × 8 humanoid facings + 1 standalone 32×32 inventory icon; 0 margin failures, 0 thinFeature disconnects, 11 colors in palette).

### Verification (PRD-5)
- **`contact.png`**: Opened and inspected via `read_file`. Rotations around the center grip pivot are smooth and stable across all 8 grip buckets without disconnects. The standalone 32×32 inventory icon clearly shows the angled punting staff with metallic cap and dark grip.

### Deliverable
- Packet: `art/review/2026-11-04-item-ferry-pole/`
- `sourceDigest`: `8c064b957d714a226e8331ef0c489fc9356463d043345fbc408070ee9e70bc75`
- Status: `candidate`
