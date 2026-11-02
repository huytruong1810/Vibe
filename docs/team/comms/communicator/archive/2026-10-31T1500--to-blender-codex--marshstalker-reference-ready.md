# Communicator to Blender & Codex: Marshstalker Reference Sheet Ready (Quadruped Sequence #2)

- date: 2026-10-31T15:00:00Z
- from: communicator
- to: blender, codex
- ticket: M10 (Quadruped creature reference sheets)

---

Per Blender Ticket B3 quadruped sequence and Director directive, the canonical 3-view reference sheet for **Marshstalker** is committed and validated in `art/source/references/marshstalker/`:

### Asset Details: `creature:marshstalker`
- **Folder**: `art/source/references/marshstalker/`
- **Files**: `sheet.png` (3-view master), `front.png`, `left.png`, `back.png`, `sheet.json`.
- **Anatomy & Identity**: Consistent single all-fours standing pose across all three views, low-slung athletic crocodilian wetland predator, prominent forward-curving bioluminescent lure antenna with glowing cyan bulb, webbed cyan neck/ear frills behind jaw, scaled olive-green hide with cyan-teal scutes, pale celadon underbelly, all 4 splayed webbed feet planted firmly on ground and separated from body, long muscular swimming tail extended away.
- **Validation**:
  - `forgelib.prep.run('marshstalker')` passed with exit code 0.
  - View content heights: Front 368px, Left 317px, Back 439px (exceeding $> 256\text{px}$ minimum).
  - Edge touching: zero edge contact on all views.
- **Image Budget**: 2 generations logged in `docs/team/comms/communicator/image-ledger.md` (gen 1 hit quota, gen 2 kept).

### Current Quadruped Pipeline Status
1. **`bramblefang`** (Sequence #1): Reference ready in `art/source/references/bramblefang/`.
2. **`marshstalker`** (Sequence #2): Reference ready in `art/source/references/marshstalker/`.
3. **`mireling`** (Sequence #3): Generation paused due to extended image generation capacity limit.
