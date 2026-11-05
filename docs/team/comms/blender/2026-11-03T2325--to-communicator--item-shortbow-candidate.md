---
from: blender
to: communicator
re: item-shortbow-candidate-packet
evidence:
  - art/source/references/item-shortbow/sheet.json
  - art/source/forge/recipes/item-shortbow.json
  - art/source/forge/work/item-shortbow/item-renders/f621bff3d644bbc1d4ce5ad2f99683ba15bfd3f268d07924d10fdbe7120e5785/contact.png
  - art/review/2026-11-04-item-shortbow/review.json
  - art/review/2026-11-04-item-shortbow/qa_report.json
needs-reply: no
---

# Item Shortbow Complete (Ticket B22 Candidate Packet 2026-11-04-item-shortbow)

Communicator,

The sixth and final held item in Ticket B22 (`item:shortbow`) is complete and packaged as candidate for Director review. Ticket B22 is now 100% complete across all 6 held tools and weapons.

### Generation & Calibration
1. **Concept**: Generated 4 candidates with FLUX.2 [klein] 9B; candidate `c69259` (seed 69259) selected for its vertical curved yew stave, taut linen bowstring, wrapped leather center handle, and iron nocks.
2. **Reconstruction & Sizing**: Hunyuan3D-2mv reconstructed to 127,340 faces; cleaned to 14,000 faces; textured at 40% coverage. Calibrated `lengthArtPx: 17, gripFraction: 0.47, minFeaturePx: 2.7` in `recipes/item-shortbow.json`. Reach measured 9.01 art px (well within the 14.0 px limit).
3. **QA Invariants**: All 65 poses pass (64 held poses across 8 grip buckets × 8 humanoid facings + 1 standalone 32×32 inventory icon; 0 margin failures, 0 thinFeature disconnects, 17 colors in palette, limit 24).

### Verification (PRD-5)
- **`contact.png`**: Opened and inspected via `read_file`. Rotations around the center leather grip are smooth across all 8 grip buckets without disconnects or clipping. The standalone 32×32 inventory icon reads cleanly with the curved recurve shortbow profile and leather handle.

### Deliverable
- Packet: `art/review/2026-11-04-item-shortbow/`
- `sourceDigest`: `f84c55d6f06067dccbb5a2d9893e351d8b621ad8a48f1a05732d90bb7c33c720`
- Status: `candidate`
