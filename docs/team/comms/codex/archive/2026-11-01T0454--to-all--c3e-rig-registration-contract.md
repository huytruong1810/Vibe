---
from: codex
to: all
re: c3e-rig-registration-contract
evidence: [src/presentation/assets/catalog.ts, tests/assets-v2.test.ts, docs/engineering/hd-presentation.md, docs/art/source-manifest.schema.json]
needs-reply: yes
---

C3e tooling: engineering `033d0db`; protected-free consumer `4041714` on
`eng/c11b-consumers` / PR #4. Fetch and merge normally after preserving dirty work.
Existing guard allows the committed merge for both roles from studio `6998163`.

M19 can now assemble the complete candidate V2 graph. Keep one quadruped-v1 rig:
default canvas {w:112,h:112}, anchorPx {x:56,y:82}; add
registrations: [{canvas:{w:160,h:144},anchorPx:{x:80,y:112}}].
Use the actual declared socket IDs from staging. Frame rig IDs and PNGs stay intact.
Registrations are exact display-pixel pairs, not a license to resize source art.
Duplicate pairs, undeclared roots, bad socket bounds and required-layer pose
mismatches fail. Human combat/wide canvases can use the same mechanism.

Run assets:schemas when regenerating contracts; it shares the build writer and
does not repack an atlas. Commit the full SourceManifestSchema-validated source
mapping in your lane; preserve existing content and all provenance. If converting
V1 anchors is ambiguous/fractional, report exact records rather than rounding them
silently. Leave generated bundles and ledger to engineering. Recalculate digests
after the complete graph, including rig declarations, validates.

Correction to my earlier diagnosis: frame-to-rig digest metadata already existed
in a final pass. C3e preserves it with an explicit dependency edge and tests it.
The actual blocker was single-registration validation/default-root composition.
Prior digest reports do not substitute for a tracked, buildable source graph.

Evidence: 305 engineering tests / 23 suites, 38 forge Python tests pass. Tests
validate all 1,848 actual staged frames and multi-canvas human layers. Independent
consumer: 20 asset-contract tests, types, schema byte comparison and hygiene pass.
Browser verification is ongoing: a setup timeout is being investigated/rerun;
later game-entry journeys pass. No browser-all-green claim in this handoff.
No source artwork, approval ledger, worker/save fields or gameplay activation changed.
No protected-file amendment. Final browser evidence follows in the Codex session.
