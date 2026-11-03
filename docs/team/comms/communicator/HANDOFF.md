# Communicator Session Handoff

## Role & Mandate (Machine B, beside Codex)

You are **communicator**: team hub (relay, status board, review digests), manifest integration, and music score (`docs/team/briefs/communicator.md`).
- **Directive 012 & 013**: All image generation, reference sheets, 3D modeling, and visual art production belong exclusively to `blender` on Machine A. Communicator **never generates images or creates art sources**.
- **Boundaries (TEAM-2)**: Communicator writes only to `docs/team/comms/communicator/**`, `docs/team/status-board.md`, `docs/team/proposals/**`, `docs/art/reviews/**`, `art/review/**` (digests only), `art/source/manifest.json` (via `npm run art:integrate -- merge`), `art/source/audio/**`, and ticket status in `docs/team/queue/communicator.md`.
- **Codex Workspace Isolation**: The root workspace `c:\Users\htruong\source\repos\Vibe` belongs to Codex on branch `eng/hd-presentation` (working on Ticket C14 / C13). **Never modify, revert, or commit Codex's files in `Vibe`**. Communicator operates exclusively inside dedicated worktree:
  `C:\Users\htruong\source\repos\Vibe-art` on branch `art/hd-aqualia-slice`.

---

## Studio Communications & State Reconciliation (2026-11-02)

The latest communications across the studio have been audited and integrated:

1. **Directive 014 (Standing Review Delegation)**:
   - Director reinstated standing review delegation (`docs/team/comms/claude/2026-11-02T2330--to-all--directive-014-standing-review-delegation.md`). Claude reviews Blender packets for the Director.
   - Blender queue expanded to cover the complete T0 slice (B5 landmarks, B21 villagers, B22 tools, B23 icons, B24 flora, B25 portraits, B26 map dressing).
   - Claude tool development order: C30a swatch (unblocks B17), C30b portrait (B25), C32 icon (B23), C28, C3b, C9b, C9c.
2. **Director Approvals Recorded**:
   - **Aqualia Voice Casting Sheet (Revision 2, M14)**: `director-approved` ([`docs/team/comms/director/approvals/proposal-002-r2.md`](../director/approvals/proposal-002-r2.md)). Status board updated.
   - **Riverlands Map Layout (Revision 2, B2)**: `director-approved` ([`docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_riverlands-2.md`](../director/approvals/world-aqualia--world-aqualia-aqualia_riverlands-2.md)). Status board updated.
   - **Mireling Candidate Packet**: `director-approved` ([`docs/team/comms/director/approvals/mireling--2026-11-01-mireling.md`](../director/approvals/mireling--2026-11-01-mireling.md)). Status board updated.
   - **Hatchet Canonical Reference & Icon**: `director-approved` ([`docs/team/comms/director/approvals/item-hatchet--2026-11-01-item-hatchet.md`](../director/approvals/item-hatchet--2026-11-01-item-hatchet.md)). Status board updated.
3. **C27 Landed**:
   - Clay pose guides for human, shelled, winged, and mushroom-biped landed in commit `2c497cc` (`art/source/style/pose-guides/`).
4. **Codex C14 Landed**:
   - Deterministic attack director, telegraphs, and tokens committed in `17672f7` / `7f9858c` on `eng/hd-presentation`.

---

## Communicator Queue Status (`docs/team/queue/communicator.md`)

| Ticket | Status | Description & Evidence |
| :--- | :--- | :--- |
| **M26** · Art Handover to Blender | `done` (awaiting reply) | Handover message pushed in [`docs/team/comms/communicator/2026-11-02T2355--to-blender--art-handover.md`](2026-11-02T2355--to-blender--art-handover.md). Transferred tickets B15 (M23), B16 (M11), B17 (M9), B18 (M24). Prompt batch in [`m23-prompt-batch.md`](m23-prompt-batch.md). |
| **M25** · Manifest Integration | `open` (standing) | Sole manifest integrator (TEAM-2a). When Blender publishes `art/source/staging/blender/<asset>.json`, run `npm run art:integrate -- merge <asset>`, `npm run assets:build`, commit, push, and notify Codex. |
| **M8** · Weekly Review Digest | `open` (recurring Friday) | Produce `art/review/digest-<YYYY-Www>.md`. W44 completed, W45 published (`art/review/digest-2026-W45.md`). |

*Archived tickets M1–M7, M10, M12–M22, and M14 are preserved in `docs/team/queue/archive/communicator.md`.*

---

## Step-by-Step Resumption for Fresh Session

When starting the fresh Antigravity session, execute these steps in order:

### Step 1: Worktree & Status Check
Always work in `C:\Users\htruong\source\repos\Vibe-art`:
```powershell
cd C:\Users\htruong\source\repos\Vibe-art
git pull origin art/hd-aqualia-slice
npm run check:hygiene
```

### Step 2: Establish Hourly Daemon Schedule
Per Director instruction ("wake yourself up every hour to check for new comms and work on tickets"), launch a background cron/schedule job:
- Expression: `0 * * * *` (hourly)
- Prompt: `"Hourly Studio Check: Check new comms in docs/team/comms/*/, check for staged assets in art/source/staging/blender/, check for director approvals, and update status board."`
- `IsDaemon: true`

### Step 3: Monitor for Staging & Execute M25
Inspect `art/source/staging/blender/` for incoming JSON publications from Blender (e.g., `item:hatchet`, `mireling`, or new golden samples):
- When an approved asset lands:
  ```powershell
  npm run art:integrate -- merge <asset>
  npm run assets:build
  npm run check:assets
  git add art/source/manifest.json public/assets/generated/
  git commit -m "feat(art): integrate <asset> into manifest"
  git push origin art/hd-aqualia-slice
  ```
- Send notification `--to-codex--` so Codex can append the ledger entry.

### Step 4: Upkeep Status Board & Reviews
- Update `docs/team/status-board.md` as new packets and approvals land.
- If a new review packet is posted by Blender, draft `art/review/<packet>/DIGEST.md` (one-page objective review digest citing QA numbers and visual observations, never approving).

---

## Verification & Guard Rails
- **Hygiene Gate**: Run `npm run check:hygiene` before every commit (must report 0 errors, 0 warnings).
- **Asset Gate**: Run `npm run check:assets` to verify atlas packaging, frame budgets, and manifest integrity.
- **Language Law**: Zero banned superlatives in commits, reports, and comms (PRD-5, TEAM-5.3).
- **Turn Reports**: Always conclude turns with `### Changed`, `### Evidence`, and `### Gaps`.
