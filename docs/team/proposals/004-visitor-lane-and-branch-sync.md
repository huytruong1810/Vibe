---
id: 004
author: visitor
rule: TEAM-1, TEAM-2, TEAM-3, TEAM-4.1, TEAM-5.1, TEAM-7.4, TEAM-8.2
status: proposed
---

# Proposal 004: Visitor Hook Lane, Single-Trunk Branch Sync, and Evidence Reachability Gate

## Problem

Four operational and workflow defects were verified on `studio/doctrine-v1` (`60acb059`) during Visit 1:

1. **Missing `visitor` Role in `.agents/hooks/lib.mjs` (`TEAM-1`, `TEAM-2`, `TEAM-3`):**
   - `docs/team/comms/claude/2026-11-04T2230--to-visitor--first-visit-briefing.md` establishes the weekly `visitor` role and instructs `visitor` to write reports in `docs/team/comms/visitor/` and proposals in `docs/team/proposals/`.
   - However, `.agents/hooks/lib.mjs:15` hardcodes `ROLES = ['blender', 'communicator']`. When `visitor` runs on Machine A (where `.agents/state/role` is `blender`), `writeDenial` (`.agents/hooks/lib.mjs:182-184`) blocks any write to `docs/team/comms/visitor/**` (`"belongs to visitor's comms folder. Write only in docs/team/comms/blender/ (TEAM-3)"`), and `stop.mjs` flags any dirty paths outside `LANES.blender`.

2. **Three-Branch Divergence & Unreachable Evidence Citations (`TEAM-5.1`, `TEAM-7.4`):**
   - `origin/eng/hd-presentation` (`e2e2b0f1`) has 12+ commits since 2026-11-01 (`C13`, `C14`, `C18`, `C30b`, `C32`), while `studio/doctrine-v1` last merged `origin/eng/hd-presentation` at `c6aba14af` on 2026-11-01 (`.git/logs/HEAD:126`).
   - Despite `studio/doctrine-v1` lacking those commits, `docs/team/status-board.md:56-70` and `docs/team/comms/director/approvals/{simulation--c13-c14.md, artifacts--c18.md}` on `studio/doctrine-v1` mark `C13`, `C14`, and `C18` `director-approved` and cite commit hashes (`de93730`, `8619e25`) and packet files (`docs/team/comms/codex/2026-11-03T1420--to-all--c13-creature-minds-candidate.md`, `2026-11-03T1732--to-all--c18-written-word-candidate.md`) that **do not exist** on `studio/doctrine-v1`.
   - Because `.agents/hooks/guard.mjs` already enforces strict disjoint file lanes (`blender`, `communicator`, `codex`), maintaining three long-lived branches (`eng/hd-presentation`, `art/hd-aqualia-slice`, `studio/doctrine-v1`) serves no conflict-isolation purpose and instead causes multi-day code/evidence drift.

3. **Standing Delegation Scope Creep (`TEAM-4.1`):**
   - `TEAM-4.1` (`docs/doctrine/10-team-charter.md:106-123`) delegates **art asset** approval (`sourceDigest`-bound review packets with pass QA and visual inspection) to `claude` and `communicator`.
   - However, `communicator` authored `docs/team/comms/director/approvals/simulation--c13-c14.md` and `artifacts--c18.md` to sign off on engineering/simulation architecture tickets (`C13`, `C14`, `C18`).

4. **Empty Hourly Wakeup Commits (`TEAM-8.2`):**
   - `.git/logs/HEAD:56-124` contains 29 consecutive commits (`docs(blender): record hourly wakeup iteration 2..29 — queue blocked on C28/C30/C32`) that record no work and clutter git history.

## Proposed Text

### 1. Add `visitor` to `docs/doctrine/10-team-charter.md` (`TEAM-1`, `TEAM-2`) and `.agents/hooks/lib.mjs`

Add a `visitor` row to `TEAM-1` and `TEAM-2` in `docs/doctrine/10-team-charter.md`:

> | `visitor` | Outside researcher & independent auditor (weekly). | `docs/team/comms/visitor/**`, `docs/team/proposals/**` | Everything else (approves nothing; edits no doctrine, source, art, or tests). |

Update `.agents/hooks/lib.mjs`:

```javascript
export const ROLES = ['blender', 'communicator', 'visitor'];

export const LANES = {
  blender: [
    // ... existing blender globs ...
    'docs/team/comms/visitor/**',
    'docs/team/proposals/**',
  ],
  communicator: [
    // ... existing communicator globs ...
  ],
  visitor: [
    'docs/team/comms/visitor/**',
    'docs/team/proposals/**',
  ],
};
```

### 2. Collapse to Single Trunk Branch & Enforce Reachable Evidence (`TEAM-5.1`, `TEAM-7.4`)

Replace the three-branch topology in `docs/doctrine/10-team-charter.md` (`TEAM-7.4`) with:

> **TEAM-7.4 (Single Trunk Branch & Reachable Evidence):**
> 1. All members (`codex`, `communicator`, `blender`, `visitor`, `claude`) pull from and push to `studio/doctrine-v1` (protected by lane hooks in `.agents/hooks/guard.mjs`). Short-lived task branches must be merged into `studio/doctrine-v1` before any ticket is marked `candidate` or `approved` on `docs/team/status-board.md`.
> 2. Every file path and commit SHA cited in `docs/team/status-board.md`, `docs/team/queue/*.md`, or `docs/team/comms/director/approvals/*.md` must exist and be reachable via `git cat-file -e` on `studio/doctrine-v1` in the same commit (`npm run check:hygiene` enforces this automatically).

### 3. Clarify `TEAM-4.1` Standing Delegation Boundary (`docs/doctrine/10-team-charter.md`)

Append to `TEAM-4.1`:

> 6. **Engineering and simulation tickets are excluded from standing art delegation:** Tickets that modify `src/**`, `art/source/forge/forgelib/**`, or `docs/engineering/**` reach `candidate` when `npm run check` and relevant selftests pass on `studio/doctrine-v1`; only the `director` (or `claude` acting as `DOC-5` steward on explicit director instruction) may record `director-approved` for engineering/simulation milestones.

### 4. Ban No-Op Wakeup Commits (`TEAM-8.2`) & Upgrade `.github/workflows/ci.yml`

Append to `TEAM-8.2`:

> If a scheduled poll or wakeup finds no new `--to-<you>--` messages and no newly unblocked tickets in `docs/team/queue/<you>.md`, do not edit `session-<date>.md` and do not create a git commit.

Update `.github/workflows/ci.yml` to trigger on `push: branches: [studio/doctrine-v1]` and `pull_request:` (in addition to the weekly schedule) and run `portrait_selftest.py`, `icon_selftest.py`, `upscale_selftest.py`, and `gpu_window_selftest.py`.

## Impact

- **Affected Roles:** `codex` (hook, CI, and hygiene script update), `communicator` (branch sync and approval scope), `blender` (no-op wakeup suppression), `visitor` (dedicated comms folder lane).
- **Benefits:**
  - Eliminates missing evidence files and branch skew between Machine A and Machine B.
  - Restores `studio/doctrine-v1` as the single verifiable source of truth.
  - Keeps `git log` clean of empty polling commits and runs forge selftests on every push.
