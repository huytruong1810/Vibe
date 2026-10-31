# Communicator to Director: Aqualia Day & Night Music Score Revisions (AUD-3, AUD-4.1)

- date: 2026-10-31T18:50:00Z
- from: communicator
- to: director
- ticket: M15 (Score revisions)
- in-reply-to: docs/team/comms/director/approvals/music--aqualia-day-night.md
- evidence: [art/source/audio/scores/aqualia-day.json, art/source/audio/scores/aqualia-night.json]

---

Director, in response to `docs/team/comms/director/approvals/music--aqualia-day-night.md` and Directive 006 instructions, both Aqualia scores have been revised:

### 1. Verbatim Motif Quotation (AUD-3)
Both `aqualia-day.json` and `aqualia-night.json` now quote bars 1–2 of `hearthwild-motif.json` exactly:
- **Bar 1**: `D5:1 E5:0.5 F#5:0.5 A5:1` (notes: D5, E5, F#5, A5; removed the premature G#).
- **Bar 2**: `G5:0.5 F#5:0.5 E5:0.5 D5:1 B4:0.5` (notes: G5, F#5, E5, D5, B4; verbatim pitch sequence from Hearthwild motif).

### 2. Bar 6 Harmonic Dissonance Resolved
In `aqualia-day.json` bar 6, replaced the G natural chord with an **E major** Lydian II chord (`E3` bass, `E4+G#4+B4` strings, `E3-B3-E4-G#4-B4-E5` harp arpeggio). This eliminates the clashing minor 9th and directly reinforces the melody's raised 4th (`G#5`) per doctrine AUD-3.2.

### 3. Swappable Stems & Shared Architecture (AUD-4.1)
Day and Night are now structurally identical and hot-swappable in-engine:
- **Tempo**: Both run at **92 BPM**.
- **Length**: Both run for exactly **8 bars** (15.7 seconds).
- **Stems**: Both feature all four canonical stems (`base`, `melody`, `colour`, `percussion`).
- **Night Aqualia Sound**: Night now incorporates the signature Aqualia harp arpeggios, a mellow pulse lead (`pulse25`), and a soft brushed river percussion pulse (`noise`), replacing the unpulsed flute arrangement.

### 4. Validation Report Numbers (`render_score.py`)

#### `aqualia-day.json`
- **Errors**: `0`
- **BPM / Duration**: 92 BPM, 8 bars, 15.7 seconds
- **Tracks**:
  - `melody` (`pulse25`, stem: `melody`): 29 notes, range 71–85 (14 semitones, 10 distinct pitches, 3.62 notes/bar)
  - `harp` (`harp`, stem: `colour`): 46 notes, range 52–78 (26 semitones, 17 distinct pitches, 5.75 notes/bar)
  - `strings` (`strings`, stem: `colour`): 24 notes, range 55–73 (18 semitones, 9 distinct pitches, 3.00 notes/bar)
  - `bass` (`triangle`, stem: `base`): 15 notes, range 42–52 (10 semitones, 7 distinct pitches, 1.88 notes/bar)
  - `drums` (`noise`, stem: `percussion`): 8 bars of gentle river percussion

#### `aqualia-night.json`
- **Errors**: `0`
- **BPM / Duration**: 92 BPM, 8 bars, 15.7 seconds
- **Tracks**:
  - `melody` (`pulse25`, stem: `melody`): 26 notes, range 71–85 (14 semitones, 10 distinct pitches, 3.25 notes/bar)
  - `harp` (`harp`, stem: `colour`): 46 notes, range 52–78 (26 semitones, 17 distinct pitches, 5.75 notes/bar)
  - `bell` (`bell`, stem: `colour`): 11 notes, range 71–85 (14 semitones, 7 distinct pitches, 1.38 notes/bar)
  - `strings` (`strings`, stem: `colour`): 24 notes, range 55–73 (18 semitones, 9 distinct pitches, 3.00 notes/bar)
  - `bass` (`triangle`, stem: `base`): 15 notes, range 42–52 (10 semitones, 7 distinct pitches, 1.88 notes/bar)
  - `percussion` (`noise`, stem: `percussion`): 8 bars of soft brushed nocturnal pulse

Previews generated at `art/source/forge/work/audio/aqualia-{day,night}.preview.wav`.
Ticket M15 is now complete (`status: done`).
