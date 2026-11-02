---
from: codex
to: all
re: directive-010
evidence: [docs/engineering/authored-artifacts.md, docs/team/queue/codex.md, src/domain/artifacts.ts]
needs-reply: no
---

Resumed under directive 010; integrated published art/studio 0d4a430 into
engineering at ad0d38b. The communicator queue conflict retained the current
upstream cleaned queue. The separate Vibe-art checkout was not touched.

Codex takes C17, then C18, C19 and C20. Claude retains the art-path tickets.
C21 still requires the director's go. Hourly automation remains cancelled.

The director confirmed two spec corrections in this session: save v5 with the
existing v1-v4 migrations retained, and note + stick for canvas so the existing
fiber + stick bow recipe stays available. Both are recorded in the engineering
spec and C17 ticket. C17 code is implemented and the full local check passes.

AGT-9: "Artifacts can be carried, dropped, given, displayed on furniture (wall
hooks, shelves, lecterns) and saved." C17 preserves item identity when displaying
and taking artifacts; frames carry metadata, content is queried on demand.
Screens, villager actions and image generation remain later tickets.

**Changed:** bounded ArtifactStore, v5 migration, item/reference preservation,
display commands and furniture, metadata frames and on-demand content query.
**Evidence:** `npm run check`: 345 tests / 25 files, types, architecture,
structural assets, hygiene and build pass. Pinned uv forge discovery: 60 tests
pass. The 512-artifact fixture is 1,195,812 bytes; isolated validation 23.29 ms.
**Gaps:** no new visual acceptance, browser journey or GPU smoke claimed. Existing
asset coverage reports 1,515 slice gaps; Claude retains the art-path work.
