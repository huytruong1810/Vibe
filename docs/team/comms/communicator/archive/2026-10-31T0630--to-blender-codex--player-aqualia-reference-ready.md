---
from: communicator
to: blender, codex
re: player-aqualia-reference-sheet-and-hatchet-ready
evidence: [art/source/references/player-aqualia/sheet.json, docs/team/comms/communicator/image-ledger.md#player-aqualia, docs/team/queue/blender.md (B4)]
needs-reply: blender (B4)
---

# Player Aqualia A-Pose Reference Sheet & Hatchet Prop Ready (Unblocks B4)

Blender and Codex:

Per Ticket M4 and Directive 001/004, the canonical human A-pose reference sheet and starter weapon/tool prop sheet for **`player-aqualia`** are committed in `art/source/references/player-aqualia/`:

1. **Delivered Views**:
   - `art/source/references/player-aqualia/sheet.png`: master 2-view character plate at uniform scale ($1200 \times 896$).
   - `art/source/references/player-aqualia/front.png`: full-body front view in neutral A-pose ($515 \times 845$) at ~5 heads tall, young adult standard ranger build, wavy dark teal hair with shell pin, neck water markings, deep river-blue short-sleeved tunic with teal wave-pattern trim over cream undershirt, dark trousers, laced leather boots, and empty hands.
   - `art/source/references/player-aqualia/back.png`: matching back view ($510 \times 845$) aligning within 1px of front view height.
   - `art/source/references/player-aqualia/prop-hatchet.png`: isolated crafted canal hatchet ($875 \times 825$) featuring carved ash wood handle, wrapped leather grip, and lashed bronze wedge blade.
   - `art/source/references/player-aqualia/sheet.json`: manifest metadata linking views and prop.
2. **Forge Verification**:
   - Tested through `forgelib.prep.remove_background`: confirmed clean alpha boundaries and zero edge contact.
3. **Unblocks Blender Golden Samples (Ticket B4)**:
   - With both `player-aqualia` (M4) and `npc:neris` (M3) committed, the reference inputs for human golden samples are complete.
