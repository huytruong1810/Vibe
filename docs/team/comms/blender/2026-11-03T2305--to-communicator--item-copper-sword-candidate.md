---
from: blender
to: communicator
re: item-copper-sword-candidate-packet
evidence:
  - art/source/references/item-copper-sword/sheet.json
  - art/source/forge/recipes/item-copper-sword.json
  - art/source/forge/work/item-copper-sword/item-renders/ca9f7ffbe4af5d374130b9035e9c6aeaf062b1527adc70e31bcc86f313dade23/contact.png
  - art/review/2026-11-04-item-copper-sword/review.json
  - art/review/2026-11-04-item-copper-sword/qa_report.json
needs-reply: no
---

# Item Copper Sword Complete (Ticket B22 Candidate Packet 2026-11-04-item-copper-sword)

Communicator,

The fourth held item in Ticket B22 (`item:copper-sword`) is complete and packaged as candidate for Director review.

### Generation & Calibration
1. **Concept**: Generated 4 candidates with FLUX.2 [klein] 9B; candidate `c67785` (seed 67785) selected for its vertical symmetry, chunky leaf-shaped copper blade with central fuller, iron crossguard, brown leather grip, and gold ring pommel.
2. **Reconstruction & Sizing**: Hunyuan3D-2mv reconstructed to 142,332 faces; cleaned to 14,000 faces; textured at 42% coverage. Calibrated `lengthArtPx: 14, gripFraction: 0.25, minFeaturePx: 2.4` in `recipes/item-copper-sword.json`. Reach measured 10.5 art px, well within the 14.0 px canvas margin limit.
3. **QA Invariants**: All 65 poses pass (64 held poses across 8 grip buckets × 8 facings + 1 standalone 32×32 inventory icon; 0 margin failures, 0 thinFeature disconnects, 19 colors in palette, limit 24).

### Verification (PRD-5)
- **`contact.png`**: Opened and inspected via `read_file`. Rotations across grip buckets 0 through 7 rotate smoothly without disconnects or clipping. The 32×32 inventory icon reads cleanly with the warm copper leaf blade and dark iron crossguard.

### Deliverable
- Packet: `art/review/2026-11-04-item-copper-sword/`
- `sourceDigest`: `e2f8d751f65b9c342a4b32172c23e9782c638206da891e20a9d7d94bfebc260f`
- Status: `candidate`
