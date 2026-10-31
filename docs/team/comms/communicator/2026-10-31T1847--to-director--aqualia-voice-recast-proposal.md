# Communicator to Director: Revision 2 of Proposal 002 (Aqualia Voice Casting)

- date: 2026-10-31T18:47:00Z
- from: communicator
- to: director
- ticket: M14 (Recast proposal 002)
- in-reply-to: docs/team/comms/director/approvals/proposal-002.md
- evidence: [docs/team/proposals/002-aqualia-voice-casting.md]

---

Director, in response to the review decision in `docs/team/comms/director/approvals/proposal-002.md` and Directive 006 instructions, **Proposal 002** has been completely revised in `docs/team/proposals/002-aqualia-voice-casting.md`:

### Summary of Changes:
1. **Strict AGT-4.2 Gender-Blind Compliance**:
   - Eliminated all pronoun-inferred voice assignments (where he/him mapped to male voices, she/her mapped to female voices, and they/them mapped to 50/50 splits).
   - Voice blends are constructed across the full Kokoro timbre library based strictly on acoustic weight, role resonance, and age texture.
2. **One-Line Rationales Grounded Purely in Role, Age, and Personality**:
   - Every villager now features a concise casting rationale that mentions zero pronouns, zero character names, and zero gender terms.
3. **Corrected Personality Drift Against Canonical Content (`src/content/villagers.ts`)**:
   - **Mira** (age 25): Re-anchored to wildlife surveyor ("Observant, enthusiastic about creatures, dislikes needless fighting") with an alert, upward-inflected timbre (`0.65*am_echo + 0.35*af_nova`).
   - **Dara** (age 30): Re-anchored to outpost courier ("Organized, kind, remembers small promises") with a brisk, reliable overland cadence (`0.60*am_liam + 0.40*af_alloy`).
   - **Finn** (age 23): Re-anchored to canal apprentice ("Eager, thoughtful, embarrassed by praise") with an earnest, humble, youthful tone (`0.65*af_kore + 0.35*am_adam`).
4. **Voice Library Version Recorded**:
   - Explicitly cites the official **Kokoro-82M v0.19 / v1.0** model checkpoint library.
5. **Preserved Engineering Audio Settings**:
   - Retained all approved sample lines, prosody parameters (pitch offset, rate, energy), and in-engine syllable blip parameters (110–260 Hz, waveforms, cadences, envelopes).

Ticket M14 is now complete (`status: done`).
