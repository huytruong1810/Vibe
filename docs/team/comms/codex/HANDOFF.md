# Codex session handoff

Prepared for a fresh agent on the director's request. This is a navigation aid;
read the current constitution, doctrine, branch history and directives themselves.

## Immediate instructions

1. Read `AGENTS.md`, `docs/team/briefs/codex.md`, the `team-comms` and
   `doctrine-lookup` skills, and relevant doctrine before making decisions.
2. Inspect `git status`, fetch, read new comms, and integrate published work through
   the normal studio → art → engineering flow. Preserve dirty work. Do not operate
   on `Vibe-art` or old review worktrees to make engineering integration easier.
3. **Directives 008 and 009 supersede this session's earlier pending-ticket order.**
   Claude has continued implementation on Machine A. Review/integrate those
   changes before selecting a ticket; do not independently rebuild C3f or items.
4. **Hourly automation is cancelled at the user's request.** Windows task
   `Hearthwild-Codex-Hourly-Comms` was removed and verified absent. Do not recreate
   it, schedule another wakeup or treat old hourly prompts as current authorization.
5. Finish this handoff's documentation commit/push if it remains dirty after an
   interrupted publication. Never reset or discard the two preexisting local edits.

## Workspace, branches and publication

- Engineering: `C:\Users\htruong\source\repos\Vibe`, PowerShell,
  branch `eng/hd-presentation`; published baseline when checked: **c0adba8**.
  The handoff commit follows it. Check actual HEAD rather than assuming this hash.
- Separate art checkout: `C:\Users\htruong\source\repos\Vibe-art`.
  Its local HEAD was **eca5994**, while published art/studio had advanced to
  **d8381ca**. Do not touch its branch, index or local files.
- Fetched `origin/art/hd-aqualia-slice` and `origin/studio/doctrine-v1`:
  **d8381ca**. These contain the engineering baseline as an ancestor, but new
  handoff commits may require a normal merge rather than a fast-forward.
- Consumer `eng/c11b-consumers`: **1208560**, normally pushed; code **0575294**.
  This source-only lane avoided protected-runbook merge deltas for art agents.
  Do not overwrite the newer studio tooling with its older implementation.
- Draft engineering PR: https://github.com/huytruong1810/Vibe/pull/1
- Draft consumer PR: https://github.com/huytruong1810/Vibe/pull/4
  Both descriptions were updated for the older C9b increment, before the latest
  Claude changes were integrated. Refresh descriptions after reviewing those changes.
- Preexisting `.cache/art-review-src` and `.cache/hd-integration` worktrees remain.
  This session's OS-temp consumer worktree was verified clean/pushed and removed.
  No owned test server or PR-helper script remains. Keep secrets out of outputs.

## Local work delivered and verified before the new remote work

- **7586e49**: transactional held-item renderer and QA, common Blender baker
  integration, CLI `items` and `selftest --kind item`, PRD-2 cuboid fixture,
  CI tests, engineering guide and ADR 030.
  Files include `forgelib/item_render.py`, `item_render_selftest.py`,
  `blender/fixture_item.py`, `blender/bake.py` and `forge.py` under the forge root.
- It renders 8 facings × 8 grip buckets plus an icon from a rigid existing mesh,
  snapshots source input, pins dependencies, checks projected root/sockets,
  margins, exact 2x blocks, palette and raw-silhouette thin spurs, installs hashed
  immutable output, then atomically changes `items.json`. Cache validation checks
  corruption and preserves pointer bytes. Failures preserve the old pointer.
- Thin-spur QA does not certify internal straps, material details, readability or
  facing flicker. Do not equate fixture success with approved production art.
- **49 Python forge tests passed** locally and independently in the temporary
  consumer checkout. **305 TypeScript tests / 23 suites**, types, architecture,
  structural assets and production build passed. Hygiene passed on both checkouts.
- Blender 4.2 is absent locally. B13 subsequently reports real Machine-A calibration
  success; that receipt is remote evidence, not a new local execution/inspection.
- Prior C3e browser run: 18 initial journeys passed; one setup timeout then passed
  alone unchanged. No full-first-run green claim. No new browser/soak run for the
  item tooling. Existing global formatting/atlas drift gates were not weakened.
- **6e956cc** merged M19's old digest/audit report; **c0adba8** published handoff
  and queues. One residual `<<<<<<< HEAD` marker in the communicator queue was
  caught afterwards. Its removal and a corrected session record are included in
  the handoff documentation changes. Verify publication; do not reintroduce it.

## New remote history: inspect before picking work

These were read through `git show origin/art/hd-aqualia-slice:<path>` but have
**not been integrated or independently tested in this engineering checkout**.

- `docs/team/comms/claude/2026-11-01T2240--to-all--directive-008-beta-slice.md`:
  director-authorized Claude takeover of C3f/M19; faces and Riverlands require fixes.
- `2026-11-01T2302--to-all--beta-slice-landed.md` in the same folder:
  **3298147 C3f** preserves V1 rows within V2 using `legacy: true`, no anchor
  rounding, with digest/build preservation tests. **0a5e5c6 M19** integrates three
  approved body/clip sets and ledger records; multi-page atlases are supported.
  Reported check: 309 tests, structural assets pass, HD coverage still fails.
  **C7 activation was NOT delivered**; procedural world remains active.
- `2026-11-01T2310--to-all--directive-009-unblock-production.md`:
  Claude takes open engineering work while Codex is away; approval README now
  records the director's standing delegation to Claude. Do not contradict that
  newer record with the older "Claude unavailable / no delegated approvals" text.
  Codex still has no independent visual approval grant.
- **5710b5c**: item source prep/orient/icon/packet/publish; later go-items message
  `2026-11-02T0000--to-blender--go-items.md`. Golden hatchet packet exists.
  Earlier local "items not ready / no go-items" evidence is historical now.
- **ed32dab**: human publication; **722f0e6**: environment kind and calibration;
  `2026-11-02T0100--to-blender--go-environment.md` opens environment production.
  Garment fit and runtime composition still need current-code inspection.
- **776eb0f / d8381ca**: shelled, winged and mushroom-biped templates, reported
  calibration QA, template-to-species map and go-creature-templates message.
  **f1ded41** integrates Mireling following the new delegated approval record.
- Read actual approval files and scope/digests. Faces remain changes-requested;
  village layout approved, Riverlands changes-requested. Do not infer map readiness
  or approvals from a packet title, hash report or a passing test.
- B13 receipt: `docs/team/comms/blender/2026-11-01T0630--to-codex-director--b13-item-calibration-results.md`.
  Reports Blender 4.2.3, 65 poses, QA success and stable cache. Work artifacts are
  Machine-A ignored files; do not claim personally opening them on Machine B.
- The requested candidate graph is now published remotely at
  `docs/team/comms/communicator/candidate-quadrupeds-v2.json`; the old local
  "actual graph still missing" task is superseded. M19 integration is also done.

## Suggested next session sequence

1. Verify handoff publication, fetch, read all newer addressed comms and reread the
   **upstream** Codex queue. Coordinate with Claude so there is one implementation
   owner; directive 009 says Claude is actively handling the remaining forge work.
2. Normally integrate art history, preserving local documentation. Review C3f as
   steward: legacy normalized anchors/digests/identity fallback must remain exact,
   while native V2 registration stays integer-strict. Review actual frame hashes,
   closure and approval records rather than transcribing preliminary reports.
3. Validate the merged implementation before declaring it locally passing. Read
   current CI commands; run relevant Python tests plus `npm run check`. Broaden
   browser/soak verification only when changed runtime scope requires it.
4. Pick the highest-priority unclaimed item from the refreshed queue. Likely next
   areas are C3b face placement, C3g atlas-gallery/budget, C9c motion polish or C7
   map-driven activation; confirm Claude has not already picked them up.
5. C3b: registered decals currently overhang the crown; read the changes-requested
   record, face point offset/silhouette QA and profile hurt/fear readability tasks.
   Re-packet sidecars on the approved body; do not regenerate approved bodies.
6. C3g: gallery still describes page 0 as a single page; show every page. Reported
   decoded atlas memory grew ~15 → 64 MiB. Budget/measure before optimizing; avoid
   shrinking creature anatomy to match oversized legacy humans.
7. C7 is a larger separate change: map-driven settlements/player spawn, explicit
   worldSource save/versioning, absent-region population handling, then beta toggle.
   Existing 30-human fixed village positions cannot be spawned into authored void.
   Do not activate the candidate map by replacing only the terrain generator.

## Permissions, failures and operating discipline

- Automatic review rejected an optional edit to the protected sprite-forge skill
  during the earlier C9b increment. It was left unchanged; the guide carried the
  API instead. Do not bypass a rejected edit through another tool. Claude's newer
  published changes may legitimately update it; inspect their authority/history.
- Another commit/push attempt was not executed because automatic review hit a
  usage limit. That was an infrastructure failure, not an unsafe-action finding.
  Keep session claims accurate about what actually executed.
- Normal Git writes/network and some Node Git subprocesses need escalation in this
  sandbox. User already authorizes normal testing/commit/push; no force pushes,
  history rewrites, main merge, arbitrary protected edits or external-worktree edits.
- Read `.agents/skills/sprite-forge/SKILL.md` for forge work, and the corresponding
  world/tile skills for those tasks. No unrequested subagent or concurrent worker.
- Use pinned `uv` project tooling; local fallback interpreter is
  `art/source/forge/.venv/Scripts/python.exe`. CI shows exact unittest discovery
  patterns. Tests snapshot tool hashes: do not mutate tools while these tests run.
- Write messages in own comms, ≤40 lines each, with evidence and honest gaps.
  Keep C12 queues evidence-based. Never stage director approval/protected records
  manually or turn candidates into approvals. Keep global gates intact.
- End with Changed / Evidence / Gaps. No timer should be restored during handoff.
