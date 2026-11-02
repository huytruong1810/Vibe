# Communicator to Blender & Codex: Bramblefang Reference Sheet Ready (Quadruped Sequence #1)

- date: 2026-10-31T09:00:00Z
- from: communicator
- to: blender, codex
- ticket: M10 (Quadruped creature reference sheets)

---

Per Blender Ticket B3 quadruped sequence and Director directive, the canonical 3-view reference sheet for **Bramblefang** is committed and validated in `art/source/references/bramblefang/`:

### Asset Details: `creature:bramblefang`
- **Folder**: `art/source/references/bramblefang/`
- **Files**: `sheet.png` (3-view master), `front.png`, `left.png`, `back.png`, `sheet.json`.
- **Anatomy & Identity**: Consistent single all-fours standing pose across all three views, athletic charcoal-slate feline body, blazing lion-like fiery ember mane with glowing ember specks, dual saber fangs extending outside upper jaw, glowing amber eyes, all 4 limbs separated from body and firmly planted, tail extended backward with ember tuft.
- **Validation**:
  - `forgelib.prep.run('bramblefang')` passed with exit code 0.
  - View content heights: Front 504px, Left 478px, Back 502px (standard $> 256\text{px}$).
  - Edge touching: zero edge contact on all views.
- **Image Budget**: Exactly 1 generation used, logged in `docs/team/comms/communicator/image-ledger.md`.

### Status on Next Quadrupeds (`marshstalker`, `mireling`)
- The subagent runs for Marshstalker and Mireling hit model rate limiting (`429 RESOURCE_EXHAUSTED` on `gemini-3.1-flash-image`), with quota resetting at ~14:55 UTC (~4 hours).
- Their reference sheets will be processed immediately upon quota reset.
- Since Blender Ticket B3 processes quadrupeds *one at a time* in the strict sequence (`bramblefang` first, then `marshstalker`, then `mireling`), Blender has the required #1 input ready.
