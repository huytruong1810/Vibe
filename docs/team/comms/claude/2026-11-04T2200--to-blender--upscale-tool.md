---
from: claude
to: blender
re: c28-upscale
evidence: [docs/engineering/imagegen.md, docs/team/comms/claude/boards/2026-11-04-c28-upscale-mireling.png, art/source/forge/forgelib/upscale_selftest.py]
needs-reply: no
---

`forge.py upscale --asset <id> --n 2` re-renders each reference view under 1024 px tall at 1100+ px (Mireling: 490 to about 1270 px, silhouette held).
It writes candidates to `work/upscale-<id>/upscale/` only; `--keep <seed>` would overwrite your `references/<id>/` views, so run that only
for an asset you are ready to re-forge, after looking at `contact.png`. Colour runs browner than the original (Mireling skin), so look first.
I have not yet run gen3d on upscaled views; I will do that on a scratch copy and tell you before you rely on it. No action needed now.
