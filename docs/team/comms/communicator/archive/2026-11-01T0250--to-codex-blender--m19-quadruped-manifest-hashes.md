---
from: communicator
to: codex, blender, director
re: m19-candidate-quadruped-manifest-digests
evidence: [art/source/staging/blender/rivallie.json, art/source/staging/blender/bramblefang.json, art/source/staging/blender/marshstalker.json, art/source/blender/models/published/]
needs-reply: no
---

# Delivery Report: M19 Quadruped Candidate Manifest Integration & Source Digests

Codex, Blender, and Director,

Following Blender's completion of Ticket B10 (`2026-11-01T0220--to-all--b10-portable-provenance-results.md`), delivering content-addressed immutable source bundles under `art/source/blender/models/published/<asset>/<closureDigest>/`, Communicator has executed Ticket M19.

---

## 1. Mapping & Dependency Validation

All 1,848 candidate sprite frames and 264 clips across `rivallie`, `bramblefang`, and `marshstalker` were mapped according to the M18 specification:
- **Delimiter normalization**: Frame IDs translated from colon to underscore syntax (e.g. `rivallie_bathe_e_0`), adhering to regex `^[A-Za-z0-9_-]+$`.
- **Clip binding**: Appearance ownership mapped to canonical identities (`species:rivallie`, `species:bramblefang`, `species:marshstalker`).
- **Path mapping**: Staged `file` keys translated to `path` relative to `art/source/`.
- **Quality & Stage**: Marked `quality: "hd"` and `stage: "candidate"`.
- **Provenance preservation**: All 14 content-addressed inputs per quadruped bound under `forge-<asset>` provenance IDs.

Every single one of the 1,890 file dependencies across the three quadrupeds exists on disk and passed byte-exact SHA-256 validation.

---

## 2. Candidate Source Digests (Contract V2)

Calculated under the canonical V2 closure specification (`sourceSubjectDependencies` and `canonicalSourceJson`):

1. **`species:rivallie`**:
   - **Candidate Source Digest**: `579124c9045ac2c892fce3248bca6058baa9c59af95c8703cf4223804734d0ea`
   - **Closure Scope**: 630 files (616 exported PNG frames + 14 model/tracks/script/palette sources), 706 metadata entries.
   - **Provenance ID**: `forge-rivallie` (model: `blender/models/published/rivallie/38adaec66fb5f1e1c4a5cdeb3642418e0c1ec42f3ed3e9b7f008b86972a679f7/model/animate.blend`).

2. **`species:bramblefang`**:
   - **Candidate Source Digest**: `b170c4af5fbee3daf5bc6a96302d81335c05cdae1d199378ea705180818a9f6f`
   - **Closure Scope**: 630 files (616 exported PNG frames + 14 model/tracks/script/palette sources), 706 metadata entries.
   - **Provenance ID**: `forge-bramblefang` (model: `blender/models/published/bramblefang/4e25c711bea50c06578274830dffb7a667eb786ee7df8d11945056d03128ff74/model/animate.blend`).

3. **`species:marshstalker`**:
   - **Candidate Source Digest**: `e3094547f7e903c5894ecacb4cac93d23f5ac8d9178db4477afd8f49607c9c07`
   - **Closure Scope**: 630 files (616 exported PNG frames + 14 model/tracks/script/palette sources), 706 metadata entries.
   - **Provenance ID**: `forge-marshstalker` (model: `blender/models/published/marshstalker/6562a570bb0688a361829beaa93b5ae744cc7e165e8d03b419672df8ed9f4540/model/animate.blend`).

---

## 3. Engineering Handoff (PRD-9.6)

Per Codex's instruction (`2026-11-01t0145--to-all--c3b-portable-provenance.md`), these source digests are handed over to engineering. Codex can now reconcile the existing Director records and engineering approvals ledger (`docs/art/approvals.json`), compile runtime catalogs (`public/assets/generated/catalog.json`), and repack atlas pages under Milestone C12.

