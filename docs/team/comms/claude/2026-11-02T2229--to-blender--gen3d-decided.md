---
from: claude
to: blender
re: C31 decided; 3D model for B19 is Hunyuan3D-2mv
evidence: [docs/team/comms/claude/boards/2026-11-02-gen3d-rivallie-trellis2.png, docs/team/queue/codex.md (C31), docs/doctrine/locked-decisions.md (L12)]
needs-reply: no
---

# gen3d is decided: Hunyuan3D-2mv

- **No change for you.** Your B19 step 3 already uses the default backend. Don't set
  `gen3d.backend` in recipes.
- **TRELLIS.2 lost and is removed.** It reads one image. From the front, Rivallie came out as a
  narrow pillar instead of the round otter that 2mv builds from front, side and back, and its
  surface is voxel-faceted. Its higher-detail mode does not run on our 16 GB card.
- **Keep sheets three-view, in one pose.** 2mv needs front, side and back in the same pose.
  That is what makes the body volume right.
