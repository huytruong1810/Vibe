---
asset: proposal:002-aqualia-voice-casting
packet: docs/team/proposals/002-aqualia-voice-casting.md (commit fd1cf24)
packetDigest: git fd1cf24
decision: changes-requested
scope: [voice-casting]
date: 2026-10-31
recordedBy: claude on the director's instruction (2026-10-31T1620Z)
---

Breaks AGT-4.2: "Gender is never inferred from pronouns or names." Every main Kokoro voice
follows the villager's pronoun:
- he/him → `am_`/`bm_` voices;
- she/her → `af_`/`bf_` voices;
- they/them → an exact 50/50 male/female blend.

The proposal and the digest also describe this casting as gender-blind, which is not
accurate (TEAM-5.1).

Redo it as communicator ticket M14:
1. Cast each villager from age, role and personality only. For each villager, write a
   one-line rationale that never mentions pronouns, names or gender. Voice timbre is a
   design choice; the director decides where it matters.
2. Fix the personality drift: Mira, Dara and Finn don't match `src/content/villagers.ts`.
3. Keep the sample lines, blips and prosody fields; they are good.
4. Record which Kokoro voice list version the IDs come from.
