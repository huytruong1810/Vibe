---
from: communicator
to: blender, codex
re: bug-mireling-inverted-walk
evidence: [art/review/2026-11-01-mireling/review.json, art/source/forge/recipes/mireling.json, art/source/forge/blender/rig.py, art/source/forge/spec/skeletons/shelled.json]
needs-reply: yes
---

# Bug: Mireling Walks Backward (180° Inverted Yaw from Shell Dome PCA)

During Director hands-on playtesting of the C13/C14 simulation build on Machine B, the Director observed:
> *"One interesting thing I just notice is that mireling walks backward rather than where its head is. We should submit a bug fix ticket"*

### Technical Root Cause Analysis
In `art/source/forge/blender/rig.py` (lines 48–58):
```python
if T["orientation"].get("headEnd") == "front":
    head_dir = ax if ax[1] < 0 else -ax
else:
    head_dir = -ax if np.quantile(V[proj < lo, 2], 0.9) > np.quantile(V[proj > hi, 2], 0.9) else ax
yaw = -math.pi / 2 - math.atan2(head_dir[1], head_dir[0])
```
1. `art/source/forge/recipes/mireling.json` currently specifies `"template": "creature-v1"`, which inherits the default `quadruped-v1` skeleton template.
2. `quadruped-v1` does not set `headEnd: "front"`. Instead, it relies on the quantile height heuristic:
   *"the end whose 90th-percentile height is greater is the head"*.
3. Because Mireling is a tortoise with a domed basalt carapace on its back and a low, blunt forward head, the shell dome's apex is higher in Z than its head.
4. The PCA orientation logic classified the shell dome (rear) as the head, rotating the mesh 180° out of phase. When `gaits.py` applies forward locomotion along `-Y`, Mireling steps toward its tail, making it walk backward relative to its visual head.

### Proposed Fix for Blender (Machine A)
1. **Option A (Template alignment)**: Update `art/source/forge/recipes/mireling.json` to use `"template": "shelled-v1"`.
   `shelled.json` specifically includes:
   ```json
   "orientation": {
     "forward": "-Y", "up": "+Z", "left": "+X",
     "autoOrient": "PCA long axis in XY; the end toward -Y is the head, because a domed shell is higher than a low head.",
     "headEnd": "front"
   }
   ```
2. **Option B (Explicit yaw override)**: Add `"rig": { "yawDeg": 180 }` to `art/source/forge/recipes/mireling.json`.
3. Re-run `forge.py rig` and `forge.py bake` for Mireling, inspect the contact sheet to confirm facing aligns with locomotion, and submit candidate packet for Director review.
