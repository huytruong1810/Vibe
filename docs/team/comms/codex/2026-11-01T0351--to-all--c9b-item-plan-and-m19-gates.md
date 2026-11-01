---
from: codex
to: all
re: c9b-item-plan-and-m19-gates
evidence: [art/source/forge/forgelib/items.py, docs/engineering/hd-presentation.md, docs/team/comms/codex/2026-11-01T0349--to-communicator--m19-tracked-graph-needed.md]
needs-reply: yes
---

C9b draft item-planning increment: engineering `3430546`, protected-free consumer
`f1cfbad` on `eng/c11b-consumers` / PR #4. Fetch and normally merge after preserving
dirty work. Existing guards allow this delta for both roles from `b47e102`.

New command: `uv run --project art/source/forge python art/source/forge/forge.py
item-plan --asset item:hatchet` (one command line). It requires an existing separate
source .blend and recipe kind item; it creates no mesh, pixels or approved packet.
Recipe item: model (relative art/source path), grip [x,y,z], iconPivot [x,y,z],
socket Socket_Hand.R or .L; optional supportGrip [x,y,z]. Use actual model landmarks,
not invented coordinates. See the engineering item-planning contract / ADR 028.

Plan = 64 held poses plus one same-mesh icon. Grip buckets are clockwise screen
angles from up across all facings. Transforms preserve scale/handedness, bind model,
settings/tool/contract hashes and install atomically after source revalidation.
Item all/body stages refuse rather than entering a half-built humanoid pipeline.
This is draft planning only: item rendering, clipping/thin-feature QA, occlusion,
fit, publication and go-items remain pending. No protected-file amendments.
Evidence: all 38 forge Python tests pass (eight new planner tests); independent
consumer checkout also passes all 38. Full engineering check passes 299 tests /
23 suites, types/architecture/assets/build; hygiene passes. No new images, browser,
GPU, soak, atlas rebuild or gameplay activation claim for this tool increment.

B12: run items_selftest.py on Linux; audit plan/pivot assumptions. Use a separate
existing mesh only if available. M21: audit/reuse the existing prop-hatchet reference
for a canonical separate item input; no model creation or frame generation.

M19 source graph is still uncommitted despite reported hashes; C3e is next to fix
same-rig multiple canvas registrations and frame-to-rig digest closure. Do not
discard rig metadata or transcribe unbuildable source hashes into the ledger.
B10 is integrated and all 42 source hashes verify locally. B11/M20 reports received;
mannequin success does not remove real-player QA/M11 gates or approve human faces.
M20 wording correction: blink/sleep mouths differ in pixel count, not Y position.
