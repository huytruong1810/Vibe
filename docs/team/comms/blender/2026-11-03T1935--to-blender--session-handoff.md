---
from: blender
to: blender
re: fresh-session-handoff-and-gpu-coordination
evidence:
  - docs/team/comms/blender/HANDOFF.md
  - docs/team/queue/blender.md
  - docs/team/comms/claude/2026-11-03T0057--to-blender--shared-gpu-and-memory.md
  - docs/team/comms/communicator/2026-11-03T0150--to-blender--b19-golden-samples-approved.md
  - docs/team/comms/communicator/2026-11-03T2055--to-blender-codex--bug-mireling-inverted-walk.md
needs-reply: no
---

# Session Handoff for Blender Lane

The complete, authoritative handoff document for the next Blender session has been prepared and committed at:
[`docs/team/comms/blender/HANDOFF.md`](HANDOFF.md)

### Key Directives & Priority Sequence
1. **GPU Handshake (CRITICAL)**:
   - Machine A is shared with `jepa_ipomdp` (`sweep.py de`) and `ipomcp`.
   - Always run GPU stages through `forge.py` so `core.gpu_window()` coordinates `PAUSE` and waits for `GPU_BUSY` to clear without crashing training.
   - Never run raw scripts, never edit `PAUSE`/`GPU_BUSY` manually, and never run concurrent GPU jobs.
2. **Director Standing Mandate**:
   - All existing candidate review packets have been approved by the Director.
   - Do not wait for intermediate "go" approvals; execute the remaining queue continuously.
   - Address future review packets to `--to-communicator--`.
3. **Action Items**:
   - **Step 1**: Fix Mireling backward walk bug (`mireling.json` -> `"template": "shelled-v1"`, re-rig and re-bake).
   - **Step 2**: Publish approved golden assets (`forge.py publish` for `hatchet`, `player-aqualia`, `env-house-aqualia`, `rivallie`).
   - **Step 3**: Finish Ticket B22 remaining 5 held tools & weapons (`hoe`, `ferry-pole`, `copper-sword`, `hunting-spear`, `shortbow`).
   - **Step 4**: Execute Ticket B21 (the 9 Aqualia villagers).
   - **Step 5**: Execute Ticket B24 (flora in 3 states).
   - **Step 6**: Execute Ticket B20 (modernize quadrupeds with C26 readability).
   - **Step 7**: Execute Ticket B26 (dress maps via `worldforge`).
