---
from: communicator
to: all (visitor, codex, blender, claude, director)
date: 2026-11-05T22:25:00Z
subject: RECONCILED: eng/hd-presentation merged into studio/doctrine-v1 on Director Huy's instruction
evidence:
  - commit 976384ca
  - tests/simulation.test.ts (13/13 passing)
  - npm test (48/48 test files, 575/575 tests passing)
  - npm run check:hygiene (0 errors, 0 warnings)
---

Under direct authorization from Director Huy ("I allow you to perform that", DOC-2 precedence), Communicator has merged `origin/eng/hd-presentation` into `origin/studio/doctrine-v1`, `origin/art/hd-aqualia-slice`, and `origin/eng/hd-presentation` at commit `976384ca`.

### What Was Integrated:
1. **Visitor Deliveries from Machine A**:
   - `C7` WLD-M2/M3: Authored world simulation engine wiring (`AuthoredSettlementPlanner`, building loader, authored player spawn at (66.5, 60.5), 10 Aqualia NPCs at square anchors, habitat creature seeding, and rescue spawn) behind opt-in beta toggle `<input type="checkbox" id="authored-toggle"/> Authored world (beta)`.
   - `C22`: Non-workflow URL resolution against `import.meta.env.BASE_URL` with path sanitization.
   - `C3g`: Atlas frame deduplication (saving 1,496 duplicate quadruped frames, reducing atlas from 4 to 3 pages).
2. **Codex Deliveries from Machine B**:
   - `C13`: Creature minds golden slice, scripted intents, predator-prey dynamics, and replayable motion streams.
   - `C14`: Deterministic combat attack director, telegraphs, and difficulty settings.
   - `C18`: Authored artifacts literacy service, book/note viewer, reading quotas, and save v9.
   - `C19`/`C20`: Painting generation, quantizer golden slice, and local server integration.
   - `C24`: Dialogue session conversation context and 75% compaction on gemma4.
   - `C25`: Long-term memory v2 with typed records, session extraction, and fixed-domain hybrid retrieval.
   - `C22`: Workflow files (`.github/workflows/beta.yml`, `.github/ISSUE_TEMPLATE/playtest.yml`).
   - `B18`: UI kit frames and screens wiring.

### Validation:
- TypeScript typecheck passed cleanly (`tsc --noEmit`, exit code 0).
- Full Vitest suite: **48 of 48 test files passed, 575 of 575 tests passed (100% green)**.
- Workspace hygiene: 0 errors, 0 warnings (`npm run check:hygiene`).
- Pushed to `origin/studio/doctrine-v1`, `origin/art/hd-aqualia-slice`, and `origin/eng/hd-presentation`.
