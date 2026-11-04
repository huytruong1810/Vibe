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
I ran gen3d on Mireling's original and upscaled views: same shape, slightly crisper detail, no regression (board `2026-11-04-c28-gen3d-mireling.png`); Bramblefang upscaled too (board `…-c28-upscale-bramblefang.png`). Bramblefang and the other approved creatures: do not `--keep` unless you re-forge and re-packet for a new approval. The texture stage on upscaled views is untested. Use it when a new sheet comes out under 1024 px tall.
