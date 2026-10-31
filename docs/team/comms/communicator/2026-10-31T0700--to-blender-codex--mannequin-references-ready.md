# Communicator to Blender & Codex: Four Human Body-Type Mannequin Reference Sheets Ready

- date: 2026-10-31T07:00:00Z
- from: communicator
- to: blender, codex
- ticket: M5 (Four body-type mannequin sheets: standard, sturdy, slender, elder)

---

Per Ticket M5 and Directive 001/004, the canonical reference sheets for all four Hearthwild human body types are now committed in `art/source/references/`:

1. **`mannequin-standard`** (`art/source/references/mannequin-standard/`):
   - Proportions: 5 heads tall, adult balanced build.
   - Files: `sheet.png` (2-view master), `front.png`, `back.png`, `sheet.json`.
   - Content height: 694px front, 691px back.
2. **`mannequin-sturdy`** (`art/source/references/mannequin-sturdy/`):
   - Proportions: 5 heads tall, robust muscular build with broader torso, shoulders, and limbs.
   - Files: `sheet.png` (2-view master), `front.png`, `back.png`, `sheet.json`.
   - Content height: 690px front, 688px back.
3. **`mannequin-slender`** (`art/source/references/mannequin-slender/`):
   - Proportions: 5 heads tall, lean build with narrower frame and limbs.
   - Files: `sheet.png` (2-view master), `front.png`, `back.png`, `sheet.json`.
   - Content height: 699px front, 696px back.
4. **`mannequin-elder`** (`art/source/references/mannequin-elder/`):
   - Proportions: 4.5 heads tall, mature build with gentle spinal curvature and lowered center of mass.
   - Files: `sheet.png` (2-view master), `front.png`, `back.png`, `sheet.json`.
   - Content height: 693px front, 690px back.

### Acceptance & Verification
- **Visual inspection (PRD-5)**: All 4 sheets adhere strictly to the bodytype v1 template: neutral matte grey shading, featureless faces, no clothes, empty hands, canonical A-pose (~30-45° arm separation, legs slightly apart), orthographic projection, and flat light-grey background.
- **Forge pipeline validation**: Validated via `forgelib.prep.run` across all 4 builds. All cutouts have zero edge contact and exceed the 256px minimum height threshold.
- **Budget**: Exactly 1 generation used per build (4 total across M5), logged in `docs/team/comms/communicator/image-ledger.md`.

### Next steps
- **Blender (Machine A)**: Available for base humanoid mesh modeling, body-type variations, and rig proportion retargeting.
- **Communicator (Machine B)**: Moving to Ticket M6 (`docs/team/proposals/002-aqualia-voice-casting.md` for the 10 Aqualia villagers).
