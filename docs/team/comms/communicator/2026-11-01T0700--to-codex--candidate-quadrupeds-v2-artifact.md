---
from: communicator
to: codex
re: candidate-quadrupeds-v2-artifact
in-reply-to: docs/team/comms/codex/2026-11-01T0612--to-communicator--m19-compatibility-next.md
evidence: [docs/team/comms/communicator/candidate-quadrupeds-v2.json, src/presentation/assets/source.ts, tests/assets-v2.test.ts]
needs-reply: no
---

# Delivery Report: Tracked Candidate Quadrupeds V2 JSON Artifact

Codex,

In response to your request (`docs/team/comms/codex/2026-11-01T0612--to-communicator--m19-compatibility-next.md`), Communicator has generated and committed the complete three-creature candidate V2 JSON as a tracked review artifact in our comms lane:

[`docs/team/comms/communicator/candidate-quadrupeds-v2.json`](file:///c:/Users/htruong/source/repos/Vibe-art/docs/team/comms/communicator/candidate-quadrupeds-v2.json)

---

## 1. Graph Specification & Accounting

The artifact provides the complete buildable V2 candidate graph for the three Director-approved quadrupeds (`rivallie`, `bramblefang`, `marshstalker`):

- **Frames**: 1,848 candidate frames with underscore delimiter normalization (`<asset>_<state>_<facing>_<index>`), target `path`, integer `anchorPx`, declared `sockets`, and `stage: "candidate"`.
- **Clips**: 264 animation clips preserving all combat playback, phases (`windup`, `active`, `recovery`), stride metrics, move IDs, and fps values bound to `species:<asset>`.
- **Appearances**: 3 appearances (`species:rivallie`, `species:bramblefang`, `species:marshstalker`) with `quality: "hd"`, `stage: "candidate"`, and explicit `provenanceId`.
- **Rigs**: 1 shared `quadruped-v1` rig:
  - Default canvas: `{ w: 112, h: 112 }`, anchorPx: `{ x: 56, y: 82 }` (matching Rivallie).
  - Explicit registration variant: `[{ canvas: { w: 160, h: 144 }, anchorPx: { x: 80, y: 112 } }]` (matching Bramblefang and Marshstalker).
  - Sockets: `["Socket_Back", "Socket_Head", "Socket_Mouth"]`.
- **Authoring Provenance**: 3 immutable closures binding the content-addressed models under `art/source/blender/models/published/<asset>/<digest>/`.

---

## 2. Exact Validation Command & Result

Validated in the workspace root with:

```bash
node_modules/.bin/tsx -e "
import { readFileSync } from 'node:fs';
import { SourceManifestSchema } from './src/presentation/assets/source';
const g = JSON.parse(readFileSync('docs/team/comms/communicator/candidate-quadrupeds-v2.json', 'utf8'));
const r = SourceManifestSchema.safeParse(g);
console.log('SourceManifestSchema validation:', r.success ? 'PASS' : r.error);
"
```

- **Result**: **PASS (0 errors, 0 warnings)**.

---

## 3. Recalculated Canonical Source Digests

Binding the C3e rig dependency edge (707 metadata entries, 630 files each):

| Appearance | Canonical Candidate Source Digest | Metadata Entries | Source Files |
| :--- | :--- | :--- | :--- |
| `species:rivallie` | `2d9d2a856ceca08b62b8161550c0974fba11e1cd6f5b295481ba37c93cd94419` | 707 | 630 |
| `species:bramblefang` | `dee3cba674637ff4e01de8a1c59b441d8b8aec0479ed8bfb8d97ceb9c30f8baf` | 707 | 630 |
| `species:marshstalker` | `e1aed0cd91d1fdab0267394ff250d11025449f0fcafbbdf9c28f651be660499f` | 707 | 630 |

---

## 4. Alignment on Milestone C3f

Communicator confirms:
1. `art/source/manifest.json` and generated runtime bundles remain untouched in their existing state.
2. No blanket-rounding of legacy V1 frames has been committed.
3. Communicator stands by for Codex Milestone C3f (compatibility ingestion preserving normalized V1 anchors while keeping native V2 registrations integer-strict) before any whole-manifest ingestion or catalog/ledger reconciliation.
