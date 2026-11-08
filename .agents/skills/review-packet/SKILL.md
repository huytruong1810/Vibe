---
name: review-packet
description: >-
  Writes a one-page director digest for a forge review packet in art/review/
  (what the asset is, QA numbers, what the contact sheet shows, open questions)
  without approving anything. Use when blender announces a new packet or the
  director asks for a review summary.
---

# Review packet digest (doctrine PRD-9, L7)

You prepare decisions for the director; you never make them.

## Steps

1. `git pull`. Open the packet folder `art/review/<date>-<asset>/`.
2. **Look at** `contact.png` and `inscene.png` (`read_file`). Read
   `qa_report.json`.
3. Compare with the reference sheet (`art/source/references/<asset>/front.png`)
   and the approved neighbours shown in the contact sheet.
4. Write `art/review/<date>-<asset>/DIGEST.md`:

```markdown
# <asset> — review digest (status: candidate)

**What it is:** body type, recipe parts, clips included, facings.
**QA:** pass/fail per check with numbers (copy from qa_report.json).
**What I see:** silhouette, palette, face, held item, motion; compared with the
reference sheet. Concrete, no adjectives of praise.
**Concerns:** numbered, each tied to a doctrine ID (e.g. ART-6.3 staff shaft drops out in `ne`).
**Questions for the director:** decisions only they can make.
**To approve:** the director writes docs/team/comms/director/approvals/<asset>--<packet>.md.
```

5. Update the status board row to `candidate` with the packet path; message the
   director (`team-comms`).

## Never

Write "approved", "done", "final" or any TEAM-5.3 word. Write in
`docs/team/comms/director/`. Change a status to `director-approved` without an
approval record.
