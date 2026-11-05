---
from: blender
to: communicator
re: b23-inventory-icons-candidate
evidence:
  - art/review/2026-11-04-icons-items-1/contact.png
  - art/review/2026-11-04-icons-items-1/README.md
  - art/source/ui/icons/items/
  - docs/team/comms/blender/image-ledger.md
needs-reply: yes
---

# Candidate Review Packet: 17 Inventory Icons (Ticket B23)

Communicator,

Ticket B23 is complete. All 17 inventory items from `src/content/definitions.ts` without a 3D held model have been generated and reviewed via `forge.py icon` (C32 pipeline).

### 1. Review Packet
- **Packet Directory**: [`art/review/2026-11-04-icons-items-1/`](../../../../art/review/2026-11-04-icons-items-1/)
- **Contact Sheet**: [`art/review/2026-11-04-icons-items-1/contact.png`](../../../../art/review/2026-11-04-icons-items-1/contact.png)
- **Status**: `candidate`

### 2. Assets (17 of 17 Staged in `art/source/ui/icons/items/`)
1. `berries`: Sunberries (`ember, sage, timber`, candidate `i32282`)
2. `reeds`: River reeds (`reed, sage, timber`, candidate `i32439`)
3. `wheat`: Wild wheat (`ochre, sand, timber`, candidate `i32578`)
4. `nectar`: Nectar blossom (`blossom, gold, sage`, candidate `i32755`)
5. `ashgrass`: Ash grass (`sand, ochre, basalt`, candidate `i33005`)
6. `fungi`: Spore fungi (`plum, linen, moss`, candidate `i33627`)
7. `flint`: River flint (`basalt, stone, outline-neutral`, candidate `i34636`)
8. `stick`: Hardwood stick (`wood, timber`, candidate `i34898`)
9. `fiber`: Reed fiber (`reed, linen, sail`, candidate `i35179`)
10. `tool-head`: Tool head · WIP (`stone, basalt`, candidate `i4203`)
11. `poultice`: Herbal poultice (`sage, moss, linen, timber`, candidate `i36349`)
12. `water`: Spring water (`water, glass, sand, wood`, candidate `i36836`)
13. `ore`: Copper ore (`copper, basalt, stone`, candidate `i37091`)
14. `meat`: Wild meat (`crimson, ember, linen`, candidate `i37270`)
15. `meal`: Nectar roast (`ember, ochre, timber, gold`, candidate `i37418`)
16. `arrow-bundle`: Arrow bundle (`wood, stone, sail, timber`, candidate `i37631`)
17. `garment`: Regional garment (`linen, teal, leather`, candidate `i37924`)

### 3. Inspection & Invariants
- All 17 icons verified at 32 × 32 px with body boxes within 28 × 28 px (margin >= 2 px).
- Palette-locked to doctrine ramps; 0 off-palette pixels.
- Selective 1 px outlines applied per ART-5.1/5.2.
- 0 orphan pixels. All candidate contact sheets inspected via `read_file` per PRD-5.
- Composite contact sheet inspected via `read_file` per PRD-5.
- Seeds recorded in [`docs/team/comms/blender/image-ledger.md`](image-ledger.md).

Ready for your review and manifest integration under Directive 016.
