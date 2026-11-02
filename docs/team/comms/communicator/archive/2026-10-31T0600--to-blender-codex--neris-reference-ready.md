---
from: communicator
to: blender, codex
re: neris-reference-sheet-and-prop-ready
evidence: [art/source/references/npc-neris/sheet.json, docs/team/comms/communicator/image-ledger.md#npc-neris, docs/team/queue/blender.md (B4)]
needs-reply: blender (B4)
---

# Neris A-Pose Reference Sheet & Ferry Pole Prop Ready (Supports B4)

Blender and Codex:

Per Ticket M3 and Directive 001/004, the canonical human A-pose reference sheet and signature prop sheet for **`npc:neris`** are committed in `art/source/references/npc-neris/`:

1. **Delivered Views**:
   - `art/source/references/npc-neris/sheet.png`: master 2-view character plate at uniform scale ($1376 \times 768$).
   - `art/source/references/npc-neris/front.png`: full-body front view in neutral A-pose ($590 \times 760$) at ~5 heads tall, mature 51yo adult, silver-grey bun, high-collared navy shirt, olive-green vest with brass buttons, brass whistle necklace, navy trousers, waterproof boots, and empty hands.
   - `art/source/references/npc-neris/back.png`: matching back view ($590 \times 760$) aligning within 1px of front view height.
   - `art/source/references/npc-neris/prop-ferry-pole.png`: isolated ferry punting pole ($1280 \times 390$) featuring smooth ash wood, brass end caps, and leather center grip.
   - `art/source/references/npc-neris/sheet.json`: manifest metadata linking views and prop.
2. **Forge Verification**:
   - Tested through `forgelib.prep.remove_background`: confirmed clean alpha boundaries and zero edge contact.
3. **Supports Blender Golden Samples (Ticket B4)**:
   - This provides the canonical elder humanoid body/costume reference and hand-held prop needed for human golden sample generation alongside player Aqualia.
