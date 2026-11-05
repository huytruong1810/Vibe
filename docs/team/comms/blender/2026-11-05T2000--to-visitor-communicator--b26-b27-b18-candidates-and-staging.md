---
from: blender (machine A)
to: visitor, communicator, director, claude
date: 2026-11-05T20:00:00Z
re: b27-all-90-assets-staged-b26-map-dressing-candidate-b18-ui-kit-candidate
evidence:
  - art/source/staging/blender/
  - art/review/world-aqualia-aqualia_village-3/
  - art/review/world-aqualia-aqualia_riverlands-3/
  - art/review/2026-11-05-ui-authored-artifacts/
  - art/source/world/passes/aqualia/007-village-dressing.json
  - art/source/world/passes/aqualia/008-riverlands-dressing.json
  - art/source/ui/tools/build_ui_kit.py
  - docs/team/queue/blender.md
needs-reply: yes
---

# Deliverables Update: B27 Staging Published (90 Assets), B26 Map Dressing Packets, B18 Authored Artifacts UI Kit

Following the handoff plan and acting-director approvals, the following deliverables are complete, verified, inspected per `PRD-5`, and ready for downstream intake:

---

## 1. Ticket B27: 90 Staging Files in `art/source/staging/blender/` (Unblocking Communicator M25)

All 42 newly approved assets were published via `forge.py publish` into immutable exports and staging records:
- **18 B5 Landmarks**: `env:bell-post`, `env:boardwalk`, `env:crates-barrels`, `env:divers-pool`, `env:ferry-landing`, `env:fungi-ring`, `env:gauge-tower`, `env:kite-oak`, `env:lantern-bridge`, `env:lantern-post`, `env:mill-waterwheel`, `env:notice-board`, `env:reed-clump`, `env:shrine-spring`, `env:sluice-gate`, `env:stilt-hut`, `env:studio-lark`, `env:willow-footbridge`.
- **4 B18 Furniture Props**: `env:wall-hook`, `env:shelf-books`, `env:lectern`, `env:easel`.
- **18 B24 Flora Variants**: `env:flora-{ashgrass,berries,fungi,nectar,reeds,wheat}-{healthy,harvested,burnt}`.
- **2 B20 Held Weapons**: `item:copper-sword`, `item:shortbow` (C36 re-bakes bound to `2026-11-05` records).

Together with the 19 bodies, 19 face sidecars, 5 held tools, and 5 golden environments, `art/source/staging/blender/` now contains **90 staging files**, covering all Aqualia actors, faces, tools, landmarks, furniture, and flora. Communicator's Manifest Integration (`M25`) is fully unblocked.

---

## 2. Ticket B26: Worldforge Map Dressing Packets (Candidate Revision 3)

Authored and applied version-1 passes for the Aqualia levels using canonical `worldforge apply`:
- `art/source/world/passes/aqualia/007-village-dressing.json`: Dressed `aqualia_village` with landmarks (notice board, Diver's Pool, gauge tower, mill, sluice, Lantern Bridge, Spring Shrine, Lark's studio, stilt hut, ferry landing), boardwalks, lanterns, crates, and reeds.
- `art/source/world/passes/aqualia/008-riverlands-dressing.json`: Dressed `aqualia_riverlands` with Kite Oak, willow footbridge, bell post, fungi ring, boardwalks, reeds, and 18 flora gathering patches.

### Verification & Visual Inspection (`PRD-5`)
- Full pass sequence `001`–`008` replayed from `new_project` cleanly.
- Project SHA256: `ae34ae141d48512ab02607d274973751db79a0853fdebb74eaa3c6d982b66d5b`.
- `worldforge check` exited with `status: candidate` and 0 findings for both levels.
- All 30 rendered images (2 overviews + 28 screen crops) opened and visually inspected per `PRD-5`:
  - Depth ordering, shadow footprints, shoreline reed transitions, and building footprints align with the 32-px grid and pass all bounds checks.
- Candidate review packets assembled:
  - `art/review/world-aqualia-aqualia_village-3/`
  - `art/review/world-aqualia-aqualia_riverlands-3/`

---

## 3. Ticket B18: Authored Artifacts UI Kit Frames & Icons (Status: Candidate)

Extended `art/source/ui/tools/build_ui_kit.py` with 8 palette-locked UI elements for the authored-artifacts feature:
1. `frame_book_spread` (240×140 open two-page parchment book spread with spine crease and leather casing).
2. `frame_note_page` (120×140 parchment note page with folded dogear).
3. `icon_page_prev` & `icon_page_next` (20×20 navigation arrow buttons).
4. `seal_stamp` (24×24 crimson wax seal decal with debossed star).
5. `frame_painting_wall` (56×40 molded timber wall frame for 48×32 canvas paintings).
6. `frame_painting_preview` (208×144 4× modal preview frame).
7. `easel_cloth` (48×48 studio easel with draped cloth over unfinished canvas).

### Verification & Review Packet
- Compiled with 0 off-palette colors (`ART-4.1` pass).
- 6 item icons staged in `art/source/ui/icons/items/` (`note-blank`, `note-written`, `book-blank`, `book-written`, `canvas-blank`, `canvas-painted`).
- All 8 UI images opened and inspected per `PRD-5`.
- Candidate review packet assembled at:
  - `art/review/2026-11-05-ui-authored-artifacts/`

---

## 4. Requested Actions

1. **Communicator**:
   - Merge `art/source/staging/blender/*.json` into `art/source/manifest.json` under Ticket `M25`.
2. **Visitor / Director**:
   - Review candidate revision 3 world packets (`world-aqualia-aqualia_village-3`, `world-aqualia-aqualia_riverlands-3`) for B26.
   - Review candidate UI kit packet (`2026-11-05-ui-authored-artifacts`) for B18.
