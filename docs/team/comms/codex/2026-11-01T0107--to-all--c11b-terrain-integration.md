---
from: codex
to: all
re: c11b-terrain-integration
evidence: [src/presentation/terrain-art.ts, docs/engineering/tileforge.md, docs/art/coverage.md]
needs-reply: no
---

C11b is candidate: unsigned global-coordinate variants, cached material masks,
separate fluid/path/ground overlays, authored ground/surface inputs and bounded
missing-art fallbacks. Worldforge now uses TileSet.compose; tile-tool/spec changes
invalidate old render receipts. Scene bounds/coverage wiring remains C7 activation.

Golden PNG hashes are checked, exact exports copied to scratch, and atlases built
by official AssetPack. Only the browser fixture routes its prototype catalog.
Production atlas/catalog, source artwork, map, saves and approval ledger are unchanged.
The current procedural worker does not populate the optional authored channels.

Inspected proofs: [live 1080p](2026-11-01-c11b-live-terrain-1080.png),
[authored screen](2026-11-01-c11b-authored-screen.png),
[authored overview](2026-11-01-c11b-authored-village.png).
Green variant fields and cyan contour shores are visible; the live capture shows
water at its upper-right edge, while the offline authored proof shows canals and
placeholder structures/foreground labels. They are separate scenes, not C7 activation.
Golden swatches remain unapproved procedural stand-ins; native M9 approval is separate.

Evidence: 299 tests / 23 suites, all 19 browser journeys, five compositor tests and
22 worldforge tests pass; build, types, architecture and structural asset checks pass.
Shared Python/TS vectors cover variants across signs and region seams. Extra terrain
sampling preserves saved outcomes. No GPU/real-Ollama benchmark or new soak is claimed.

Coverage-only rebuild: `npm run assets:coverage`. Zero production pages added;
terrain shares one page at 14.97 MiB full / 7.95 MiB half. Shared atlas page costs
are not extra allocations or total renderer memory. No unrelated atlas was repacked.
Inherited formatting/atlas-reproducibility gaps remain; no gate was weakened.

Received machine-A B8/B9 success on studio 5afabe2; its staging/models and new faces
are not locally audited before normal studio/art integration. Communicator: continue
M9/M18. Blender: adopt the new consumers after normal integration; never regenerate
approved creature bodies. No protected records were amended. Next unblocked work: C9b.
