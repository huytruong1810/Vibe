# 12 — Audio direction

## AUD-1 Identity: "16-bit heart, orchestral soul"

The sound is a **chiptune-orchestral hybrid**. A core of pulse, triangle and noise
voices (the game's pixel heart) is joined by warm orchestral colour: plucked harp,
soft strings, woodwinds, bells and hand percussion. Small arrangements, big melodies.

## AUD-2 References: qualities, never notes

| Reference     | Take                                                                                                                                          | Refuse                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Undertale** | Leitmotifs that transform with the story (one melody becomes a lullaby, a battle, a farewell); emotional economy; chiptune and piano intimacy | Copying any melody, chord progression or arrangement |
| **Pokémon**   | Instantly hummable 4-bar hooks; a clear structure of town, route and battle themes; driving battle tempo with a bright lead                   | The same                                             |
| **Zenonia 4** | Fantasy-orchestral sweep; warm village themes; heroic, energetic field battle music                                                           | The same                                             |

> **AUD-2.1 Originality is mandatory.** A "mix" of existing themes is a derivative work
> and a legal liability. Every piece is an original composition that evokes these
> _qualities_. Never quote, interpolate or "reharmonize" a melody from another work,
> even a few bars.

## AUD-3 Leitmotif system

- **AUD-3.1 The Hearthwild motif:** one 8-bar main theme (a 4-bar hook and its 4-bar
  answer), stated on the title screen, its first 2 bars quoted in every village theme, transformed for night, battle and festivals.
- **AUD-3.2 Village motifs:**
  - **Aqualia:** 6/8, harp and soft pulse, flowing stepwise lines, major with a raised 4th
    shimmer.
  - **Pyrador:** 4/4, hand drums and low pulse, minor mode, forge-anvil accents.
  - **Zephyria:** 3/4, pipes and triangle, Lydian, wide leaps like gusts.
- **AUD-3.3 Bond motifs:** Rivallie and each species get a 2-bar signature that plays
  when bonded or ascending. Key villagers get motifs that play in their heart events.

## AUD-4 Dynamic music

- **AUD-4.1** Each area theme ships as synchronized **stems** (base, melody, colour,
  percussion). Time of day swaps or mutes stems (night drops percussion, adds bells).
- **AUD-4.2** Combat adds a battle layer in sync with exploration (same key and tempo
  family), fading in on engagement and out within 4 s of disengagement (AMB-5).
- **AUD-4.3** Festivals get bespoke arrangements of the village motif.

## AUD-5 Format and tools

- **AUD-5.1** Music is authored as **tracker-style score JSON** (tempo, key, channels,
  patterns, instruments from a fixed palette), stored in `art/source/audio/scores/`. The
  game plays scores with an in-engine sequencer, so music is tiny, layerable and
  responsive. Previews render to WAV with `art/source/audio/tools/render_score.py`.
- **AUD-5.2** Agents compose through the `music-score` skill: draft in the score format,
  render, **listen-proxy check** (the renderer's analysis report: range, density,
  repetition), and submit for the director's ear. The director approves music, as with
  art (L7).
- **AUD-5.3** The main theme may later be commissioned from a human composer; the
  leitmotif system remains the brief.

## AUD-6 Sound effects and voice

Hits layer whoosh, impact and element tail (CMB-6.5). UI sounds are soft woody clicks
and chimes. Voice tiers and ducking follow AGT-4. Footsteps follow surface material (AMB-5).

## Engineering mandates

| ID     | Mandate                                                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUD-M1 | WebAudio sequencer that plays score JSON with the fixed instrument palette (pulse, triangle, noise, harp, strings, bell, woodwind, hand drums), stem mute/solo, sample-accurate sync. |
| AUD-M2 | Music state machine: area theme, time-of-day stem swaps, combat layer crossfade, festival overrides, voice ducking.                                                                   |
