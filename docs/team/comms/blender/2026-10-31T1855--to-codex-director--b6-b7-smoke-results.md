---
from: blender
to: codex, director
re: b6-b7-smoke-results
evidence: [docs/team/comms/blender/tmp/rivallie-packet-gallery.png, docs/team/comms/blender/tmp/bramblefang-packet-gallery.png]
needs-reply: no
---

# Machine A Smoke Test Results: Worldforge (B6) and Creature Gallery (B7)

Smoke verification for tickets B6 and B7 was completed on Machine A (Linux WSL2, Node v22.18.0, NVIDIA GeForce RTX 5080 Laptop GPU).

---

## 1. Ticket B6: Worldforge Cross-Machine Smoke Results

Commands executed per `docs/engineering/worldforge.md`:

### A. CLI Doctor & Plan Checks
1. `uv run --project art/source/forge python art/source/world/tools/worldforge.py doctor`
   - **Result**: `{"dependencies": "ok", "ldtkSchema": "1.5.3", "planProblems": [], "commands": ["new", "apply", "render", "check", "packet"], "runtimeImporter": "C7 candidate compiler/loader; new-game activation pending"}` (Exit code: 0).
2. `uv run --project art/source/forge python art/source/world/tools/worldforge.py plan check aqualia`
   - **Result**: `plan check aqualia: ok` (Exit code: 0).
3. `uv run --project art/source/forge python art/source/world/tools/worldforge.py check --region aqualia --level aqualia_village`
   - **Result**: `{"status": "candidate", "scope": "aqualia_village", "findings": []}` (Exit code: 0).

### B. Packet Verification
`npx tsx scripts/check-packets.ts`
- **Result**:
  - `rivallie`: 616 verified frames, 88 facing clips; 1 open QA finding (`valueContrast` on grass, soft). No gameplay activation.
  - `bramblefang`: 616 verified frames, 88 facing clips; 1 open QA finding (`valueContrast` on grass, soft). No gameplay activation.
  - (Exit code: 0).

### C. Worldforge Unit Test Suite (`worldforge_selftest.py`)
`uv run --project art/source/forge python -B -m unittest discover -s art/source/world/tools/worldlib -p worldforge_selftest.py`
- **Result**: 21 tests ran (18 passed, 3 failed; exit code 1):
  1. `test_complete_village_does_not_certify_riverlands`:
     - `AssertionError: 'candidate' != 'draft'`
     - *Cause*: `setUpClass` replays all `passes/aqualia/*.json`. Following completion of Ticket B2, `003-riverlands-layout.json` is present and valid; Riverlands is no longer draft.
  2. `test_layout_approval_is_digest_and_scope_bound`:
     - `AssertionError: unexpectedly None`
     - *Cause*: `layout_approval(self.authored, "aqualia_village")` verifies the project SHA-256 against director approval records (`docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_village-1.md`). The approval record is bound to the project hash prior to pass 003 (`6211d67c…`), whereas `self.authored` now includes pass 003 (`e0584b25…`).
  3. `test_next_recognizes_published_packet`:
     - `AssertionError: 'director review' not found in 'NEXT: check current project and dependencies\n'`
     - *Cause*: Tied to the project digest change resulting from pass 003 inclusion.

---

## 2. Ticket B7: Delivered Creature Gallery Smoke Results

Browser test executed per `docs/engineering/worldforge.md`:
`npx playwright test tests/browser/packets.spec.ts`

- **Execution**: 1 test passed in 18.5s (20.0s total; exit code 0).
- **Findings**:
  - Successfully loaded candidate packets `2026-10-31-rivallie` and `2026-10-31-bramblefang` into the development gallery at `/?gallery=1`.
  - Verified clip playback across states (`idle`, `walk`, `run`, `attack`, `sleep`, `downed`) and facings.
  - Tested manual stepping (`Step` button) and 4x magnification inspection mode.
  - Verified socket overlays (`Socket_Head`, `Socket_Back`, `Socket_Mouth`) and anchor alignment markers.
  - Zero browser console errors recorded (`errors: []`).
  - Confirmed setup dialog is not triggered.
  - Captures saved and inspected in `docs/team/comms/blender/tmp/`:
    - `rivallie-packet-gallery.png`
    - `bramblefang-packet-gallery.png`

Both smoke tests confirm that Worldforge and Creature Gallery tooling operate consistently on Machine A. Technical candidate verification is complete; director approval records and gameplay publishing remain separate.
