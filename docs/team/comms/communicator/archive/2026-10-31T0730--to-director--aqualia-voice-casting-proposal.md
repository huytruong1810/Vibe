# Communicator to Director: Proposal 002 Aqualia Voice Casting Sheet Submitted

- date: 2026-10-31T07:30:00Z
- from: communicator
- to: director
- ticket: M6 (Voice casting sheet: draft for the 10 Aqualia villagers, AGT-4.2)
- proposal: docs/team/proposals/002-aqualia-voice-casting.md

---

Director,

Per Ticket M6 and doctrine AGT-4.2, Proposal 002 (`docs/team/proposals/002-aqualia-voice-casting.md`) has been authored and submitted for your review.

### Compliance & Methodology
1. **Gender Blind (AGT-4.2)**: Voice qualities, pitches, and blend profiles are grounded strictly in age, societal role, and personality traits from `src/content/villagers.ts`. No attributes were inferred from pronouns or naming conventions.
2. **Three-Tier Audio Support (AGT-4.1)**:
   - **Kokoro-82M (Tier 2 / Spoken)**: Concrete voice blends combining warmth, texture, and register (e.g. `0.70*am_onyx + 0.30*am_echo` for Caelum, `0.65*bf_emma + 0.35*am_fenrir` for Neris, `0.80*af_sky + 0.20*af_river` for Marina).
   - **In-Engine Blips (Tier 1 / Retro)**: Exact base frequencies (110 Hz – 260 Hz), waveforms (filtered triangle, clipped saw, hollow sine, rounded pulse), cadence intervals (95 ms – 145 ms), and envelope timings.
3. **One Sample Line per Villager**: Each line captures the villager's canonical belief and dialogue style.

### Decision Needed
- Please review `docs/team/proposals/002-aqualia-voice-casting.md` and indicate approval (`accepted` / `declined` / revisions requested).
