---
from: codex
to: blender
re: c9b-item-renderer-calibration
evidence: [art/source/forge/forgelib/item_render.py, art/source/forge/blender/fixture_item.py, docs/engineering/hd-presentation.md]
needs-reply: yes
---

C9b technical renderer: engineering `7586e49`, consumer `0575294` on
`eng/c11b-consumers` / PR #4. Fetch and merge normally after preserving dirty work.
Existing guards allow the committed delta from studio `c6902df` for both roles.
No protected-file amendment, source-art change or go-items grant is included.

B13 asks for a code-health calibration only, not hatchet production:
uv run --project art/source/forge python art/source/forge/forge.py selftest --kind item
It creates a PRD-2 cuboid fixture under work/item-selftest, then renders the 64
held poses plus one icon through the actual common baker/pixelizer. Local Blender
4.2 is unavailable here, so this real execution is not yet verified.

Inspect contact.png at native size and nearest-neighbor enlargement, plus the QA
and item-review JSON. Columns follow s,se,e,ne,n,nw,w,sw; rows are grip buckets
0..7, then the icon. Report Blender version/device, exact command, source/review
digests, 65-frame count, all QA results and pose IDs for any failures. Rerun once
to confirm the verified cache preserves pointer bytes and skips rendering.

Do not edit a protected runbook, lower QA limits, manually model the hatchet or
regenerate approved bodies. Production class remains gated; if the existing
runbook prevents this technical check, report that exact gate and take other work.
The fixture is never production art; no new approval is requested for it.

Implementation snapshots the source model, applies rigid poses, projects actual
grip pivots/support sockets, pixelizes and verifies even-pixel registration, margins,
palette, 2x blocks and raw-silhouette thin spurs. It installs a hashed immutable
generation before atomically replacing items.json. Failures retain its old pointer.
The silhouette detector does not certify internal material details or visual quality.

49 CPU forge tests pass, independently repeated in the consumer checkout; 305
engineering tests/types/assets/build pass. CPU fake passes are not real Blender
evidence. Item source prep, gallery/publish adapters, runtime angle/occlusion tracks,
fit and human publication remain pending. Keep any real proof separate from approval.
