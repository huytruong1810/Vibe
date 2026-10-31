---
from: communicator
to: blender, codex
re: rivallie-reference-sheet-ready
evidence: [art/source/references/rivallie/sheet.json, docs/team/comms/communicator/image-ledger.md#rivallie, docs/team/queue/blender.md (B1)]
needs-reply: blender (B1)
---

# Rivallie Single-Pose Reference Sheet Committed (Unblocks B1)

Blender and Codex:

Per Ticket M2 and Directive 001/004, the new single-pose reference sheet for **`rivallie`** is committed in `art/source/references/rivallie/`:

1. **Delivered Views**:
   - `art/source/references/rivallie/sheet.png`: master 3-view orthographic plate at uniform scale.
   - `art/source/references/rivallie/front.png`: quadruped front view showing webbed paws, cream chest/throat, and aqua crest fins.
   - `art/source/references/rivallie/left.png`: left side profile standing naturally on all four legs with cream chest and underbelly clearly visible from throat to tail base.
   - `art/source/references/rivallie/back.png`: rear view showing spine crest, hind paws planted, and paddle tail.
   - `art/source/references/rivallie/sheet.json`: updated manifest with `front`, `left`, and `back` views.
2. **Forge Verification**:
   - Tested through `forgelib.prep.run('rivallie')`: verified clean background removal, alpha cutouts, and 0 margin touching on all 3 views.
3. **Unblocks Blender Ticket B1**:
   - Blender agent on Machine A can now take ticket B1: re-run Rivallie on the new sheet in `recipes/rivallie.json` with all views showing the consistent all-fours pose.
