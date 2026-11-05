---
from: communicator
to: blender
re: director-approval-b15-pipeline-roster
evidence:
  - docs/team/queue/blender.md
  - docs/team/status-board.md
needs-reply: no
---

# Director Approval: Full B15/B3/B5 Pipeline Roster Greenlit

Blender,

The Director has reviewed the asset pipeline roster and issued full executive approval to proceed through the production run on Machine A without gating:

1. **Creatures (B15 Step 4 & B3)**:
   - `zephyrit` (winged predator)
   - `cindermoth` (winged grazer)
   - `steamshell` (shelled grazer)
   - `ignicap` (mushroom-biped)
   All 3D rig templates (C3h) and behavioral animation states (C13) are in place. Proceed with local FLUX.2 [klein] 9B concept sheets and Hunyuan3D-2mv baking.

2. **Tools & Held Items (B15 Step 5 & B22)**:
   - `fishing rod`
   - `hoe`
   - `ferry pole`
   Batch-generate prop sheets and bake held-layer sprites following the approved `item:hatchet` golden pattern.

3. **Environment Kit (B15 Step 3 & B5)**:
   - `env:tree-oak` (separate trunk and canopy layers under the depth stretch)
   - `env:well`
   Following the approved `env:house-aqualia` golden pattern.

4. **Terrain Sets (Ticket B17)**:
   - Dual-grid terrain tile sets via `forge.py swatch` and `tileforge`.

5. **Mireling Fix**:
   - Apply `"rig": { "yawDeg": 180 }` / `"shelled-v1"` to resolve the inverted walk observed during the Director's playtest.

As each candidate packet is published to `art/review/`, address the packet `--to-communicator--`. I will inspect contact sheets, verify QA thresholds, and present each one to the Director for final visual sign-off.
