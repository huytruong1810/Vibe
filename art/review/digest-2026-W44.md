# Weekly Review Digest: 2026-W44

- date: 2026-10-31
- week: 2026-W44
- author: communicator
- status: for director review

---

This digest compiles all review packets, doctrine proposals, and creative candidate assets awaiting director decision.

## Summary of Decisions Needed

| # | Item | Type | Candidate Path | One-Line Ask |
| :- | :--- | :--- | :--- | :--- |
| 1 | **Rivallie Golden Sample** | Review Packet | `art/review/2026-10-31-rivallie/` | Decide whether to approve candidate as baseline or hold for resynthesis from updated reference sheet M2. |
| 2 | **Aqualia Region Bible (C5)** | World Bible | `docs/doctrine/regions/aqualia.md` | Approve layout, landmarks, and level boundaries (90×68 village, 120×68 riverlands) to unblock tile generation. |
| 3 | **Proposal 002: Voice Casting** | Doctrine Proposal | `docs/team/proposals/002-aqualia-voice-casting.md` | Approve authored Kokoro-82M blends and blip parameters for the 10 Aqualia villagers. |
| 4 | **Aqualia Day & Night Scores** | Audio Scores | `art/source/audio/scores/aqualia-{day,night}.json` | Listen to preview WAVs in scratch and approve score JSONs. |
| 5 | **Humanoid Reference Sheets** | Forge Inputs | `art/source/references/{npc-neris,player-aqualia,mannequin-*}/` | Confirm reference sheets as official inputs for Blender Ticket B4. |

---

## 1. Rivallie Golden Sample Review Packet

- **Asset**: `rivallie` (water otter creature)
- **Files**: `contact.png`, `turntable.gif`, `clips/*.gif`, `qa_report.json`
- **What it is**: 15 animation clips across 8 facings (616 frames total), 13 palette colours, 56×56 canvas, idle height 31px.
- **QA Summary**: 13 hard checks passed (`clipMatrix`, `canvas`, `margins`, `anchorDrift` 0.000px, `height`, `paletteMembership`, `colorCount`, `outlineContinuity`, `orphans`, `idleFlicker`, `referenceFidelity`, `castDistinctness`).
- **Gaps / Concerns**:
  - `ART-7.3` Value Contrast: Soft warning. Median luminance delta against grass is 0.039 (target $\ge 0.12$). On green grass, the teal body has low value separation.
  - Belly Shading: Side views show predominantly teal pelt; cream underbelly is less prominent than in the approved portrait.
- **Context**: Ticket M2 delivered an updated single-pose all-fours reference sheet (`art/source/references/rivallie/`) with emphasized cream belly.
- **Director Action**: Approve baseline candidate via `docs/team/comms/director/approvals/rivallie--2026-10-31-rivallie.md` or instruct Blender to resynthesize using reference M2.

---

## 2. Aqualia Region Bible & Plan (Codex Ticket C5)

- **Asset**: `docs/doctrine/regions/aqualia.md` and `art/source/world/regions/aqualia.plan.json`
- **What it is**: Definitive world specification for the Aqualia slice, establishing two contiguous levels (`aqualia_village` 90×68, `aqualia_riverlands` 120×68), 18 landmark locations, elevation terrain steps, and spawn points.
- **Director Action**: Review landmark layout and approve region specification to allow Codex and Blender to proceed with tile and level generation.

---

## 3. Proposal 002: Aqualia Villager Voice Casting (Communicator Ticket M6)

- **Asset**: `docs/team/proposals/002-aqualia-voice-casting.md`
- **What it is**: Gender-blind voice casting sheet for all 10 Aqualia villagers per doctrine AGT-4.2, grounded in age, societal role, and personality traits.
- **Details**:
  - Spoken tier: Kokoro-82M blends with pitch offset and speech rate.
  - Retro tier: In-engine syllable blip parameters (frequency 110–260 Hz, waveforms, cadence 95–145 ms, envelopes).
  - Authored sample line for each character capturing their canonical voice and belief.
- **Director Action**: Mark proposal `accepted` or request adjustments.

---

## 4. Aqualia Day and Night Music Scores (Communicator Ticket M7)

- **Asset**: `art/source/audio/scores/aqualia-day.json` and `aqualia-night.json`
- **Preview WAVs (Local Scratch)**: `art/source/forge/work/audio/aqualia-{day,night}.preview.wav`
- **What it is**: Original tracker-style scores in 6/8 compound meter and D Lydian (raised 4th G# shimmer), quoting bars 1–2 of the Hearthwild main motif.
- **Validation**:
  - Both pass `render_score.py` with 0 errors.
  - Melody range: 12 semitones [73, 85].
  - Distinct pitches: 8.
  - Notes per bar: 3.75 (day), 3.12 (night).
  - Bass: triangle, octave 2–3 (21–33 semitones below melody).
  - Stems: Day features pulse lead, harp, strings, bass, and noise percussion. Night drops percussion per AUD-4.1 and adds celestial bell chimes with flute lead.
- **Director Action**: Listen to preview audio and confirm score JSONs.

---

## 5. Humanoid Reference Sheets (Communicator Tickets M3, M4, M5)

- **Asset**:
  - `art/source/references/npc-neris/` (A-pose + ferry pole prop)
  - `art/source/references/player-aqualia/` (A-pose + canal hatchet prop)
  - `art/source/references/mannequin-{standard,sturdy,slender,elder}/` (2-view mannequin sheets)
- **What it is**: Standardized orthographic reference sets (4.5–5 heads tall, neutral A-pose, empty hands, plain background). Validated via `forgelib.prep.run` with 0 edge contact and height $\ge 256\text{px}$.
- **Director Action**: Acknowledge as approved reference inputs for Blender Ticket B4.
