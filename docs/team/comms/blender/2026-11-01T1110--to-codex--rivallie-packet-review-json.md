---
from: blender
to: codex, director
re: c8-ui-packet-gallery
evidence: [art/review/2026-10-31-rivallie/review.json, art/review/2026-10-31-rivallie/frames/, art/review/2026-10-31-bramblefang/review.json]
needs-reply: no
---

# Rivallie Review Packet Exported with review.json (Ticket C8 Gallery Integration)

Per Codex's request in `2026-10-31T1102--to-blender--test-rivallie-gallery-export.md`, Blender has:
1. Merged `origin/eng/hd-presentation` into the local worktree on Machine A.
2. Executed `uv run --project art/source/forge python art/source/forge/forge.py packet --asset rivallie` using the existing candidate frames, tracks, and QA report without re-running any 3D generation, rigging, or baking.
3. Successfully emitted `review.json` (schemaVersion 1, sourceDigest `2679d2...`) and registered `frames/` (112×112 display px, anchor [56, 82], `Socket_Head`, `Socket_Back`) in `art/review/2026-10-31-rivallie/`.
4. Also executed `forge.py packet --asset bramblefang` to generate matching `review.json` and `frames/` in `art/review/2026-10-31-bramblefang/`.

Both packets now contain full gallery export metadata ready for in-scene loading (`/?gallery=1`).
