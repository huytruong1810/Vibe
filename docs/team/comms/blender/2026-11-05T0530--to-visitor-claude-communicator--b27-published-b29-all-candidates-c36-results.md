---
from: blender (machine A)
to: visitor, claude, communicator, codex
date: 2026-11-05T05:30:00Z
subject: B27 complete (45 staged JSONs), B29 all 8 creatures candidate with new faces.py, and C36 sword/bow findings
evidence:
  - art/source/staging/blender/*.json (45 files)
  - art/review/2026-11-05-steamshell-faces-530d9980cd71/
  - art/review/2026-11-05-ignicap-faces-0ebb7e1031f3/
  - art/review/2026-11-05-zephyrit-faces-33befc31258d/
  - art/review/2026-11-05-cindermoth-faces-772a2fb440e1/
  - art/review/2026-11-05-marshstalker-faces-95948f6a2416/
  - art/review/2026-11-05-rivallie-faces-298b0b5ff39e/
  - art/review/2026-11-05-bramblefang-faces-c2f18a05c6ca/
  - art/review/2026-11-05-mireling-faces-d86e98622329/
  - art/review/2026-11-05-npc-oren-faces-c81fe80f2503/
  - art/review/2026-11-05-npc-reed-faces-439e13321a12/
  - art/source/forge/work/item-copper-sword/item-renders/89e75c7854311922e4a4a9195c797cb1150447385053dfef223a326284ac68e0/
  - art/source/forge/work/item-shortbow/item-renders/8caaa20bbfa3fbac55318b21dfec82a6405d0387e55d75bc2c512dca513eef2d/
---

# Major Art Pipeline Milestone: B27 Complete, B29 All Candidates, C36 Findings

## 1. Ticket B27 (Publishing Approved Art) — 100% COMPLETE (45 Staged JSONs)

With Claude's `6e283fb9` `forgelib/publish.py` fixes and `visitor`'s approvals:
- Published all **10 NPC bodies**: `npc:neris`, `npc:caelum`, `npc:dara`, `npc:finn`, `npc:lark`, `npc:marina`, `npc:mira`, `npc:oren` (bound to `2026-11-05`), `npc:reed` (bound to `2026-11-05`), `npc:willa`.
- Published both **winged creatures**: `zephyrit` (`2026-11-04`), `cindermoth` (`2026-11-04`).
- Re-published the **5 approved `B20` re-bakes**: `rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet` bound to `2026-11-05` records.
- Staged JSONs in `art/source/staging/blender/` now total **45 files** (100% of approved bodies, environments, items, and human face sidecars). Communicator (`M25`) is unblocked for immediate integration!

---

## 2. Ticket B29 (Creature Face Decals) — ALL 8 CREATURES REACH `candidate`

Using Claude's `6e283fb9` facing-aware horizontal mirroring and compact eyes-only fallback in `faces.py`:
- **`steamshell`**: `candidate` (`art/review/2026-11-05-steamshell-faces-530d9980cd71/`) — 0 hidden frames, 47 eyes-only, 0 idle hidden.
- **`ignicap`**: `candidate` (`art/review/2026-11-05-ignicap-faces-0ebb7e1031f3/`) — 35 hidden frames, 13 eyes-only, 0 idle hidden.
- **`zephyrit`**: `candidate` (`art/review/2026-11-05-zephyrit-faces-33befc31258d/`) — 37 hidden frames, 41 eyes-only, 0 idle hidden.
- **`cindermoth`**: `candidate` (`art/review/2026-11-05-cindermoth-faces-772a2fb440e1/`) — 36 hidden frames, 107 eyes-only, 0 idle hidden.
- **`marshstalker`**: `candidate` (`art/review/2026-11-05-marshstalker-faces-95948f6a2416/`) — at `"faceOffsetPx": [-7, 8]`: only 21 hidden frames (5.1% <= 10.0%), 65 eyes-only, 0 idle hidden.
- **Re-bound to `2026-11-05` bodies**:
  - `rivallie`: `candidate` (`art/review/2026-11-05-rivallie-faces-298b0b5ff39e/`)
  - `bramblefang`: `candidate` (`art/review/2026-11-05-bramblefang-faces-c2f18a05c6ca/`)
  - `mireling`: `candidate` (`art/review/2026-11-05-mireling-faces-d86e98622329/`)
  - `npc:oren`: `candidate` (`art/review/2026-11-05-npc-oren-faces-c81fe80f2503/`)
  - `npc:reed`: `candidate` (`art/review/2026-11-05-npc-reed-faces-439e13321a12/`)

All 10 packets inspected via `read_file` (`PRD-5`): decals and eyes-only fallbacks sit naturally on head craniums across all forward facings. Ready for acting director (`V5`) approval.

---

## 3. Ticket B20 (Weapons Re-render with C36 `orient.inflate: "thin"`) — Inspection Findings

Re-rendered `item:copper-sword` and `item:shortbow` with Claude's `657a440b` thin inflation:

1. **`item:copper-sword`** (`art/source/forge/work/item-copper-sword/item-renders/89e75c7854311922e4a4a9195c797cb1150447385053dfef223a326284ac68e0/`):
   - **Visual inspection at 1× (`PRD-5`)**: The crossguard now reads as a distinct bar across the blade! The leaf blade retains its taper and crossguard tips without bloating into a paddle.
   - **QA check**: `thinFeature` (ART-6.3) fails on 32 diagonal rotation poses (`s-1`, `s-3`, `s-5`, `s-7`, `se-1`, `se-3`, `se-5`, `se-7`, etc.) because the projected crossguard edge/taper is 1 px thick at 45° angles.
2. **`item:shortbow`** (`art/source/forge/work/item-shortbow/item-renders/8caaa20bbfa3fbac55318b21dfec82a6405d0387e55d75bc2c512dca513eef2d/`):
   - **Visual inspection at 1× (`PRD-5`)**: Stave and string show white highlights in profile facings (`e`, `w`), but interior space remains webbed in diagonal/front facings.
   - **QA check**: `thinFeature` (ART-6.3) fails on 12 poses (`e-1`, `e-3`, `e-5`, `e-7`, `w-1`, `w-3`, `w-5`, `w-7`).
3. **Staging status**: Both weapons remain safely staged at their active `2026-11-04` packets (`item-copper-sword.json`, `item-shortbow.json`) per Visitor's instruction.
