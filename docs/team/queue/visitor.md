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

- status: open (priority 1)
- goal: ensure the 25 approved bodies/items/environments and 11 approved human face sidecars published by `blender` (`B27`) match their approval records with zero digest drift and are cleanly integrated by `communicator` (`M25`).
- inputs: `art/source/staging/blender/*.json`, `docs/team/comms/director/approvals/*.md`, `docs/team/queue/blender.md` (`B27`), `docs/team/queue/communicator.md` (`M25`).
- work:
  1. Run `uv run --project art/source/forge python art/source/forge/forge.py approve-record` (no arguments) to verify all approval records match their packets.
  2. Check `art/source/staging/blender/` to confirm all 25 approved body/item/env assets (`rivallie`, `bramblefang`, `marshstalker`, `mireling`, `zephyrit`, `cindermoth`, `ignicap`; `player-aqualia` + 10 NPCs; 7 held items including `hatchet`; 5 environments) plus `tiles-aqualia-terrain.json` and 11 human face sidecars are staged, and that `steamshell` is **not** staged until `B28`/`V4` is approved.
  3. Update `docs/team/status-board.md` as batches move from `director-approved (awaiting publish)` to `staged` and `integrated in manifest.json`.
- done when: all 25 approved assets + 11 human face sidecars + `tiles-aqualia-terrain` are staged and verified
- evidence:

### V4 · Audit and decide `B28` (`steamshell` 180° backward-yaw fix)

- status: open (priority 2; waits on `blender` `B28`)
- goal: inspect the re-baked `steamshell` packet after `rig.yawDeg` is adjusted by ~`180°` and record `director-approved` (or `changes-requested`) via `forge.py approve-record`.
- inputs: new `art/review/<date>-steamshell/` packet from `blender` (`B28`); superseded record `docs/team/comms/director/approvals/steamshell--2026-11-03-steamshell.md`.
- work:
  1. Open `art/review/<date>-steamshell/contact.png` via `read_file` (`PRD-5`) and read `qa_report.json` + `review.json`.
  2. Verify:
     - `idle` Col 1 (`s`) shows the tan head and eyes facing South (toward the viewer), and Col 3 (`e`) faces East (right).
     - `walk` and `run` step forward head-first (not shell-first).
     - All 12 hard QA checks pass (`0` off-palette, `15` clips, `616` frames).
  3. Mark `steamshell--2026-11-03-steamshell.md` as `superseded` (`superseded-by` the new record) and run `forge.py approve-record --asset steamshell --packet art/review/<date>-steamshell/ --decision approved --scope body,clips --recorded-by "visitor acting as director under TEAM-4.2 (directive 017)" --note "..."`.
  4. Instruct `blender` to run `forge.py publish --asset steamshell` and `forge.py faces --asset steamshell`.
- done when: `steamshell` body packet passes visual orientation check (`PRD-5`) and has a verified `director-approved` record
- evidence:

### V5 · Audit and decide `B29` (C3b creature face sidecars for 7+ creatures)

- status: open (priority 3; waits on `blender` `B29`)
- goal: inspect `contact.png` and `registered.png` for each C3b creature face packet (`rivallie`, `bramblefang`, `mireling`, `marshstalker`, `zephyrit`, `cindermoth`, `ignicap`, and `steamshell`) and record decisions via `forge.py approve-record`.
- inputs: `art/review/<date>-<creature>-faces-<hash>/{contact.png,registered.png,faces.json}`.
- work:
  1. Open both `contact.png` and `registered.png` with `read_file` (`PRD-5`) for each creature.
  2. Check `faces.json`: `faceCoverage` (`0` overhang pixels outside body alpha) and `faceDistinct` (`status: candidate`).
  3. Visually verify that across all 5 expressions (`neutral`, `warm`, `fearful`, `hurt`, `sleep`) and 5 forward facings (`s`, `se`, `sw`, `e`, `w`), the eyes and mouth sit inside the 3D head silhouette (not floating in transparent space or on the torso/shell) and contrast cleanly against the coat/muzzle ramp.
  4. Run `forge.py approve-record --asset <creature> --packet <packet> --decision approved --scope faces --recorded-by "visitor acting as director under TEAM-4.2 (directive 017)" --note "..."` for each passing packet, and queue `forge.py publish-faces --asset <creature>`.
- done when: all 8 T0 species have approved C3b face sidecars ready for `publish-faces`
- evidence:

## Next (Quality Re-bakes, Icons, Portraits, Flora & World Dressing)

### V6 · Audit and decide `B20` (C26 readability re-bakes) and `B23` (17 inventory icons)

- status: open (priority 4; waits on `blender` `B20` & `B23`)
- goal: review the C26 readability re-bakes (`rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet`, `npc:oren` white beard/hair, `npc:reed` white shirt, `item:copper-sword` crossguard/blade, `item:shortbow` bowstring arc) and the 17 inventory icons (`B23`).
- work:
  1. For `B20` packets: open `contact.png` (`PRD-5`), verify no feature flicker across `idle`/`run` frames (`ART-6.3`), verify `npc:oren` beard/hair and `npc:reed` shirt read in `ivory`/`cream` instead of brown/tan, verify `copper-sword` crossguard and `shortbow` open arc are restored, and record decisions via `forge.py approve-record` (superseding the older approval records so `approval_for` points to the new digest).
  2. For `B23` icons: inspect all 17 `32×32` icons at 1× and 4× (`PRD-5`) for silhouette readability, palette compliance, and transparent margin, then record the decision via `forge.py approve-record`.
- done when: `B20` and `B23` packets are audited and decided via `forge.py approve-record`
- evidence:

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
