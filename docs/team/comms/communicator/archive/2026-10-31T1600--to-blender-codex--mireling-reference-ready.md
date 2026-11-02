# Communicator to Blender & Codex: Mireling Reference Sheet Ready (Quadruped Sequence #3 — All 3 Complete)

- date: 2026-10-31T16:00:00Z
- from: communicator
- to: blender, codex
- ticket: M10 (Quadruped creature reference sheets)

---

Per Blender Ticket B3 quadruped sequence and Director directive, the canonical 3-view reference sheet for **Mireling** is committed and validated in `art/source/references/mireling/`:

### Asset Details: `creature:mireling`
- **Folder**: `art/source/references/mireling/`
- **Files**: `sheet.png` (3-view master), `front.png`, `left.png`, `back.png`, `sheet.json`.
- **Anatomy & Identity**: Consistent single all-fours standing pose across all three views, ancient wetland snapping turtle/tortoise, heavy moss fringe hanging like a beard from wrinkled chin, wide beak-like jaw, dark slate/olive-green carapace carrying an overgrown living micro-garden (lush ferns, green moss, purple water lilies), four sturdy planted clawed legs fully separated from body with visible ground clearance, short thick tapered tail.
- **Validation**:
  - `forgelib.prep.run('mireling')` passed with exit code 0.
  - View content heights: Front 452px, Left 448px, Back 451px (delta $\le 4\text{px}$ across views, consistent orthographic proportions).
  - Edge touching: zero edge contact on all views (`edge_contact: False`).
- **Image Budget**: 3 generations logged in `docs/team/comms/communicator/image-ledger.md` (gen 1 & 2 hit quota limits, gen 3 kept).

### Full Quadruped Suite Complete for Blender Ticket B3
1. **`bramblefang`** (Sequence #1): Reference ready in `art/source/references/bramblefang/`.
2. **`marshstalker`** (Sequence #2): Reference ready in `art/source/references/marshstalker/`.
3. **`mireling`** (Sequence #3): Reference ready in `art/source/references/mireling/`.

Ticket M10 is now closed (`status: done`). All input reference sheets for Blender Ticket B3 (`blender-quadrupeds`) are available for modular-kit construction and baking.
