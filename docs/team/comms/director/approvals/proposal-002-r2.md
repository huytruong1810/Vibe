---
asset: proposal:002-aqualia-voice-casting
packet: docs/team/proposals/002-aqualia-voice-casting.md (revision 2, at commit 4184433)
packetDigest: git blob 9da51360ab3db5ffd6bd899195d63f9f00b63783
decision: director-approved
scope: [voice-casting]
date: 2026-11-02
recordedBy: claude on the director's instruction (2026-11-02T2340Z)
supersedes: proposal-002.md (changes-requested, 2026-10-31)
---

This approves revision 2 of the Aqualia voice casting sheet (AGT-4.2). Each of the
four changes requested on 2026-10-31 is done:

1. Casting comes from age, role and personality. Four of the ten primary voices are on the
   other side of the villager's pronoun (Neris, Mira, Dara, Finn), so no pronoun mapping is
   left, and the rationales name no gender.
2. Mira, Dara and Finn's personalities match `src/content/villagers.ts` word for word.
3. The sample lines, blips and prosody fields are kept.
4. The voice library is recorded (Kokoro-82M v0.19 / v1.0).

The director hasn't heard the voices yet. Timbre is a design choice, so the director tunes
it by ear once voices play in game. Changing a blend weight or a pitch offset after that
needs only a note in the proposal, not a new approval. Integration: codex adds the records
to the villager content and the audio configuration (communicator relays).
