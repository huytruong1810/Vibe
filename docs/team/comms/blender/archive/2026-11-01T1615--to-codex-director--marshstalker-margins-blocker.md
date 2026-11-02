# Blocker: Marshstalker QA margins 0px on rearing clips

--to-codex--
--to-director--

Marshstalker (`creature:marshstalker`) has been processed through the Sprite Forge from communicator ticket M10 reference sheet (`sheet.png`, `front.png`, `left.png`, `back.png`). Automated QA reached 11/12 hard checks passing on recipe `marshstalker.json` (`heightArtPx: 34`, `ramps: {hide: moss, scutes: teal, belly: reed, lure: water}`), but is blocked from candidate review packeting by a hard check failure on `margins`.

## Evidence & QA Status

- QA command: `uv run --project art/source/forge python art/source/forge/forge.py qa --asset marshstalker`
- QA report: `art/source/forge/work/marshstalker/qa_report.json`
- Passing hard checks (11/12): `clipMatrix` (15 clips, 616 frames), `canvas` (all 80x72), `anchorDrift` (0.000px drift), `height` (tallest idle extent 37px vs target 34 +/- 2, outline adds 1), `facingSilhouetteRatio` (0.77 to 1.21), `paletteMembership` (0 off-palette colors), `colorCount` (17/20), `outlineContinuity` (0 gaps), `orphans` (0 orphans), `referenceFidelity` (0.035), `castDistinctness` (distinct).
- Failing hard check (1/12):
  `margins (contract margins): smallest transparent margin 0px (need >= 2)`
- Contact sheet: inspected via `read_file` at `art/source/forge/work/marshstalker/contact.png`.

## Root Cause Analysis

1. **Anatomy**: Marshstalker is an elongated crocodilian quadruped (clean mesh dimensions `[0.9466, 1.8129, 0.8251]`, length 1.81m, tail extends 1.0m behind hind feet).
2. **Re-centering in `rig.py`**: In `art/source/forge/blender/rig.py` lines 56-58, `rig.py` re-centers on the full bounding box midpoint `-(V[:, 1].min() + V[:, 1].max()) / 2` rather than preserving the footprint feet grounded at `(0, 0)` by `clean.py`. Because the tail extends 1.0m behind the rear feet, the bounding box midpoint is +0.25m behind the feet. Re-centering on bbox shifts the mesh forward by 0.25m (-Y), projecting as a ~4px upward shift on screen in 30° elevation.
3. **Rearing Clips in `gaits.py`**: In `art/source/forge/blender/gaits.py`, `social` and `element` apply `_rear(p, c, 46)` without tail counter-rotation or sideways curling (contrast with `_lie` in `gaits.py` which explicitly curls the tail by `-38 * k` to keep otters from pointing tails at the camera). Tilting an elongated 1.81m crocodilian with 1.0m tail by 46° pitches the tail tip 21 pixels below the anchor.
4. **Canvas Limit**: Canvas `creature.large` is 80×72 with anchor `[40, 56]`, leaving only 16 pixels below the anchor. A 21-pixel tail drop touches row 71 (the bottom edge).
5. **Outline Roll Wrap**: In `art/source/forge/forgelib/pixelize.py` lines 112-119, exterior outline extraction uses `np.roll(mask, (dy, dx), axis=(0, 1))`. When the silhouette touches row 71, `np.roll` wraps row 71 into row 0, generating spurious outline pixels at row 0 as well.
6. **Recipe Tuning Exhausted**:
   - Lowering `heightArtPx` to 31 or 25 still touches row 71 during rearing clips and additionally breaks the `height` check (`ART-6.1`) because idle frame 0 retains the 4px Y-shift from `rig.py`.
   - `marshstalker` is already assigned to the largest creature canvas (`creature.large`).

## Proposed Codex Resolution

Per doctrine `PRD-6.3` and `blender.md`, forge code and spec modifications belong to Codex:
1. **Gait adjustment**: Add tail curl or counter-rotation to `_rear` in `art/source/forge/blender/gaits.py` so long-tailed quadrupeds curl the tail sideways during rear-up clips (similar to `_lie`), OR
2. **Anchor / Rig preservation**: Preserve the footprint feet anchor `(0, 0)` in `rig.py` rather than re-centering on the snout-to-tail bounding box midpoint, OR
3. **Canvas / Anchor headroom**: Raise the anchor or enlarge canvas for `creature.large` rearing clips in `render_spec.json` (analogous to Codex's 2026-11-01 adjustment on `creature.medium` in `render_spec.json` line 249 for Rivallie's tail).

Ticket B3 marked `blocked:` pending Codex resolution.
