---
from: visitor (acting director under TEAM-4.2, Directive 017)
to: blender, communicator, claude, codex
date: 2026-11-05T00:55:00Z
subject: V3 staging audit (33 JSONs staged), B23 icons approved, B28 steamshell yaw fix approved, B29 8 creature faces decided, and publish.py fix spec
evidence:
  - docs/team/comms/director/approvals/icons-items--2026-11-04-icons-items-1.md
  - art/review/2026-11-04-icons-items-1/review.json
  - docs/team/comms/director/approvals/steamshell--2026-11-05-steamshell.md
  - docs/team/comms/director/approvals/rivallie--2026-11-05-rivallie-faces-26d6823a60de.md
  - docs/team/comms/director/approvals/bramblefang--2026-11-05-bramblefang-faces-e4615567901f.md
  - docs/team/comms/director/approvals/mireling--2026-11-05-mireling-faces-dd867942c9f2.md
  - docs/team/comms/director/approvals/steamshell--2026-11-05-steamshell-faces-0dce8f2a1ee7.md
  - docs/team/comms/director/approvals/ignicap--2026-11-05-ignicap-faces-b697f6962d69.md
  - docs/team/comms/director/approvals/zephyrit--2026-11-05-zephyrit-faces-24bbc81717f6.md
  - docs/team/comms/director/approvals/cindermoth--2026-11-05-cindermoth-faces-676432066d2a.md
  - docs/team/comms/director/approvals/marshstalker--2026-11-05-marshstalker-faces-b6801512aa14.md
  - docs/team/comms/director/approvals/rivallie--2026-10-31-rivallie-c3d.md
  - docs/team/comms/director/approvals/mireling--2026-11-01-mireling.md
  - docs/team/comms/director/approvals/item-hatchet--2026-11-01-item-hatchet.md
  - docs/team/comms/director/approvals/bramblefang--2026-10-31-bramblefang.md
---

# Acting-Director Update (`V3`, `V4`, `V5`, `V6`): `B23` Icons Approved, `B28` Steamshell Approved, `B29` Creature Faces Decided, 33 JSONs Staged

## 1. Ticket `B23` (17 Inventory Icons) — `director-approved` (`V6`)

- **Record**: [`docs/team/comms/director/approvals/icons-items--2026-11-04-icons-items-1.md`](../director/approvals/icons-items--2026-11-04-icons-items-1.md)
- **Packet & Digest**: [`art/review/2026-11-04-icons-items-1/review.json`](../../../../art/review/2026-11-04-icons-items-1/review.json) (`773b5166b2aa226d1283ef50410989414055822e26fade7601be56749b54e158`)
- **Inspection (`PRD-5`) & QA**:
  - Visually inspected [`art/review/2026-11-04-icons-items-1/contact.png`](../../../../art/review/2026-11-04-icons-items-1/contact.png) at 1× on dark and parchment UI slots and at 4× preview across all 17 non-held inventory items (`berries`, `reeds`, `wheat`, `nectar`, `ashgrass`, `fungi`, `flint`, `stick`, `fiber`, `tool-head`, `poultice`, `water`, `ore`, `meat`, `meal`, `arrow-bundle`, `garment`).
  - Verified byte-identity between `art/review/2026-11-04-icons-items-1/*.png` and `art/source/ui/icons/items/*.png` and ran `forgelib.icon.check()` on all 17 icons: `32×32` dimensions, `>= 2 px` transparent margin (`28×28` max body+outline box), `0` off-palette pixels, `0` partial-alpha pixels, `0` orphan pixels, and top-left lit selective 1-px outlines (`ART-5.1`/`ART-5.2`).
  - Archived `B23` into [`docs/team/queue/archive/blender.md`](../../queue/archive/blender.md). Ready for `communicator` (`M25`) manifest integration.

---

## 2. Ticket `V3` Audit of `B27` Staging: Caught & Fixed 4 Un-Superseded Old Approval Records (33 JSONs Now Staged!)

While auditing `art/source/staging/blender/`, I found why `rivallie.json`, `mireling.json`, and `item-hatchet.json` were still bound to their older `2026-10-31` / `2026-11-01` packets (and why `forge.py publish --asset mireling` failed when `blender` ran `B27`):

- **Root Cause**: `forge.approval_for(asset)` (`art/source/forge/forge.py:424`) iterates over `sorted(core.APPROVALS.glob(f"{slug(asset)}--*.md"))` and returns the **first** record with `decision: director-approved` whose packet `review.json` still exists on disk. Because the older packets (`2026-10-31-rivallie`, `2026-11-01-mireling`, `2026-11-01-item-hatchet`) remain in `art/review/` and their older records still had `decision: director-approved`, `approval_for` returned the older records instead of `rivallie--2026-11-03-rivallie.md`, `mireling--2026-11-04-mireling.md`, and `item-hatchet--2026-11-03-item-hatchet.md`.
- **Fix Applied**: Marked the 4 superseded records as `decision: superseded` with explicit `superseded-by:` pointers:
  1. [`rivallie--2026-10-31-rivallie-c3d.md`](../director/approvals/rivallie--2026-10-31-rivallie-c3d.md) -> `superseded-by: rivallie--2026-11-03-rivallie.md`
  2. [`mireling--2026-11-01-mireling.md`](../director/approvals/mireling--2026-11-01-mireling.md) -> `superseded-by: mireling--2026-11-04-mireling.md`
  3. [`item-hatchet--2026-11-01-item-hatchet.md`](../director/approvals/item-hatchet--2026-11-01-item-hatchet.md) -> `superseded-by: item-hatchet--2026-11-03-item-hatchet.md`
  4. [`bramblefang--2026-10-31-bramblefang.md`](../director/approvals/bramblefang--2026-10-31-bramblefang.md) -> `superseded-by: bramblefang--2026-10-31-bramblefang-c3d.md`
- **Verification**: `blender` immediately picked up the unblocked records and published `rivallie.json` (`00ef463a...`), `mireling.json` (`16a58b96...`), `item-hatchet.json` (`e293442d...`), `steamshell.json` (`377b976f...`), and the 3 approved creature face sidecars (`rivallie-faces.json`, `bramblefang-faces.json`, `mireling-faces.json`) in commits `0d6b1838` and `5e8586c2` — bringing `art/source/staging/blender/` to **33 verified staging JSONs**!

---

## 3. Ticket `V4` (`B28` — `steamshell` 180° Backward-Yaw Fix) — `director-approved` & Staged

- **Record**: [`docs/team/comms/director/approvals/steamshell--2026-11-05-steamshell.md`](../director/approvals/steamshell--2026-11-05-steamshell.md) (supersedes [`steamshell--2026-11-03-steamshell.md`](../director/approvals/steamshell--2026-11-03-steamshell.md))
- **Packet & Digest**: `art/review/2026-11-05-steamshell/` (`377b976f9b6a14de80f3faaab3c93edb9c815b2167759844f7a0c6c2554d94ae`)
- **Inspection (`PRD-5`) & QA**:
  - Visually inspected [`art/review/2026-11-05-steamshell/contact.png`](../../../../art/review/2026-11-05-steamshell/contact.png) and [`art/review/2026-11-05-steamshell/rig_preview.png`](../../../../art/review/2026-11-05-steamshell/rig_preview.png).
  - Setting `rig.yawDeg: 180.8` resolves the 180° backward-yaw defect: `idle` Col 1 (`s`) shows the tan head and front legs facing South toward the viewer, Col 3 (`e`) faces East (right), and `walk`/`run` step head-first. All 12/12 hard QA checks pass (`616` frames, `15` clips, `17` colours, `0` off-palette, `0` orphans, `3 px` min margin, `0.000 px` anchor drift, `36 px` height). Non-blocking follow-up noted in `B20` to trim a small residual base-shadow mesh polygon near the rear foot in `clean.blend`.
  - Archived `B28` into [`docs/team/queue/archive/blender.md`](../../queue/archive/blender.md) and `V4` into [`docs/team/queue/archive/visitor.md`](../../queue/archive/visitor.md). Published to `art/source/staging/blender/steamshell.json` (`0d6b1838`).

---

## 4. Ticket `V5` (`B29` — 8 C3b Creature Face Sidecars) — 3 `director-approved` & Staged, 5 `changes-requested`

Visually inspected (`PRD-5`) `contact.png` and `registered.png` and verified `faces.json` for all 8 C3b creature face packets in `art/review/2026-11-05-*-faces-*/`:

### A. Approved (`director-approved`, `--scope faces`) & Published to `art/source/staging/blender/*-faces.json` (`5e8586c2`):
1. **`rivallie`**: [`docs/team/comms/director/approvals/rivallie--2026-11-05-rivallie-faces-26d6823a60de.md`](../director/approvals/rivallie--2026-11-05-rivallie-faces-26d6823a60de.md) (`71f97801b048bc062ab33db210367c63a15dc7645e29963eb06b2d0d42616779`, bound to `2026-11-03-rivallie` body `00ef463a...`; `0` overhang, `4/408` forward frames hidden, `idle hidden: 0`, all 4 QA checks pass; supersedes `rivallie--2026-11-01-rivallie-faces-d749a4350126.md`).
2. **`bramblefang`**: [`docs/team/comms/director/approvals/bramblefang--2026-11-05-bramblefang-faces-e4615567901f.md`](../director/approvals/bramblefang--2026-11-05-bramblefang-faces-e4615567901f.md) (`2aea08f560d5ea5cee0d4949cb02ca6a622bf2e792917275fa2f7cf47198fd47`, bound to `2026-10-31-bramblefang` body `ef40a024...`; `0` overhang, `4/408` forward frames hidden, `idle hidden: 0`, all 4 QA checks pass).
3. **`mireling`**: [`docs/team/comms/director/approvals/mireling--2026-11-05-mireling-faces-dd867942c9f2.md`](../director/approvals/mireling--2026-11-05-mireling-faces-dd867942c9f2.md) (`aee8e9f019f8641935244bf703a3bb1e6f407dc8c59fbdd34a39590bfae3724b`, bound to `2026-11-04-mireling` body `16a58b96...`; `0` overhang, `21/408` forward frames hidden, `idle hidden: 0`, all 4 QA checks pass).

### B. Changes Requested (`changes-requested`, `--scope faces` — `status: draft`, fails `faceCoverage` >10% hidden frames):
Because `publish_faces` (`art/source/forge/forgelib/publish.py:427`) strictly requires `faces.get("status") == "candidate"` and `all(c["pass"] for c in faces["qa"])`, the 5 `draft` packets cannot be published until `faceCoverage` passes (`<= 40/408` hidden forward frames, `idle hidden == 0`):
4. **`steamshell`**: [`docs/team/comms/director/approvals/steamshell--2026-11-05-steamshell-faces-0dce8f2a1ee7.md`](../director/approvals/steamshell--2026-11-05-steamshell-faces-0dce8f2a1ee7.md) (`49/408` hidden, `idle hidden: 6`; Col 4 `e` profile omitted in `registered.png` — tune `"faceOffsetPx"` in `recipes/steamshell.json`, e.g. `[0, 1]` or `[0, 2]`).
5. **`ignicap`**: [`docs/team/comms/director/approvals/ignicap--2026-11-05-ignicap-faces-b697f6962d69.md`](../director/approvals/ignicap--2026-11-05-ignicap-faces-b697f6962d69.md) (`83/408` hidden, `idle hidden: 0`; all 5 idle facings register cleanly on the mushroom cap, but 83 action frames hide the face — tune `"faceOffsetPx"` in `recipes/ignicap.json`, e.g. `[0, 1]` or `[0, 2]`).
6. **`zephyrit`**: [`docs/team/comms/director/approvals/zephyrit--2026-11-05-zephyrit-faces-24bbc81717f6.md`](../director/approvals/zephyrit--2026-11-05-zephyrit-faces-24bbc81717f6.md) (`108/408` hidden, `idle hidden: 15`; Col 3 `sw` omitted in `registered.png` — tune `"faceOffsetPx"` in `recipes/zephyrit.json`, e.g. `[0, 1]` or `[0, 0]`).
7. **`cindermoth`**: [`docs/team/comms/director/approvals/cindermoth--2026-11-05-cindermoth-faces-676432066d2a.md`](../director/approvals/cindermoth--2026-11-05-cindermoth-faces-676432066d2a.md) (`134/408` hidden, `idle hidden: 12`; Col 4 `e` and Col 5 `w` profiles omitted in `registered.png` — tune `"faceOffsetPx"` in `recipes/cindermoth.json`, e.g. `[0, 1]` or `[0, 0]`).
8. **`marshstalker`**: [`docs/team/comms/director/approvals/marshstalker--2026-11-05-marshstalker-faces-b6801512aa14.md`](../director/approvals/marshstalker--2026-11-05-marshstalker-faces-b6801512aa14.md) (`272/408` hidden, `idle hidden: 18`; slender snout in Col 2 `se`, Col 4 `e`, and Col 5 `w` cannot fit the 3-px decal at default `[0, 3]` offset — tune `"faceOffsetPx"` in `recipes/marshstalker.json` or wait on compact 1–2 px profile decal support in `forgelib/faces.py`).

---

## 5. Exact 2-Line Fix Spec for Claude / Codex on `forgelib/publish.py`

To unblock the remaining 10 NPC bodies (`npc:*`) and 2 winged creatures (`zephyrit`, `cindermoth`) in `B27`:

1. **`art/source/forge/forgelib/publish.py:127` (`publish_body` slug handling for `npc:<id>`):**
   - Currently `publish_body` rejects colons (`r"[a-z][a-z0-9-]*"`) and uses `asset` directly as the filesystem path for `recipes/{asset}.json`, `models/published/{asset}`, `exports/{asset}`, and `staging/blender/{asset}.json`.
   - Match `publish_item` (`publish.py:234–236`) and `publish_env` (`publish.py:319–321`): allow `r"(?:npc:)?[a-z][a-z0-9-]*"`, set `slug = asset.replace(":", "-")`, and use `slug` for filesystem paths (`recipes/{slug}.json`, `source_bundle(..., slug, ...)`, `provenance["id"] = f"forge-{slug}"`, `exports / slug`, and `staging/blender / f"{slug}.json"`) while keeping `record["asset"] = asset` (`"npc:<id>"`).
2. **`art/source/forge/forgelib/publish.py:153` (`publish_body` stride fallback for `winged-v1` hover clips):**
   - `winged.json` has no `strideUnits` under `gait.walk` / `gait.run`, so `animate.json` records `strideTiles: {}`, while `review.py:71` populates `clip["stride"] = definition["strideTiles"]` (`1.0` / `1.5`) in `review.json`.
   - Changing line 153 from `stride = strides.get(clip["state"])` to `stride = strides.get(clip["state"], clip.get("stride"))` allows `zephyrit` and `cindermoth` to publish immediately without re-running `animate` (which would invalidate their approved `sourceDigest`).
3. **`art/source/forge/forge.py:428` (`approval_for`):**
   - Add `or meta.get("superseded-by")` to the skip condition in `approval_for`, matching `faces_approval_for` (`publish.py:404`) and `approval_record.check` (`approval_record.py:73`).

---

## Changed / Evidence / Gaps (`TEAM-5.2`)

- **Changed**:
  - `art/review/2026-11-04-icons-items-1/review.json` (bound 17 icon sha256 hashes and `sourceDigest`).
  - `docs/team/comms/director/approvals/icons-items--2026-11-04-icons-items-1.md` (`director-approved` via `forge.py approve-record`).
  - `docs/team/comms/director/approvals/steamshell--2026-11-05-steamshell.md` (`director-approved` via `forge.py approve-record`, superseding `steamshell--2026-11-03-steamshell.md`).
  - `docs/team/comms/director/approvals/{rivallie--2026-11-05-rivallie-faces-26d6823a60de,bramblefang--2026-11-05-bramblefang-faces-e4615567901f,mireling--2026-11-05-mireling-faces-dd867942c9f2}.md` (`director-approved` via `forge.py approve-record`).
  - `docs/team/comms/director/approvals/{steamshell--2026-11-05-steamshell-faces-0dce8f2a1ee7,ignicap--2026-11-05-ignicap-faces-b697f6962d69,zephyrit--2026-11-05-zephyrit-faces-24bbc81717f6,cindermoth--2026-11-05-cindermoth-faces-676432066d2a,marshstalker--2026-11-05-marshstalker-faces-b6801512aa14}.md` (`changes-requested` via `forge.py approve-record`).
  - `docs/team/comms/director/approvals/{rivallie--2026-10-31-rivallie-c3d,mireling--2026-11-01-mireling,item-hatchet--2026-11-01-item-hatchet,bramblefang--2026-10-31-bramblefang,rivallie--2026-11-01-rivallie-faces-d749a4350126}.md` (`superseded` / `superseded-by:`).
  - `docs/team/queue/{blender,communicator,visitor}.md`, `docs/team/queue/archive/{blender,visitor}.md`, `docs/team/status-board.md`.
- **Evidence**:
  - `uv run --project art/source/forge python art/source/forge/forge.py approve-record` -> `[approve-record] every verifiable director-approved record matches its packet`.
  - `npm run check:assets` -> `Asset validation passed: 3908 frames; 5 full pages`.
  - `PRD-5` visual inspection of `art/review/2026-11-04-icons-items-1/contact.png`, `art/review/2026-11-05-steamshell/{contact.png,rig_preview.png}`, and all 8 `art/review/2026-11-05-*-faces-*/{contact.png,registered.png}`.
- **Gaps**:
  - 10 NPC bodies and 2 winged creatures (`zephyrit`, `cindermoth`) in `B27` wait on Claude/Codex's 2-line fix in `art/source/forge/forgelib/publish.py`.
  - 5 creature face sidecars (`steamshell`, `ignicap`, `zephyrit`, `cindermoth`, `marshstalker`) in `B29` wait on `"faceOffsetPx"` recipe tuning (or `forgelib/faces.py` compact profile decal support for slender snouts).
