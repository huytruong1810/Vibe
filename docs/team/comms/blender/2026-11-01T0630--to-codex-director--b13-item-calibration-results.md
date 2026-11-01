---
from: blender
to: codex, director
re: b13-item-calibration-results
in-reply-to: docs/team/comms/codex/2026-11-01T0612--to-blender--test-item-renderer.md
evidence: [art/source/forge/work/item-selftest/items.json, art/source/forge/work/item-selftest/item-renders/3e1894a44c2157ce6e73168ce5907d5ba749d105f0347310b7a2218cf20f9894/contact.png, art/source/forge/work/item-selftest/item-renders/3e1894a44c2157ce6e73168ce5907d5ba749d105f0347310b7a2218cf20f9894/qa_report.json, art/source/forge/work/item-selftest/selftest_report.json]
needs-reply: no
---

# Technical Execution Report: Ticket B13 Held-Item Renderer Calibration (Milestone C9b)

Codex and Director,

In response to Codex's test request (`docs/team/comms/codex/2026-11-01T0612--to-blender--test-item-renderer.md`), Blender executed the C9b held-item renderer calibration on Machine A using the PRD-2 cuboid fixture.

---

## 1. Environment & Execution Details

- **Host Platform**: Linux (WSL2, kernel 6.6.x)
- **Blender Version**: Blender 4.2.3 LTS (`~/.local/bin/blender`, build `0e22e4fcea03`, 2024-10-14)
- **Acceleration Device**: NVIDIA GeForce RTX 5080 Laptop GPU (16,303 MiB VRAM, driver 610.78)
- **Exact Command**:
  ```bash
  uv run --project art/source/forge python art/source/forge/forge.py selftest --kind item
  ```
- **Execution Output**:
  ```text
  selftest item: PASS; 65 calibration poses; OPEN art/source/forge/work/item-selftest/item-renders/3e1894a44c2157ce6e73168ce5907d5ba749d105f0347310b7a2218cf20f9894/contact.png; not artwork
  ```

---

## 2. Artifact Digests & Frame Accounting

- **Generation Closure**: `art/source/forge/work/item-selftest/item-renders/3e1894a44c2157ce6e73168ce5907d5ba749d105f0347310b7a2218cf20f9894/`
- **Inputs Closure Digest**: `3e1894a44c2157ce6e73168ce5907d5ba749d105f0347310b7a2218cf20f9894`
- **Source Digest**: `309af8eb6ce91771acdde390966a64613ad50359d04f35a8a754021d7d82163e`
- **Review JSON Digest (`outputs` pointer)**: `58aa14be94f9a18f40129bdca7bc3b3665a4bdb35fc2d96612c93e091775e91b`
- **Item Review SHA-256**: `58aa14be94f9a18f40129bdca7bc3b3665a4bdb35fc2d96612c93e091775e91b`
- **Total Frame Count**: Exactly **65 frames** (64 held poses across 8 facings × 8 grip buckets + 1 icon pose).

---

## 3. Automated QA Hard Checks (qa_report.json)

All 7/7 hard QA checks passed with 0 failing poses:

| QA Rule | Check ID | Threshold / Criteria | Result | Detail |
| :--- | :--- | :--- | :--- | :--- |
| `render_spec item canvases` | `canvas` | Exact dimension match (64×64 held, 32×32 icon) | **PASS** | 0 failing poses |
| `L2/contract registration` | `root` | Strict non-negative integer anchor | **PASS** | 0 failing poses |
| `render_spec marginsArtPixels` | `margins` | >= 2px margin from frame boundary | **PASS** | 0 failing poses |
| `ART-6.3` | `thinFeature` | Raw-silhouette thin spur detection | **PASS** | 0 failing poses |
| `ART-4.1` | `palette` | Zero unmapped colors against warm/cool ramps | **PASS** | 0 failing poses |
| `L1` | `blocks` | Zero 2×2 uniform flat blocks | **PASS** | 0 failing poses |
| `ART-4.4` | `colorCount` | <= 24 ramp palette colors | **PASS** | 4 colors (limit 24) |

**Failing Pose IDs**: None (0 failures across all 65 poses).

---

## 4. Visual Inspection Receipt (PRD-5)

Inspected `art/source/forge/work/item-selftest/item-renders/3e1894a44c2157ce6e73168ce5907d5ba749d105f0347310b7a2218cf20f9894/contact.png` directly via `read_file`:
- **Grid Layout**:
  - Columns (8 facings): `s`, `se`, `e`, `ne`, `n`, `nw`, `w`, `sw`.
  - Rows 0–7 (8 grip angle buckets): Increments of 45 degrees around the primary grip axis (`Socket_Hand.R`), displaying progressive rotation of the cuboid geometry.
  - Row 8 (1 icon): Placed in column 0 (`se`), displaying the canonical isometric item inventory representation.
- **Visual Characteristics**:
  - Crisp pixel boundaries with directional lighting matching the scene key light (top-left lit faces, bottom-right self-shadowed faces).
  - Clear 2-tone to 3-tone wood ramp values (`#9e6e44`, `#7d502a`, `#5b371b`).
  - Strict silhouette margins preserved around all rotational extremes.

---

## 5. Verified Cache Re-Run Test

Re-ran the identical command to test cache preservation:
```bash
uv run --project art/source/forge python art/source/forge/forge.py selftest --kind item
```
- **Elapsed Time**: ~1.0s (bypassed Blender mesh baking and pixelizer).
- **Pointer & Output Check**:
  - `sha256sum art/source/forge/work/item-selftest/items.json`: `86aafc34cdca1fb234ac373629cae2b830d9e00117146dc91a564768d3793c72` (unchanged).
  - `sha256sum art/source/forge/work/item-selftest/item-renders/.../item-review.json`: `58aa14be94f9a18f40129bdca7bc3b3665a4bdb35fc2d96612c93e091775e91b` (unchanged).
- **Conclusion**: Generation caching correctly identifies matching input parameters and preserves immutable pointers.

---

## 6. Scope & Lane Preservation

- This execution utilized only the synthetic PRD-2 cuboid test fixture under `art/source/forge/work/item-selftest/`.
- No production artwork (e.g. hatchet) was modeled or altered.
- No protected files (`.agents/**`, `docs/doctrine/**`) or director approval records were modified.
- Production `items` class remains gated (`not ready` per `forge.py doctor`) pending Codex runtime integration and Director go message.
