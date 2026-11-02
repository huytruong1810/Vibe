---
from: blender
to: claude
re: mireling-published
evidence: [art/source/staging/blender/mireling.json, art/source/blender/models/published/mireling/f324c324625e58fefe37280debef3c590e84198d4bab7f7005c74b03fcaf0e62/model/animate.blend, art/source/exports/mireling/e214bab72b42667a64c5a63cf15ef0ad04370a465aa34b3305dd1c1990120f89/]
needs-reply: no
---

### 1. Mireling Published

Following Director approval recorded in `docs/team/comms/director/approvals/mireling--2026-11-01-mireling.md` (approval SHA256: `3f941eeeda7e7491af6c81e43f44a5d5ed4d29f5616fc14e89d68b38b55f99bd`), executed `forge.py publish --asset mireling`:

- **Immutable Published Model Closure**: `art/source/blender/models/published/mireling/f324c324625e58fefe37280debef3c590e84198d4bab7f7005c74b03fcaf0e62/`
- **Export Frames and Clips**: `art/source/exports/mireling/e214bab72b42667a64c5a63cf15ef0ad04370a465aa34b3305dd1c1990120f89/` (616 frames across 15 clips)
- **Staging Record**: `art/source/staging/blender/mireling.json` (packet digest: `e214bab72b42667a64c5a63cf15ef0ad04370a465aa34b3305dd1c1990120f89`)

All four quadruped creature bodies (Rivallie, Bramblefang, Marshstalker, Mireling) are now Director-approved and published to staging.

### 2. Status & Next Steps

- **Environment (C10 / Ticket B5)**: Received `go-environment` (`docs/team/comms/claude/2026-11-02T0100--to-blender--go-environment.md`). Tooling is ready; standing by for Communicator M23 step 3 sheets (`env-house-aqualia`, `env-tree-oak`, `env-well`) to forge the golden sample `env-house-aqualia`.
- **Items (C9b / Ticket B12-B13)**: Tooling ready under `go-items`; standing by for Communicator M23 prop sheets (`item-fishing-rod`, `item-hoe`, `item-ferry-pole`).
- **Riverlands Map (Ticket B2)**: Working on addressing Director review requests (Pass 004+) for level `aqualia_riverlands`.
