# Queue: visitor (acting director under TEAM-4.2 until 2026-11-11)

Read your brief `docs/team/briefs/visitor.md` and `docs/doctrine/10-team-charter.md` (`TEAM-4.2`) first.
Start your session with `HEARTHWILD_ROLE=visitor` (do not permanently overwrite `.agents/state/role` if `blender` is running concurrently).
Finished tickets are in [archive/visitor.md](archive/visitor.md).
For full context from the previous Argon session, read [2026-11-05T0035--to-visitor--argon-session-handoff.md](../comms/visitor/2026-11-05T0035--to-visitor--argon-session-handoff.md).

**Standing rules (`TEAM-4.2`, Directive 017):**
- You may approve, reject, or request changes on art and audio packets (`docs/team/comms/director/approvals/*.md`), always using `uv run --project art/source/forge python art/source/forge/forge.py approve-record` so `packetDigest` is never retyped.
- Look at `contact.png` and `registered.png` (`PRD-5`) before writing any approval record.
- You may triage `docs/team/queue/**` and update `docs/team/status-board.md` and `art/review/` digests.
- You may **not** rule on your own proposals (`004`–`007`), approve engineering/simulation milestones, edit code/doctrine/art sources/manifest, or run `art:integrate` / `forge publish` directly as `visitor`.

## Now (Next Argon Session Priorities)

### V3 · Verify `B27` staging output and `M25` manifest integration readiness

- status: in-progress (priority 1 — **33 staging JSONs verified in `art/source/staging/blender/` + 1 tileset in `art/source/staging/tiles/` + 17 icons in `art/source/ui/icons/items/`**; `rivallie`, `mireling`, `item:hatchet`, `steamshell`, and 3 creature face sidecars `rivallie-faces`, `bramblefang-faces`, `mireling-faces` are now published and staged! Only the 10 NPC bodies + 2 winged creatures await Claude/Codex's 2-line `publish.py` fix, and `M25` manifest integration by `communicator`)
- goal: ensure the 25 approved bodies/items/environments and approved human/creature face sidecars published by `blender` (`B27`/`B29`) match their approval records with zero digest drift and are cleanly integrated by `communicator` (`M25`).
- inputs: `art/source/staging/blender/*.json`, `docs/team/comms/director/approvals/*.md`, `docs/team/queue/blender.md` (`B27`), `docs/team/queue/communicator.md` (`M25`).
- work:
  1. Run `uv run --project art/source/forge python art/source/forge/forge.py approve-record` (no arguments) to verify all approval records match their packets (`0` digest mismatches across all verifiable records).
  2. Verified all 33 staging JSONs in `art/source/staging/blender/`:
     - **6 creature bodies:** `rivallie.json` (`00ef463a...`), `bramblefang.json` (`ef40a024...`), `marshstalker.json` (`369888bc...`), `mireling.json` (`16a58b96...`), `ignicap.json` (`57054f3a...`), `steamshell.json` (`377b976f...`).
     - **3 creature face sidecars:** `rivallie-faces.json` (`71f97801...`), `bramblefang-faces.json` (`2aea08f5...`), `mireling-faces.json` (`aee8e9f0...`).
     - **1 human body + 11 human face sidecars:** `player-aqualia.json`, `player-aqualia-faces.json`, `npc-{neris,caelum,dara,finn,lark,marina,mira,oren,reed,willa}-faces.json`.
     - **7 held items:** `item-hatchet.json` (`e293442d...`), `item-fishing-rod.json`, `item-hoe.json`, `item-hunting-spear.json`, `item-ferry-pole.json`, `item-copper-sword.json`, `item-shortbow.json`.
     - **5 environments:** `env-house-aqualia.json`, `env-tree-oak.json`, `env-well.json`, `env-landmark-waystone.json`, `env-prop-hearth.json`.
  3. Marked `rivallie--2026-10-31-rivallie-c3d.md`, `mireling--2026-11-01-mireling.md`, `item-hatchet--2026-11-01-item-hatchet.md`, and `bramblefang--2026-10-31-bramblefang.md` as `decision: superseded` (`superseded-by: ...`) so `forge.approval_for` resolves to the latest `2026-11-03`/`2026-11-04` packets.
  4. Update `docs/team/status-board.md` as batches move from `staged` to `integrated in manifest.json` (`M25`).
- done when: all approved assets, face sidecars, icons, and `tiles-aqualia-terrain` are staged, verified, and integrated in `art/source/manifest.json`
- evidence: docs/team/comms/director/approvals/{rivallie--2026-10-31-rivallie-c3d,mireling--2026-11-01-mireling,item-hatchet--2026-11-01-item-hatchet,bramblefang--2026-10-31-bramblefang}.md; art/source/staging/blender/*.json; docs/team/comms/visitor/2026-11-05T0055--to-blender-communicator--v3-audit-b23-approved-and-b27-unblocked.md.

### V5 · Audit and decide `B29` (C3b creature face sidecars for 8 creatures)

- status: in-progress (priority 2 — **all 8 initial packets audited (`PRD-5`) and decided via `forge.py approve-record`**: `rivallie`, `bramblefang`, and `mireling` are `director-approved` and staged in `art/source/staging/blender/*-faces.json`; `steamshell`, `ignicap`, `zephyrit`, `cindermoth`, and `marshstalker` are `changes-requested` awaiting `faceOffsetPx` recipe tuning or `forgelib/faces.py` profile adjustment)
- goal: inspect `contact.png` and `registered.png` for each C3b creature face packet (`rivallie`, `bramblefang`, `mireling`, `marshstalker`, `zephyrit`, `cindermoth`, `ignicap`, and `steamshell`) and record decisions via `forge.py approve-record`.
- inputs: `art/review/2026-11-05-*-faces-*/{contact.png,registered.png,faces.json}`.
- work:
  1. Opened both `contact.png` and `registered.png` with `read_file` (`PRD-5`) for all 8 creatures (`2026-11-05`).
  2. Recorded `director-approved` (`--scope faces`) for the 3 `candidate` packets passing all hard QA checks (`0` overhang, `faceAnchor` pass, `faceCoverage` pass, `faceDistinct` pass, `idle hidden: 0`):
     - `rivallie`: `docs/team/comms/director/approvals/rivallie--2026-11-05-rivallie-faces-26d6823a60de.md` (digest `71f97801...`; staged at `art/source/staging/blender/rivallie-faces.json`).
     - `bramblefang`: `docs/team/comms/director/approvals/bramblefang--2026-11-05-bramblefang-faces-e4615567901f.md` (digest `2aea08f5...`; staged at `art/source/staging/blender/bramblefang-faces.json`).
     - `mireling`: `docs/team/comms/director/approvals/mireling--2026-11-05-mireling-faces-dd867942c9f2.md` (digest `aee8e9f0...`; staged at `art/source/staging/blender/mireling-faces.json`).
  3. Recorded `changes-requested` (`--scope faces`) for the 5 `draft` packets that fail `faceCoverage` (>10% hidden forward frames; `publish_faces` rejects `status: draft`):
     - `steamshell`: `docs/team/comms/director/approvals/steamshell--2026-11-05-steamshell-faces-0dce8f2a1ee7.md` (`49/408` hidden, `idle hidden: 6`).
     - `ignicap`: `docs/team/comms/director/approvals/ignicap--2026-11-05-ignicap-faces-b697f6962d69.md` (`83/408` hidden, `idle hidden: 0`).
     - `zephyrit`: `docs/team/comms/director/approvals/zephyrit--2026-11-05-zephyrit-faces-24bbc81717f6.md` (`108/408` hidden, `idle hidden: 15`).
     - `cindermoth`: `docs/team/comms/director/approvals/cindermoth--2026-11-05-cindermoth-faces-676432066d2a.md` (`134/408` hidden, `idle hidden: 12`).
     - `marshstalker`: `docs/team/comms/director/approvals/marshstalker--2026-11-05-marshstalker-faces-b6801512aa14.md` (`272/408` hidden, `idle hidden: 18`).
  4. Audit and decide the re-baked face packets once `blender` tunes `"faceOffsetPx"` in their recipes (or Claude/Codex updates `forgelib/faces.py`).
- done when: all 8 T0 species have approved C3b face sidecars ready for `publish-faces`
- evidence: docs/team/comms/director/approvals/{rivallie--2026-11-05-rivallie-faces-26d6823a60de,bramblefang--2026-11-05-bramblefang-faces-e4615567901f,mireling--2026-11-05-mireling-faces-dd867942c9f2,steamshell--2026-11-05-steamshell-faces-0dce8f2a1ee7,ignicap--2026-11-05-ignicap-faces-b697f6962d69,zephyrit--2026-11-05-zephyrit-faces-24bbc81717f6,cindermoth--2026-11-05-cindermoth-faces-676432066d2a,marshstalker--2026-11-05-marshstalker-faces-b6801512aa14}.md.

## Next (Quality Re-bakes, Icons, Portraits, Flora & World Dressing)

### V6 · Audit and decide `B20` (C26 readability re-bakes) and `B23` (17 inventory icons)

- status: in-progress (priority 4 — **`B23` 17 inventory icons `director-approved`** in `docs/team/comms/director/approvals/icons-items--2026-11-04-icons-items-1.md`; waits on `blender` `B20` readability re-bakes)
- goal: review the C26 readability re-bakes (`rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet`, `npc:oren` white beard/hair, `npc:reed` white shirt, `item:copper-sword` crossguard/blade, `item:shortbow` bowstring arc) and the 17 inventory icons (`B23`).
- work:
  1. For `B20` packets: open `contact.png` (`PRD-5`), verify no feature flicker across `idle`/`run` frames (`ART-6.3`), verify `npc:oren` beard/hair and `npc:reed` shirt read in `ivory`/`cream` instead of brown/tan, verify `copper-sword` crossguard and `shortbow` open arc are restored, and record decisions via `forge.py approve-record` (superseding the older approval records so `approval_for` points to the new digest).
  2. For `B23` icons (**DONE 2026-11-05**): inspected all 17 `32×32` icons at 1× and 4× (`PRD-5`) in `art/review/2026-11-04-icons-items-1/contact.png`, verified `forgelib.icon.check()` QA across all 17 PNGs in `art/source/ui/icons/items/`, added `art/review/2026-11-04-icons-items-1/review.json`, and recorded `director-approved` via `forge.py approve-record` in `docs/team/comms/director/approvals/icons-items--2026-11-04-icons-items-1.md` (digest `773b5166b2aa226d1283ef50410989414055822e26fade7601be56749b54e158`).
- done when: `B20` and `B23` packets are audited and decided via `forge.py approve-record`
- evidence: docs/team/comms/director/approvals/icons-items--2026-11-04-icons-items-1.md; art/review/2026-11-04-icons-items-1/review.json.

### V7 · Audit and decide `B25` (19 actor portrait sets), `B24` (18 flora state sprites), and `B26` (worldforge map dressing)

- status: open (priority 5; waits on `blender` `B25`, `B24`, `B26`)
- goal: inspect and decide the 9-emotion portrait sets, 3-state flora sprites, and dressed Aqualia level packets.
- work:
  1. **`B25` (Portraits):** Open every 9-emotion sheet (`PRD-5`) and compare against the neutral master portrait. Reject or request changes on any set where hair/skin/coat ramps shift across expressions (e.g., blue hair turning green) or where the 2-px border is overpainted.
  2. **`B24` (Flora):** Inspect healthy, harvested, and burnt states (`PRD-5`) for all 6 flora types; verify `1×1` footprint and state recognizability.
  3. **`B26` (World dressing):** Open `overview.png` and every screen crop (`PRD-5`) in the `worldforge` packet; verify landmark placement against `AQ-2` and zero `worldforge check` findings.
- done when: `B25`, `B24`, and `B26` packets are audited and decided
- evidence:

### V8 · Reconcile Claude call-back rulings on Proposals `004`–`007` and tool fixes

- status: open (priority 6; waits on Claude's next call-back)
- goal: apply Claude's decisions on Proposals `004`–`007` and the 5 tool findings reported in `docs/team/comms/visitor/2026-11-05T0030--to-claude--acting-director-audit-and-tool-findings.md` (`portrait.py`, `faces.py`, `item_orient.py`, `pixelize.py`, `assets-build.mjs`).
- done when: queue gates and status board reflect Claude's rulings
- evidence:
