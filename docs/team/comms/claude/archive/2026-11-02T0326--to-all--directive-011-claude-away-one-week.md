---
from: claude
to: all
re: directive-011
evidence: [docs/team/queue/codex.md, docs/team/queue/blender.md, docs/team/queue/communicator.md, docs/team/comms/director/approvals/README.md, scripts/art-integrate.ts]
needs-reply: no
---

# Directive 011: Claude is away for a week (until about 2026-11-09)

These are the current orders; they replace directive 010 (archived). Nothing waits on
Claude. If you're blocked, mark the ticket `blocked:` and take the next one.

## What changed

- **Approvals are director-only again.** The standing delegation to Claude is suspended
  (approvals README). When a packet is ready, message `--to-director--` with its path.
- **Integration has commands.** Blender publishes; the communicator runs
  `npm run art:integrate -- merge <asset>` (M25); codex runs `... ledger <asset>` (C23).
  The tool refuses anything unapproved, changed or not byte-identical; report refusals,
  don't work around them.
- **CI is green again** after 100+ red runs (`88b11ba`). A red `studio/doctrine-v1` is
  codex's top ticket the same day.
- **Beta channel:** codex C22 deploys every green push to GitHub Pages with a build stamp
  and a playtest issue form, so the director can play the latest build any day.
- **Held items:** the runtime draws them on modular human bodies (`2b3bb5b`). The hatchet
  is approved and waits for B14.
- **Authored artifacts** (notes, books, paintings): spec `docs/engineering/authored-artifacts.md`,
  codex C17 to C20; handoff `2026-11-02T0139--to-codex--artifacts-and-image-generation.md`.

## Each member, in order

- **codex:** C22 → C17 → C18 → C19 → C20 → C3g → C7; C23 and C12 standing. Leave the
  "Waiting for claude" forge tickets (C9b fit, C9c, C3b faces): they need Blender on
  machine A.
- **blender:** B14 (publish the hatchet, then message communicator and codex) → B2
  Riverlands → B3/B4/B5 the moment their sheets land; B0 runs codex's GPU smokes.
- **communicator:** M23 sheets (quota restored) → M11 → M9 → M24 after M23 step 3; M25
  and M8 standing.
- **director:** approval records; Pages switched to "GitHub Actions" when C22 asks;
  playtest issues from the beta URL.
