---
id: 003
author: blender
rule: TEAM-5.1, PRD-4, TEAM-8
status: open
---

# Proposal 003: Multi-Machine Evidence Synchronization & Packaging-Only Invariants

## Problem

Across the two-machine architecture (Machine A: GPU/Blender, Machine B: Codex/runtime), two operational friction points emerged during Ticket B1 and B3:

1. **Evidence Citations Without Concurrent Git Publication (TEAM-5.1)**:
   - When a candidate asset packet is reviewed and approved by the Director on Machine A, the approval document is written to `docs/team/comms/director/approvals/<asset>--<date>.md`.
   - In B3, `docs/team/queue/blender.md` cited `docs/team/comms/director/approvals/bramblefang--2026-10-31-bramblefang.md` as evidence of gate clearance. However, because agents are instructed not to edit director comms (`TEAM-3`), the approval file was initially left untracked on Machine A.
   - When Codex on Machine B pulled `studio/doctrine-v1`, the queue cited a file that did not exist on the remote branch, creating an evidence verification failure.

2. **Ambiguity Between Asset Authoring and Tooling Packaging (PRD-4)**:
   - When engineering introduced the development gallery exporter (`forgelib/review.py` emitting `review.json` and registered `frames/`), communication requesting a packet update was phrased as "Rivallie needs packet regeneration".
   - Because Rivallie's 3D mesh, rig, animations, and candidate frames were already finished and Director-approved, this created ambiguity over whether a compute-intensive 3D re-bake was being requested, rather than a lightweight packaging export pass (`forge.py packet`).

## Proposed Text

Amend the production doctrine and team charter with the following two operational rules:

### 1. Atomic Evidence Publication (Add to `docs/doctrine/10-team-charter.md` § TEAM-5.1)

> **TEAM-5.1a (Evidence Synchronization)**: Any document citing evidence in `docs/team/queue/` or `docs/team/status-board.md` must ensure that all cited paths exist on the pushed branch in the same commit or an earlier commit. If a Director approval record (`docs/team/comms/director/approvals/*.md`) is created locally to approve a candidate packet, it must be committed and pushed in tandem with the queue or comms update citing it. No agent may cite uncommitted or machine-local evidence in shared tracking files.

### 2. Packaging-Only Invariant (Add to `docs/doctrine/09-production-doctrine.md` § PRD-4 and `.agents/skills/sprite-forge/SKILL.md`)

> **PRD-4.4 (Packaging Updates)**: When upstream engineering updates export metadata schemas, gallery viewers (`PRD-M2`), or packet manifest formats (e.g. `review.json`), already-approved candidate assets must not repeat 3D generation, rigging, or baking. The asset runner merges the engineering update and executes only:
> ```bash
> uv run --project art/source/forge python art/source/forge/forge.py packet --asset <slug>
> ```
> This populates the new metadata from existing candidate passes (`pix/export/`, `bake/tracks.json`) without consuming GPU/reconstruction cycles.

## Impact

- **Affected Roles**: `blender` (Machine A), `codex` (Machine B), `director`.
- **Affected Skills**: `team-comms`, `sprite-forge`.
- **Benefits**:
  - Eliminates "missing evidence on remote branch" alerts between Machine A and Machine B.
  - Prevents redundant multi-minute Hunyuan3D/Blender bake re-runs when only JSON metadata formats evolve.
