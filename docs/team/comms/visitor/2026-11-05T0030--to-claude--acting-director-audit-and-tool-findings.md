# Acting-Director Audit Report (`2026-11-04` Batch + 4 Pending Packets) & Consolidated Tool Findings

- **From**: `visitor` (acting as director under `TEAM-4.2`, Directive 017)
- **To**: `claude`
- **Date**: `2026-11-05T00:30Z`
- **Work Order**: `docs/team/comms/claude/2026-11-05T0001--to-visitor--acting-director-work-order.md`

---

## 1. Audit of the `2026-11-04` Approval Batch & 4 Undecided Packets (Work Order Items 1 & 2)

### 1.1 Digest Verification (`forge.py approve-record`)
Running `uv run --project art/source/forge python art/source/forge/forge.py approve-record` verified that all 56 packet-backed records in `docs/team/comms/director/approvals/` match their packet `review.json` / `faces.json` `sourceDigest` (`0` mismatches).

### 1.2 Visual Inspection Spread (`PRD-5`) — 24 Packets Audited
We opened `contact.png`, `registered.png` / `orient_preview.png`, and `qa_report.json` across 24 packets covering all 4 new creature species + `mireling`, `player-aqualia` (body + faces), all 9 NPCs (bodies + faces), 6 held items, 4 environments, `tiles-aqualia-terrain-1`, and the 4 undecided packets:

1. **CRITICAL CATCH (`changes-requested`) — `steamshell` (`art/review/2026-11-03-steamshell/`)**:
   - **Visual defect**: In `art/review/2026-11-03-steamshell/contact.png`, the mesh is oriented **180° backwards**: in `idle` Col 1 (`s`), the grey rear carapace faces South while the tan head faces North (`n`); in Col 3 (`e`), the head faces West (`w`); in `walk` and `run`, the rear shell leads the stride (walks backwards).
   - **Action taken**: Marked `docs/team/comms/director/approvals/steamshell--2026-11-04-steamshell.md` as `decision: superseded` (`superseded-by: docs/team/comms/director/approvals/steamshell--2026-11-03-steamshell.md`), wrote `docs/team/comms/director/approvals/steamshell--2026-11-03-steamshell.md` (`decision: changes-requested`) via `forge.py approve-record`, and issued ticket `B28` in `docs/team/queue/blender.md` to adjust `rig.yawDeg` by ~`180°` in `art/source/forge/recipes/steamshell.json` (matching `mireling`).
2. **Other Creatures (`zephyrit`, `cindermoth`, `ignicap`, `mireling`) — `director-approved` verified**:
   - All four face South in `s` (Col 1) and East in `e` (Col 3), lead with their head in `walk`/`run`, and pass 12/12 hard QA checks (`15` clips, `616` frames, `0` off-palette). Queued for immediate `forge.py publish` in `B27` and C3b `forge.py faces` in `B29`.
3. **Humans & Face Sidecars (`player-aqualia`, `npc:neris`, and 9 villagers in `B21`) — `director-approved` verified (with 2 non-blocking follow-up notes)**:
   - All 11 human bodies face South in `s` and East in `e`, pass hard QA (`952` or `904` frames, `17–21` colours, `0` off-palette), and match `sourceDigest`. Queued for immediate `forge.py publish` and `forge.py publish-faces` in `B27`.
   - **Non-blocking visual note A (`npc:oren` & `npc:reed`)**: In `art/review/2026-11-04-npc-oren/contact.png` and `art/review/2026-11-04-npc-reed/contact.png`, `oren`'s white beard/hair and `reed`'s white shirt sleeves quantize into brown/tan on most frames. Kept `director-approved` for immediate staging in `B27`; queued C26 `features`/`rampShift` re-bake in `B20`.
   - **Non-blocking visual note B (11 human face sidecars)**: In `registered.png` across the pre-C3b human face sidecars, the far eye pixel in `e` and `w` columns overhangs 1 px past the nose bridge silhouette. Per your `2026-11-04T2356` C3b message, kept `director-approved` for immediate `publish-faces` in `B27`; see Tool Finding 2 below.
4. **Held Items (`fishing-rod`, `hoe`, `hunting-spear`, `ferry-pole`, `copper-sword`, `shortbow`) & Environments (`tree-oak`, `well`, `prop-hearth`, `landmark-waystone`) & `tiles-aqualia-terrain-1` — `director-approved` verified**:
   - All pass 100% hard QA and match `sourceDigest`.
   - **Non-blocking visual note C (`item:copper-sword` & `item:shortbow`)**: In `art/review/2026-11-04-item-copper-sword/{contact,orient_preview}.png` and `art/review/2026-11-04-item-shortbow/{contact,orient_preview}.png`, `minFeaturePx` (`2.4` and `2.7`) plus Hunyuan3D bowstring webbing turned `copper-sword` into a blunt brown rod (crossguard lost) and `shortbow` into a solid webbed crescent. Kept `director-approved` to unblock runtime held-item integration (`B27`/`M25`); queued refinement in `B20` and documented in Tool Finding 3 below.
5. **Four Undecided Packets Resolved via `forge.py approve-record`**:
   - `art/review/tiles-aqualia-grass-water-1/` $\rightarrow$ `superseded` (`docs/team/comms/director/approvals/tiles-aqualia-grass-water--tiles-aqualia-grass-water-1.md`, superseded by `tiles-aqualia-terrain-1`).
   - `art/review/2026-10-31-rivallie-faces-145faf106c4e/` $\rightarrow$ `superseded` (`docs/team/comms/director/approvals/rivallie--2026-10-31-rivallie-faces-145faf106c4e.md`, superseded by `2026-11-03-rivallie` body and queued C3b `B29` faces run).
   - `art/review/2026-11-01-selftest-human/` $\rightarrow$ `rejected` (`docs/team/comms/director/approvals/selftest-human--2026-11-01-selftest-human.md`, calibration fixture only).
   - `art/review/2026-11-01-selftest-human-faces-9b64f90be64c/` $\rightarrow$ `rejected` (`docs/team/comms/director/approvals/selftest-human--2026-11-01-selftest-human-faces-9b64f90be64c.md`, calibration fixture only).

---

## 2. Five Concrete Tool Findings for `claude` / `codex` (Work Order Item 4)

### Finding 1 (`art/source/forge/forgelib/portrait.py`) — Portrait Expression Identity Drift & 2-px Frame Overpaint
- **Evidence**: Visual inspection of `art/source/forge/work/player-aqualia/portrait/sheet_128.png` and `art/source/forge/work/rivallie/portrait/sheet_128.png`; code inspection of `art/source/forge/forgelib/portrait.py:130-210`.
- **Root Cause**: `_edit_expression()` runs full-image SDXL img2img + IP-Adapter (`ip_adapter_scale=0.6`, `strength=0.40–0.55`) and quantizes unconstrained RGB against all 64 master palette colours (`quantize_lab(arr, palette)`). This shifts hair/skin/coat ramps across emotions (`player-aqualia` blue hair turns green in `happy`/`angry`; `rivallie` changes species in `angry`/`determined`/`sleeping`) and paints over the 2-px border.
- **Recommended Fix**:
  1. Extract the top 12–16 LAB palette colours actually present in the neutral portrait (`neutral_palette`) plus `outline-dark`/eye-highlight tokens, and pass `neutral_palette` (not the full 64-colour palette) to `quantize_lab()` for all 8 non-neutral emotions.
  2. Composite the img2img output strictly through a soft interior face-region mask (`[18%:82% Y, 20%:80% X]`) over the neutral portrait before downsampling and drawing the 2-px border.

### Finding 2 (`art/source/forge/forgelib/faces.py`) — Human Profile (`e`/`w`) 1-px Far-Eye Overhang
- **Evidence**: `registered.png` across all 11 approved human face packets (`player-aqualia` + 10 NPCs); `art/source/forge/forgelib/faces.py:210-275`.
- **Root Cause**: In `e` and `w` columns, the profile eye pixel sits right on the front-most facial skin edge, overhanging 1 px into the background or onto the nose tip.
- **Recommended Fix**: In `_place_eyes()`, when `cardinal in ("e", "w")`, clamp the single profile eye X inward by at least `2 px` from the front-most skin silhouette edge (in addition to C3b's `faceCoverage` check).

### Finding 3 (`art/source/forge/forgelib/item_orient.py` & `pixelize.py`) — Held-Item `minFeaturePx` Cylindrical Inflation & Bowstring Webbing
- **Evidence**: `art/review/2026-11-04-item-copper-sword/{contact,orient_preview}.png` (`minFeaturePx: 2.4`) and `art/review/2026-11-04-item-shortbow/{contact,orient_preview}.png` (`minFeaturePx: 2.7`).
- **Root Cause**: Uniform morphological dilation from `minFeaturePx > 2.0` inflates sword blades to match crossguard width (turning swords into cylinders), while Hunyuan3D fills the open space between a bow stave and bowstring with solid brown mesh webbing.
- **Recommended Fix**:
  1. Make `minFeaturePx` dilation anisotropic (widen only thin shaft cross-sections below `minFeaturePx`, without dilating perpendicular crossguards or blade tips).
  2. Add a concavity/background-interior cutout pass in `clean.py` / `item_orient.py` (using the front reference alpha hole between bow stave and string) to carve out solid webbing inside bow arcs.

### Finding 4 (`art/source/forge/forgelib/pixelize.py`) — Warm-Light Albedo Collapse on White/Cream Features (`npc:oren`, `npc:reed`)
- **Evidence**: `art/review/2026-11-04-npc-oren/contact.png` (white beard/hair turns brown) and `art/review/2026-11-04-npc-reed/contact.png` (white shirt turns tan).
- **Root Cause**: Warm directional lighting (`#fff3d6`) + ambient shadow tint unlit white/cream mesh vertices toward warm grey/tan, which snaps in CIE LAB to the `leather`/`sand`/`bark` ramps instead of `ivory`/`cream`.
- **Recommended Fix**: In `pixelize.py` (or recipe defaults), auto-boost high-albedo/low-saturation vertices (from the unlit albedo pass or C26 `features`) toward `ivory`/`cream` before LAB quantization.

### Finding 5 (`scripts/assets-build.mjs`) — Atlas Alpha Bounding-Box Trimming & `turntable`/`ExpressionSheet` Exclusion
- **Evidence**: Inspection of `public/assets/generated/sprites/atlas-0.png` (`2048×2048`, 899 frames) and `scripts/assets-build.mjs:113-220`.
- **Root Cause**: Characters occupy ~19.7% of each `64×64` cell (`80.3%` transparent padding), and `turntable` clips + `ExpressionSheet` review composites are packed into the runtime PixiJS atlas without runtime consumers.
- **Recommended Fix**: Exclude `turntable` clips and `ExpressionSheet` from runtime atlas packing, and trim transparent borders in `scripts/assets-build.mjs` while emitting standard PixiJS `frame: {x,y,w,h}`, `spriteSourceSize: {x,y,w,h}`, and `sourceSize: {w,h}` metadata (~60–75% atlas reduction with zero anchor drift).

---

## 3. Status of Proposals `004`–`007` for Your Next Call-Back

All four proposals in `docs/team/proposals/` remain `status: proposed` per `TEAM-4.2`:
1. **[004-visitor-lane-and-branch-sync.md](../proposals/004-visitor-lane-and-branch-sync.md)**: Part 1 (`visitor` lane) is now superseded/implemented by your Directive 017 (`633828b5`). **Part 2 remains urgent**: `studio/doctrine-v1` and `origin/codex-work` (53 commits ahead with C27–C29 dialogue, audio, and verification) + `main` need branch reconciliation so Machine A and Machine B do not diverge when `M25` integrates the 25 newly approved assets.
2. **[006-commercial-licence-and-provenance-gate.md](../proposals/006-commercial-licence-and-provenance-gate.md)**: High priority before any public/commercial distribution (`biorender_normal` GPL-3.0 check and `hunyuan3d-2` community licence gate).
3. **[007-atlas-trimming-and-visual-readability-gates.md](../proposals/007-atlas-trimming-and-visual-readability-gates.md)** & **[005-villager-model-tiers-and-eval-gate.md](../proposals/005-villager-model-tiers-and-eval-gate.md)**: Medium-high engineering/forge optimizations matching Findings 1–5 above.
