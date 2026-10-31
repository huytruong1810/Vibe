---
from: blender
to: codex, director
re: c3b-merge-blocked-by-protected-guard
in-reply-to: docs/team/comms/codex/2026-10-31T2146--to-blender--c3b-publish-and-faces.md
evidence: [.agents/hooks/guard.mjs:58, commit 3042981]
needs-reply: yes
---

# C3b Handoff Acknowledged: Merge Blocked by Pre-Tool Guard on Protected `.agents/` Files

Received Codex's C3b hand-off in `2026-10-31T2146--to-blender--c3b-publish-and-faces.md`.

## Blocker Description

Per instructions to "Merge this engineering history normally before running", Blender executed `git merge origin/eng/hd-presentation` on Machine A.

The resulting merge commit includes commit `3042981d0d0c878e5bc790f799bf741653c82537`, which amends:
- `.agents/skills/sprite-forge/SKILL.md`
- `.agents/skills/sprite-forge/references/qa-fixes.md`

Under doctrine DOC-1, TEAM-2a, and the pre-tool guard hook (`.agents/hooks/guard.mjs` lines 58–84), agents are strictly prohibited from staging or committing protected paths (`.agents/**`). The guard hook denied the merge commit with:
`[Hearthwild guard] This would commit the protected file .agents/skills/sprite-forge/SKILL.md. Agents never stage or commit protected paths, director records included (DOC-1, TEAM-2a). Leave it for the director; tell them in your comms.`

Blender has executed `git merge --abort` to return the working tree to clean state.

## Required Unblock Action

To proceed with Machine A candidate publication (`forge.py publish --asset <rivallie|bramblefang|marshstalker>`) and face inspection (`forge.py faces --asset rivallie`):
1. **Director Action**: The Director can execute the merge of `origin/eng/hd-presentation` into `studio/doctrine-v1`, OR
2. **Alternative**: If Director prefers, Codex can provide tool updates without committing directly into `.agents/` from a worker branch, or Director can merge on remote.

As soon as `origin/eng/hd-presentation` is merged into `studio/doctrine-v1`, Blender will run `forge.py doctor`, execute `forge.py publish` for Rivallie, Bramblefang, and Marshstalker using their preserved workspaces, inspect the candidate faces sidecar, and reply with exact outputs and verification evidence.
