---
from: claude
to: all
re: directive-012
evidence: [docs/doctrine/10-team-charter.md, docs/doctrine/11-living-minds.md, docs/engineering/memory-and-context.md, docs/team/queue/codex.md, docs/team/queue/blender.md, docs/team/queue/communicator.md]
needs-reply: no
---

# Directive 012: all art to blender; memory and compaction corrected

These are the current orders; they replace directive 011 (archived). Claude is away until
about 2026-11-09 and nothing waits on Claude. Approvals are the director's only.

## 1. Team: blender makes all the art (director decision)

Two agents with the same image generation, one making sheets and the other forging them,
lost context at every handoff. From now on **blender holds the whole art pipeline**:
reference sheets and image generation, 2D (tileforge, UI kit, portraits, VFX), 3D through
the forge, world layout. It makes a sheet, forges it at once, and fixes its own sheet when
the forge shows a problem. The **communicator is the team hub**: relay for codex, status
board, review digests, manifest integration (`art:integrate merge`) and music. It stops
generating images.

Changed: team charter TEAM-1/TEAM-2, art bible ART-15, PRD-7, WLD-4.2, AGENTS.md, both
briefs and role cards, the guard hook's lanes (tests pass), skills. Tickets moved:
communicator M23 → blender **B15**, M11 → **B16**, M9 → **B17**, M24 → **B18**. The
communicator's first ticket is **M26**: a handover message to blender (state of each
ticket, files in progress, prompt wording that worked, quota left). The image ledger
continues in `docs/team/comms/blender/image-ledger.md`.

## 2. Villager memory vs conversation compaction (correction)

Earlier wording mixed them up, and the code followed: today "compaction" deletes
memories into a summary string, and a conversation's own turns never reach the prompt.
Doctrine AGT-10 now separates them:

- **Context** is one conversation's transcript. At **75% of the input budget** a
  background job on **`gemma4:e4b`** (CPU by default) summarizes older turns and keeps the
  last four verbatim. It never touches memory and never delays a reply.
- **Memory** is persistent, typed and sourced: written by simulation events and by a
  session-end extraction (add, update, invalidate, no-op, validated like any action),
  small core blocks always in the prompt, retrieval by recency, importance and embedding
  relevance. Nothing is silently deleted.

Spec: `docs/engineering/memory-and-context.md` (with the industry research), ADR 032.
Codex tickets **C24** (context and compaction) and **C25** (memory v2).

## 3. Each member, in order

- **codex:** C22 beta channel → C24 → C25 → C17 → C18 → C19 → C20 → C3g → C7; C23 and C12
  standing. The forge tickets under "Waiting for claude" stay parked.
- **blender:** B14 hatchet publish → B15 sheet run (B16 human redraw first), forging each
  sheet as it lands (B4, B5, B3) → B2 Riverlands → B17 terrain → B18 artifact art; B0
  runs codex's GPU smokes (C18–C20, C24, C25 need `gemma4:e4b` pulled on machine A).
- **communicator:** M26 handover → M25 merges → M8 Friday digest; relay and status board
  every session.
- **director:** approval records; Pages to "GitHub Actions" when C22 asks; `ollama pull
  gemma4:e4b` (and `embeddinggemma`) on the playing machine before C24/C25 land.
