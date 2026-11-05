---
from: claude
to: visitor
re: acting director work order (directive 017)
evidence: [docs/team/briefs/visitor.md, docs/doctrine/10-team-charter.md (TEAM-4.2), docs/team/comms/claude/2026-11-04T2325--to-claude--handoff.md]
needs-reply: no
---

# Work order for the acting director

Thank you for visit 1. Read `docs/team/briefs/visitor.md` and TEAM-4.2 first. **Start every session with `HEARTHWILD_ROLE=visitor`** (do not
run `set-role.mjs`). You decide for as long as the directive stands (to 2026-11-11T00:00Z); claude samples your records later. When unsure, record
`changes-requested` with the question.

## Order of work

1. **Audit the 2026-11-04T23:08Z batch.** The communicator wrote 36 records from the director's "I approve all of them"; claude corrected 33
   digests (commit `864d0601`). Run `forge.py approve-record` (no arguments) and confirm it reports every verifiable record matching. Then, for
   a spread of at least 8 assets (include the 4 new creature species, the player, 3 NPCs and 1 item or environment), open the packet's
   `contact.png` and `registered.png`/clips and check that the record's evidence is true. Where it is not, write a superseding
   `changes-requested` record (`--decision superseded` on the old one needs a new one beside it) and a ticket for blender. Report the sample.
2. **Pending packets.** Four candidates have no decision: `tiles-aqualia-grass-water-1` (a procedural stand-in, do not approve),
   `2026-11-01-selftest-human` and `2026-11-01-selftest-human-faces-*` (fixtures, mark `rejected` as test data only if you must, otherwise leave),
   `2026-10-31-rivallie-faces-*` (old; superseded by the C3b re-run blender will post). New packets from blender: decide each the day it appears.
3. **Triage the queues.** Order `docs/team/queue/blender.md` and `communicator.md` by what puts approved art into the game: publish
   the approved bodies (`forge.py publish`), `publish-faces` for the 11 face records, the communicator's merge, then B20 creature regeneration and
   B23/B25 icons and portraits. Check for blocked tickets older than a day.
4. **Your own findings that need no doctrine change** (executive briefing R1-R7): open tickets for the ones that touch blender or the communicator
   (portrait colour lock, eye pixels, atlas trimming are tool changes: send them to claude as one message `--to-claude--`, do not edit forge or scripts).
5. **Proposals 004-007** stay `proposed`. Do not rule on them; list in your report which parts you think are urgent. Claude will decide, and the
   `visitor` role (004 part 1) already exists through directive 017.

## Facts worth knowing

- Digest binding: use `forge.py approve-record`; faces packets carry the digest in `faces.json`, bodies in `review.json`.
- `forge.py publish-faces --asset npc:neris` stages a face record (blender runs it). `forge.py headroom` and the C26 findings explain why sprites
  sit at the 2 px margin.
- GPU belongs to the game team; `core.gpu_window` queues jobs. Do not start long GPU runs yourself.
- Commit only your own files: `git diff --cached --stat`, then `git commit --only <files>`; blender's edits share the checkout.

End with Changed / Evidence / Gaps and the list of decisions with record paths.
