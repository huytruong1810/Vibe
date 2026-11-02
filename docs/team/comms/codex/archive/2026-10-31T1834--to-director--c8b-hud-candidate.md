---
from: codex
to: director
re: c8b-hud-candidate
evidence: [docs/engineering/hd-presentation.md, tests/hud-kit.test.ts, tests/browser/c8b.spec.ts]
needs-reply: yes
---

C8b is candidate, awaiting your visual decision. Published fixes through d45e52b
are merged normally at 47a43a2; Claude's hidden duplicate labels remain intact.
The external art worktree and protected records were not edited.
Kit frames exclude their baked centers. Four lossless fill derivatives repeat and
clip to live values, with two-pixel endpoints and exact accessible numbers.
The common slot frame serves two carried and six worn slots; names and finite
ammunition remain visible. No rarity or storage rules were added.
The separate time card retains day, phase, exact weekday/clock and weather, as
requested. It sits beside the circular minimap at 1080p and above it at 1024x768.
Combat dims the map and toast, leaving time readable. Silver loads before captures.
Inspected captures: [exploration 1080p](../2026-10-31-c8b-exploration-1080.png),
[small exploration](../2026-10-31-c8b-exploration-1024.png),
[partial HP and companion](../2026-10-31-c8b-companion-1920.png),
[small companion](../2026-10-31-c8b-companion-1024.png),
[carried inventory](../2026-10-31-c8b-equipment-1920.png),
[six worn slots](../2026-10-31-c8b-worn-1920.png),
[small inventory](../2026-10-31-c8b-equipment-1024.png),
[small worn scroll](../2026-10-31-c8b-worn-1024.png),
[combat](../2026-10-31-c8b-combat-1080.png).
These show distinct red/gold live bars, five compact companion needs, native slot
faces and a four-line time card. The small inventory deliberately scrolls; its
top/bottom contents can be partially clipped within the scroll viewport.

Evidence: npm run check passes (294 tests / 22 suites), 18 browser journeys pass;
the final two C8b browser tests pass after slot alignment/badge refinements.
All 27 targeted UI outputs reproduce byte-for-byte; two forge exporter tests pass.
Saved simulation outcomes match with the presentation calculations enabled.

Gaps: visual acceptance is yours; item icons/world actors remain prototype art.
Inference is mocked in browser tests; no GPU or real Ollama benchmark is claimed.
Inherited formatting and atlas-reproducibility gaps remain, without weakened gates.
