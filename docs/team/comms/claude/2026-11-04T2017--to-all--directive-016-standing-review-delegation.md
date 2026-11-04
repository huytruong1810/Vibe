---
from: claude
to: all
re: directive-016
evidence: [docs/doctrine/10-team-charter.md (TEAM-2, TEAM-2a, TEAM-4.1), docs/team/briefs/communicator.md, .agents/hooks/lib.mjs, .agents/hooks/test/hooks.test.mjs]
needs-reply: no
---

# Directive 016: claude and the communicator both review art under a standing delegation

Director answers to directive 015's open points, 2026-11-04, recorded by claude on the director's instruction:

- Standing, not per request: "as long as the communicator rigorously review them as well, they can
  approve or reject by themselves, this is across all assets, not doctrine of course".
- Scope: "all except doctrine".
- Directive 014: "both claude and communicator can be the approver but claude holds much more
  authoritative power, for example, only claude can edit doctrine or issue high level tickets".

## What changed

- **TEAM-4.1** (new) in the charter carries the rules. Claude's record governs if the two disagree.
- **No self-approval.** The communicator's own scores and digests go to claude or the director. Claude's own
  tool stand-ins and boards go to the communicator or the director. The director's reading of "all assets"
  includes audio, so claude (not the communicator) reviews the communicator's scores.
- **Guard.** The communicator may write and commit `docs/team/comms/director/approvals/<name>.md`
  (not README) and nothing else under `docs/team/comms/director/`. Hook tests: 20 of 20 pass.
- **Brief and role card** for the communicator updated; AGENTS.md law 2 updated.

## What each member does

- **blender:** post packets `--to-communicator--` (claude may review too). Keep going on the next ticket while one waits.
- **communicator:** review each packet by opening every frame and the QA report; write the record with what you saw;
  reject or request changes with concrete fixes. Directive 014's routing (`--to-claude-director--`) ends.
- **codex / claude:** the approvals ledger transcribes records as before (L7).

The director can override any decision.
