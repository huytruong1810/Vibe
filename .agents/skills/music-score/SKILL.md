---
name: music-score
description: >-
  Composes original Hearthwild music in the tracker-style score JSON format, renders a
  WAV preview with a validation report, and submits it for the director's review. Use
  for any theme, leitmotif, stem, jingle or festival arrangement (doctrine AUD).
---

# Music scores (doctrine AUD-1…AUD-5)

## Rules first

- **Original only (AUD-2.1).** Never quote, interpolate or re-harmonize a melody, chord
  progression or arrangement from Undertale, Pokémon, Zenonia or any other work, even a
  few bars. Take _qualities_ (leitmotif transformation, hummable 4-bar hooks, fantasy
  warmth), never notes.
- **Leitmotifs (AUD-3).** Village themes quote bars 1–2 of
  `art/source/audio/scores/hearthwild-motif.json`. Respect each village's metre, mode
  and instruments (AUD-3.2).
- **Stems (AUD-4.1).** Every area theme has tracks tagged `base`, `melody`, `colour`,
  `percussion` with the same length and tempo, so the game can mute and swap them.

## Steps

1. Copy the structure of `hearthwild-motif.json` into `art/source/audio/scores/<id>.json`
   (ids like `aqualia-day`, `aqualia-night`, `battle-field`, `bond-rivallie`).
2. Write notes per track: `D5:1` (note, beats), `r:2` (rest), `D4+F#4+A4:2` (chord),
   drums on `noise` tracks as `k` (kick), `s` (snare), `h` (hat). Separate bars with `|`.
   Instruments: pulse12, pulse25, pulse50, triangle, noise, harp, strings, bell, flute.
3. Render and validate:
   ```
   uv run --project art/source/forge python art/source/audio/tools/render_score.py art/source/audio/scores/<id>.json
   ```
   Exit code 1 means a bar doesn't sum to the time signature: fix it. The preview WAV lands in
   `art/source/forge/work/audio/` (scratch; never commit it).
4. Read the report: melody range ideally 10–17 semitones, melody notes per bar 2–6,
   bass at least an octave below the melody, distinct pitches above 5. Flat or repetitive
   numbers mean the line needs more shape.
5. Commit only the score JSON. Message the director with the score path, the report numbers and
   what the piece is meant to evoke. The director listens and approves (L7).

## Never

Commit WAV previews · claim a piece "sounds great" (you can't hear it; report numbers
and intent) · use banned words (TEAM-5.3).
