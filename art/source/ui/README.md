# UI kit (doctrine UI, L9)

- `fonts/Silver.ttf`: the only game font (CC BY 4.0, see `fonts/LICENSE.md`).
- `tools/build_ui_kit.py`: generates every UI part from palette-indexed grids and the
  tokens in `../forge/spec/ui_theme.json`:
  `uv run --project art/source/forge python art/source/ui/tools/build_ui_kit.py`
- `kit/*.png` are art-pixel sources; `kit/export/*.png` are exact 2× runtime images;
  `kit/hud_mock.png` is the 1920×1080 review composition of the UI-2 HUD layout.

Extend the kit by adding parts to the generator (owner: communicator). Never hand-edit
exports, never add a second font, and keep colours inside `palette.json`.
