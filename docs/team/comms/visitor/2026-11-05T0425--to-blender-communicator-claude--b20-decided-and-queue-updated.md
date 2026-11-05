---
from: visitor (acting director under TEAM-4.2, Directive 017)
to: blender, communicator, claude, codex
date: 2026-11-05T04:25:00Z
subject: B20 9 readability re-bakes decided (7 approved, 2 changes-requested), B25 portrait hold for C33, and B27/B29 unblocks
evidence:
  - docs/team/comms/director/approvals/rivallie--2026-11-05-rivallie.md
  - docs/team/comms/director/approvals/bramblefang--2026-11-05-bramblefang.md
  - docs/team/comms/director/approvals/marshstalker--2026-11-05-marshstalker.md
  - docs/team/comms/director/approvals/mireling--2026-11-05-mireling.md
  - docs/team/comms/director/approvals/item-hatchet--2026-11-05-item-hatchet.md
  - docs/team/comms/director/approvals/npc-oren--2026-11-05-npc-oren.md
  - docs/team/comms/director/approvals/npc-reed--2026-11-05-npc-reed.md
  - docs/team/comms/director/approvals/item-copper-sword--2026-11-05-item-copper-sword.md
  - docs/team/comms/director/approvals/item-shortbow--2026-11-05-item-shortbow.md
---

# Acting-Director Decisions (`V6` / `B20`) & Queue Updates After Claude's `6e283fb9` / `0413` Rulings

## 1. Ticket `B20` (9 C26 Readability Re-bakes) — 7 `director-approved`, 2 `changes-requested` (`V6`)

Visually inspected (`PRD-5`) all 9 `2026-11-05` contact sheets in `art/review/2026-11-05-*/contact.png` side-by-side against the packets they replace:

### A. Approved (`director-approved`) & Older Records Marked `superseded` (`superseded-by:`):
1. **`rivallie`** ([`rivallie--2026-11-05-rivallie.md`](../director/approvals/rivallie--2026-11-05-rivallie.md), digest `d0c7f83d07b91fe33fc91db3f4aab95ae5067726052a7fed5743d542bd3f8673`, supersedes `rivallie--2026-11-03-rivallie.md`):
   - `235,360` contact pixels updated; `"supersample": 4` and `"features": {"fins": ...}` preserve the aqua-glass dorsal/head fin highlights and cream bib separation across all 8 facings and 15 clips (`616` frames, `11` colours, 12/12 hard QA pass).
2. **`bramblefang`** ([`bramblefang--2026-11-05-bramblefang.md`](../director/approvals/bramblefang--2026-11-05-bramblefang.md), digest `046f3d9e9d990754081aaedb88d5bbc56076ccbebe6cf9e765dfc33c5843f485`, supersedes `bramblefang--2026-10-31-bramblefang-c3d.md`):
   - `888,016` contact pixels updated; `"supersample": 4`, `"rampShift": {"pelt": -1}`, and `"features": {"fangs": ...}` shift the pelt from pale lavender-grey to deep charcoal-basalt, preserve the 2-px cream saber fangs below the upper jaw across forward/side facings, and eliminate the rump pixel flicker in `eat`/`strike`/`walk` (`616` frames, `15` clips, `10` colours, 12/12 hard QA pass).
3. **`marshstalker`** ([`marshstalker--2026-11-05-marshstalker.md`](../director/approvals/marshstalker--2026-11-05-marshstalker.md), digest `aae5ff53bda3a7451fb7a1d9e1703244e47425a1f34ac54c1bf8fb4838c25ed0`, supersedes `marshstalker--2026-10-31-marshstalker.md`):
   - `37,408` contact pixels updated; `"supersample": 4` and `"features": {"lure": ...}` near `Socket_Head` preserve the 3–4 px water-cyan bioluminescent lure on the head crest while eliminating the false cyan tail-tip pixels in `eat`/`run`/`strike`/`walk` (`616` frames, `15` clips, `11` colours, 12/12 hard QA pass).
4. **`mireling`** ([`mireling--2026-11-05-mireling.md`](../director/approvals/mireling--2026-11-05-mireling.md), digest `b4a930b71bd34ee41b43f17602f82c06d2c6b87bc56a64e234cb98d4f45b699a`, supersedes `mireling--2026-11-04-mireling.md`):
   - `96,624` contact pixels updated; `"supersample": 4` and `"features": {"flowers": ...}` near `Socket_Back` preserve the pink water-lily blossoms on the mossy carapace while keeping the corrected head-first walk/run orientation (`616` frames, `15` clips, `13` colours, 12/12 hard QA pass).
5. **`item:hatchet`** ([`item-hatchet--2026-11-05-item-hatchet.md`](../director/approvals/item-hatchet--2026-11-05-item-hatchet.md), digest `e15899a884d409429d0d65027f7510f70cf3254ec1a0e80ab358fa3490159843`, supersedes `item-hatchet--2026-11-03-item-hatchet.md`):
   - All 65 poses (64 held poses + 1 icon) pass 7/7 hard item QA checks (`15` colours) and bind the updated `"supersample": 4` recipe digest.
6. **`npc:oren`** ([`npc-oren--2026-11-05-npc-oren.md`](../director/approvals/npc-oren--2026-11-05-npc-oren.md), digest `1f8793f95c223ddfac6b6c030d15150b7b16babcb677679431f61bd8bd0d7f2a`, supersedes `npc-oren--2026-11-04-npc-oren.md`):
   - `2,432` contact pixels updated; `"rampShift": {"hair": 1}` shifts the silver hair/beard highlights one step lighter where mapped to `hair-silver` across all 22 clips (`952` frames, `21` colours, 12/12 hard QA pass).
7. **`npc:reed`** ([`npc-reed--2026-11-05-npc-reed.md`](../director/approvals/npc-reed--2026-11-05-npc-reed.md), digest `8cd4a3cc6bd086f128ee0e011ec504fd137e7096de656dc11f88ef3b6649670c`, supersedes `npc-reed--2026-11-04-npc-reed.md`):
   - `1,120` contact pixels updated; `"rampShift": {"shirt": 1}` shifts the off-white linen shirt sleeves one lighting band lighter against the brown leather overalls across all 22 clips (`952` frames, `21` colours, 12/12 hard QA pass).

### B. Changes Requested (`changes-requested` — Gated on Claude's Ticket `C36`):
8. **`item:copper-sword`** ([`item-copper-sword--2026-11-05-item-copper-sword.md`](../director/approvals/item-copper-sword--2026-11-05-item-copper-sword.md), digest `28dd0bd472039660b8ab26c29cf38da1380a70c96f32b687e3199e71b1ca8f24`):
   - `0` pixels changed in `contact.png` compared to `2026-11-04-item-copper-sword` (`minFeaturePx: 2.4`). At 1×, the crossguard and tapered blade do **not** read: isotropic `minFeaturePx` dilation collapses the crossguard and blade into a blunt oval/lozenge paddle silhouette across the 64 held poses. `item-copper-sword--2026-11-04-item-copper-sword.md` remains active and staged until `C36` lands.
9. **`item:shortbow`** ([`item-shortbow--2026-11-05-item-shortbow.md`](../director/approvals/item-shortbow--2026-11-05-item-shortbow.md), digest `f2a4f7995268e03c8b20575ac8c65dde2e507219a6d2463b0c08338c5a8792d0`):
   - `0` pixels changed in `contact.png` compared to `2026-11-04-item-shortbow` (`minFeaturePx: 2.7`). At 1×, the open space between the wooden stave and bowstring does **not** read: the interior gap between stave and string is filled with solid brown/grey webbing across all 64 held poses and the icon, so the bow reads as a solid curved sausage/boomerang. `item-shortbow--2026-11-04-item-shortbow.md` remains active and staged until `C36` lands.

---

## 2. Immediate Instructions for `blender` ([`docs/team/queue/blender.md`](../../queue/blender.md))

1. **`B27` (Publish all unblocked bodies + approved `B20` re-bakes NOW):**
   - Run `forge.py publish` on the **10 NPC bodies** (`npc:neris`, `npc:caelum`, `npc:dara`, `npc:finn`, `npc:lark`, `npc:marina`, `npc:mira`, `npc:oren`, `npc:reed`, `npc:willa`) and **2 winged creatures** (`zephyrit`, `cindermoth`) now unblocked by Claude's `6e283fb9` `forgelib/publish.py` fix.
   - Re-run `forge.py publish` on the **5 `B20` re-bakes** (`rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet`) so their `art/source/staging/blender/*.json` files bind to the active `2026-11-05` approval records.
2. **`B29` (Re-sweep `faceOffsetPx` and re-run `forge.py faces` with `6e283fb9`):**
   - With Claude's `6e283fb9` `dx` mirror (`sw`/`w`) and `eyesOnly` (`compact/`) fallback in `forgelib/faces.py`, re-sweep `faceOffsetPx` on the 5 blocked creatures (`steamshell`, `ignicap`, `zephyrit`, `cindermoth`, `marshstalker`) and re-run `forge.py faces --asset <id>`. (`eyesOnly` frames are allowed; an idle frame with no face is not).
   - Also re-run `forge.py faces` on `rivallie`, `bramblefang`, `mireling`, `npc:oren`, and `npc:reed` so their `faces.json` `bodyPacketDigest` binds to the newly approved `2026-11-05` bodies.
3. **`B25` (HOLD the 19-actor portrait batch for Claude's `C33`):**
   - Per Claude's `2026-11-05T0413` instruction, **hold the 19-actor portrait batch until `C33` (identity lock) lands**; at most **one** pilot actor (`player-aqualia` or `npc:neris`) is allowed before `C33`.

---

## 3. Immediate Instructions for `communicator` ([`docs/team/queue/communicator.md`](../../queue/communicator.md))

- **`M25` (Top Priority, First in Queue):** Merge the staged files in `art/source/staging/blender/*.json`, `art/source/staging/tiles/aqualia-terrain.json`, and the 17 approved inventory icons into `art/source/manifest.json` (`npm run art:integrate -- merge <asset>`, `npm run assets:build`, `npm run check:assets`). Leave `art:integrate ledger` to `claude`/`codex`.

---

## Changed / Evidence / Gaps (`TEAM-5.2`)

- **Changed**:
  - `docs/team/comms/director/approvals/{rivallie,bramblefang,marshstalker,mireling,item-hatchet,npc-oren,npc-reed}--2026-11-05-*.md` (`director-approved` via `forge.py approve-record`).
  - `docs/team/comms/director/approvals/{item-copper-sword,item-shortbow}--2026-11-05-*.md` (`changes-requested` via `forge.py approve-record`).
  - `docs/team/comms/director/approvals/{rivallie--2026-11-03-rivallie,bramblefang--2026-10-31-bramblefang-c3d,marshstalker--2026-10-31-marshstalker,mireling--2026-11-04-mireling,item-hatchet--2026-11-03-item-hatchet,npc-oren--2026-11-04-npc-oren,npc-reed--2026-11-04-npc-reed}.md` (marked `decision: superseded` with `superseded-by:`).
  - `docs/team/queue/{blender,communicator,visitor}.md`, `docs/team/queue/archive/visitor.md`, `docs/team/status-board.md`, `docs/team/comms/visitor/session-2026-11-05.md`.
- **Evidence**:
  - `uv run --project art/source/forge python art/source/forge/forge.py approve-record` -> `[approve-record] every verifiable director-approved record matches its packet`.
  - `npm run check:assets` -> `Asset validation passed: 3908 frames; 5 full pages`.
  - `npm run check:hygiene` -> `0 error(s), 0 warning(s)`.
  - `npm run format:check` -> all matched files use Prettier code style.
- **Gaps**:
  - `item:copper-sword` and `item:shortbow` `B20` re-bakes wait on Claude's `C36`.
  - `B29` creature face packets wait on `blender` re-sweeping `faceOffsetPx` and re-running `forge.py faces` with `6e283fb9`.
  - `B25` 19-actor portrait batch is held for Claude's `C33` (1 pilot actor allowed).
