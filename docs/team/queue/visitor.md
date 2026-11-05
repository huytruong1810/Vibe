# Queue: visitor (acting director under TEAM-4.2 until 2026-11-11)

Read your brief `docs/team/briefs/visitor.md` and `docs/doctrine/10-team-charter.md` (`TEAM-4.2`) first.
Start your session with `HEARTHWILD_ROLE=visitor` (do not permanently overwrite `.agents/state/role` if `blender` is running concurrently).
Finished tickets are in [archive/visitor.md](archive/visitor.md).
For full context from the previous Argon session, read [2026-11-05T0035--to-visitor--argon-session-handoff.md](../comms/visitor/2026-11-05T0035--to-visitor--argon-session-handoff.md).

**Standing rules (`TEAM-4.2`, Directive 017):**

- You may approve, reject, or request changes on art and audio packets (`docs/team/comms/director/approvals/*.md`), always using `uv run --project art/source/forge python art/source/forge/forge.py approve-record` so `packetDigest` is never retyped.
- Look at `contact.png` and `registered.png` (`PRD-5`) before writing any approval record. Quote creature expression names from `render_spec.json` (`neutral`, `warm`, `fearful`, `hurt`, `sleep`).
- You may triage `docs/team/queue/**` and update `docs/team/status-board.md` and `art/review/` digests.
- Before every push: run `npx prettier --write` on every markdown or JSON file you touched, then `npm run check:hygiene` and `npm run format:check`.
- You may **not** rule on your own proposals (`004`–`007`), approve engineering/simulation milestones, edit code/doctrine/art sources/manifest, or run `art:integrate` / `forge publish` directly as `visitor`.

## Now (Next Argon Session Priorities)

### V3 · Verify `B27` staging output and `M25` manifest integration readiness

- status: in-progress (priority 1 — **33 staging JSONs verified in `art/source/staging/blender/` + 1 tileset in `art/source/staging/tiles/` + 17 icons in `art/source/ui/icons/items/`**; Claude's `6e283fb9` unblocked `publish_body` for the 10 NPC bodies + 2 winged creatures, and `visitor` approved 7 `B20` re-bakes; awaiting `blender` running `forge.py publish` on those and `communicator` merging via `M25`)
- goal: ensure the 25 approved bodies/items/environments and approved human/creature face sidecars published by `blender` (`B27`/`B29`) match their approval records with zero digest drift and are cleanly integrated by `communicator` (`M25`).
- inputs: `art/source/staging/blender/*.json`, `docs/team/comms/director/approvals/*.md`, `docs/team/queue/blender.md` (`B27`), `docs/team/queue/communicator.md` (`M25`).
- work:
  1. Run `uv run --project art/source/forge python art/source/forge/forge.py approve-record` (no arguments) to verify all approval records match their packets (`0` digest mismatches across all verifiable records).
  2. Verify `art/source/staging/blender/` once `blender` publishes the 10 NPC bodies (`npc:*`), 2 winged creatures (`zephyrit`, `cindermoth`), and 5 `2026-11-05` re-bakes (`rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet`).
  3. Update `docs/team/status-board.md` as batches move from `staged` to `integrated in manifest.json` (`M25`).
- done when: all approved assets, face sidecars, icons, and `tiles-aqualia-terrain` are staged, verified, and integrated in `art/source/manifest.json`
- evidence: docs/team/comms/director/approvals/_.md; art/source/staging/blender/_.json; docs/team/comms/visitor/2026-11-05T0055--to-blender-communicator--v3-audit-b23-approved-and-b27-unblocked.md.

### V5 · Audit and decide `B29` (C3b creature face sidecars for 8 creatures)

- status: in-progress (priority 2 — **initial 8 packets decided (`rivallie`, `bramblefang`, `mireling` `director-approved`; 5 `changes-requested`)**; Claude's `6e283fb9` added `dx` mirroring for `sw`/`w` and the `eyesOnly` (`compact/`) fallback in `forgelib/faces.py`; waiting on `blender` to re-sweep `faceOffsetPx` and re-run `forge.py faces`)
- goal: inspect `contact.png` and `registered.png` for each C3b creature face packet (`rivallie`, `bramblefang`, `mireling`, `marshstalker`, `zephyrit`, `cindermoth`, `ignicap`, and `steamshell`) and record decisions via `forge.py approve-record`.
- inputs: new `art/review/<date>-<creature>-faces-<hash>/{contact.png,registered.png,faces.json}` packets after `blender` re-runs `faces` with `6e283fb9`.
- work:
  1. Open both `contact.png` and `registered.png` with `read_file` (`PRD-5`) for each re-baked creature face packet.
  2. Check `faces.json`: `faceAnchor` (`0` overhang), `faceCoverage` (`pass: true`, `0` idle hidden frames; `eyesOnly` compact frames are allowed per Claude `2026-11-05T0413`), and `faceDistinct` (`status: candidate`).
  3. Quote expression names from `render_spec.json` (`neutral`, `warm`, `fearful`, `hurt`, `sleep`), supersede any older `director-approved` face record for that creature (`superseded-by`), and run `forge.py approve-record --asset <creature> --packet <packet> --decision director-approved --scope faces --recorded-by "visitor acting as director under TEAM-4.2 (directive 017)" --note "..."`.
- done when: all 8 T0 species have approved C3b face sidecars bound to their latest approved body digests and staged via `publish-faces`
- evidence: docs/team/comms/director/approvals/{rivallie--2026-11-05-rivallie-faces-26d6823a60de,bramblefang--2026-11-05-bramblefang-faces-e4615567901f,mireling--2026-11-05-mireling-faces-dd867942c9f2,steamshell--2026-11-05-steamshell-faces-0dce8f2a1ee7,ignicap--2026-11-05-ignicap-faces-b697f6962d69,zephyrit--2026-11-05-zephyrit-faces-24bbc81717f6,cindermoth--2026-11-05-cindermoth-faces-676432066d2a,marshstalker--2026-11-05-marshstalker-faces-b6801512aa14}.md.

## Next (Quality Re-bakes, Icons, Portraits, Flora & World Dressing)

### V6 · Audit and decide `B20` (C26 readability re-bakes) and `B23` (17 inventory icons)

- status: in-progress (priority 3 — **`B23` 17 inventory icons `director-approved`**; **all 9 `B20` packets audited (`PRD-5`) and decided 2026-11-05**: 7 `director-approved` (`rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet`, `npc:oren`, `npc:reed`) with older records marked `superseded`; 2 `changes-requested` (`item:copper-sword`, `item:shortbow`) awaiting Claude's `C36` fix)
- goal: review the C26 readability re-bakes (`rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet`, `npc:oren` white beard/hair, `npc:reed` white shirt, `item:copper-sword` crossguard/blade, `item:shortbow` bowstring arc) and the 17 inventory icons (`B23`).
- work:
  1. **`B20` (9 packets decided 2026-11-05):**
     - **7 `director-approved`** (older records marked `decision: superseded` with `superseded-by:`): `rivallie--2026-11-05-rivallie.md`, `bramblefang--2026-11-05-bramblefang.md`, `marshstalker--2026-11-05-marshstalker.md`, `mireling--2026-11-05-mireling.md`, `item-hatchet--2026-11-05-item-hatchet.md`, `npc-oren--2026-11-05-npc-oren.md`, `npc-reed--2026-11-05-npc-reed.md`.
     - **2 `changes-requested`** (older `2026-11-04` records kept active & staged until `C36` lands): `item-copper-sword--2026-11-05-item-copper-sword.md` (crossguard/blade collapse into blunt paddle at 1×) and `item-shortbow--2026-11-05-item-shortbow.md` (open space between stave and string filled with opaque webbing at 1×).
  2. **`B23` icons (DONE 2026-11-05):** `icons-items--2026-11-04-icons-items-1.md` (`director-approved`).
  3. Audit `item:copper-sword` and `item:shortbow` once `C36` lands and `blender` re-renders them.
- done when: `item:copper-sword` and `item:shortbow` re-bakes after `C36` are audited and decided
- evidence: docs/team/comms/director/approvals/{icons-items--2026-11-04-icons-items-1,rivallie--2026-11-05-rivallie,bramblefang--2026-11-05-bramblefang,marshstalker--2026-11-05-marshstalker,mireling--2026-11-05-mireling,item-hatchet--2026-11-05-item-hatchet,npc-oren--2026-11-05-npc-oren,npc-reed--2026-11-05-npc-reed,item-copper-sword--2026-11-05-item-copper-sword,item-shortbow--2026-11-05-item-shortbow}.md.

### V7 · Audit and decide `B25` (pilot portrait set; batch gated on `C33`), `B24` (18 flora state sprites), and `B26` (worldforge map dressing)

- status: open (priority 4; waits on `blender` `B25` pilot, `B24`, `B26`)
- goal: inspect and decide the pilot 9-emotion portrait set (holding the 19-actor batch for Claude's `C33`), 3-state flora sprites, and dressed Aqualia level packets.
- work:
  1. **`B25` (Portraits — 1 pilot actor only until `C33`):** Open the pilot 9-emotion sheet (`PRD-5`) and compare against the neutral master portrait. Reject or request changes on any set where hair/skin/coat ramps shift across expressions or where the 2-px border is overpainted.
  2. **`B24` (Flora):** Inspect healthy, harvested, and burnt states (`PRD-5`) for all 6 flora types; verify `1×1` footprint and state recognizability.
  3. **`B26` (World dressing):** Open `overview.png` and every screen crop (`PRD-5`) in the `worldforge` packet; verify landmark placement against `AQ-2` and zero `worldforge check` findings.
- done when: `B25`, `B24`, and `B26` packets are audited and decided
- evidence:
