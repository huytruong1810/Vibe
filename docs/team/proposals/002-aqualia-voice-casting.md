---
id: 002
author: communicator
rule: AGT-4.2
status: open
---

# Proposal 002: Aqualia Villager Voice Casting Sheet

## Problem

Under doctrine AGT-4.2, voice profiles are authored rather than inferred. Gender must never be inferred from pronouns or names, and casting must be informed strictly by age, role, and personality. The director must approve a voice casting sheet with one sample line per villager before voiced dialogue or blip synthesis ships. Currently, no approved casting sheet exists for the 10 Aqualia slice villagers defined in `src/content/villagers.ts`, blocking audio voice integration for Kokoro-82M (AGT-4.1 tier 2) and in-engine retro blips (AGT-4.1 tier 1).

## Proposed text

Adopt the following authored voice casting records for the 10 Aqualia villagers into `src/content/villagers.ts` / audio engine configurations:

### Summary Table

| Villager | Age | Role | Engine Voice Blend (Kokoro-82M) | Pitch Offset | Speech Rate | Blip Pitch | Blip Waveform | Sample Line |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Caelum** | 42 | Hydrologist & canal master | `0.70*am_onyx + 0.30*am_echo` | -1.0 st | 0.95 | 125 Hz | Filtered triangle | *"The water belongs to the whole watershed, neighbor; haste won't make the sluice turn any smoother."* |
| **Marina** | 19 | Reed weaver & diver | `0.80*af_sky + 0.20*af_river` | +1.5 st | 1.08 | 260 Hz | Sine / light overtone | *"You can love the sound of your home reeds and still wonder what the wind tastes like past the reef."* |
| **Neris** | 51 | Ferry keeper | `0.65*bf_emma + 0.35*am_fenrir` | -1.5 st | 0.92 | 145 Hz | Clipped reed saw | *"River’s in no hurry to swallow your raft today, but a safe crossing is worth waiting ten beats for."* |
| **Reed** | 28 | Grain farmer | `0.50*am_liam + 0.50*af_bella` | 0.0 st | 1.00 | 180 Hz | Soft low-pass square | *"Leave a furrow for the grazers and the soil remembers your kindness when the autumn floods roll in."* |
| **Willa** | 33 | Wetland herbalist | `0.70*af_aoede + 0.30*af_kore` | +0.5 st | 0.90 | 220 Hz | Filtered hollow sine | *"Step lightly near the root hollows; a marsh is far more than unused mud waiting to be dried."* |
| **Oren** | 57 | Waterwheel builder | `0.70*bm_george + 0.30*bm_fable` | -2.0 st | 0.94 | 110 Hz | Deep square-triangle | *"If the axle doesn't squeak, how will you know it's turning? Now fetch the grease horn and let's check the teeth."* |
| **Mira** | 25 | River wildlife surveyor | `0.60*af_nova + 0.40*af_nicole` | +1.0 st | 1.05 | 240 Hz | Triangle with chirp | *"Look there past the bank—three pups learning to rudder! Count every living thing before you count the season's yield."* |
| **Lark** | 38 | Wetland painter | `0.50*bm_lewis + 0.50*af_river` | -0.5 st | 0.88 | 165 Hz | Smooth sine-triangle | *"The mist sits on the current like a grey ribbon this morning; attention is the only gift the water asks of us."* |
| **Dara** | 30 | Outpost courier | `0.70*af_heart + 0.30*am_puck` | +0.5 st | 1.04 | 200 Hz | Rounded pulse | *"Pouch is sealed and the waystones are clear; trust is built one doorstep at a time, rain or shine."* |
| **Finn** | 23 | Canal apprentice | `0.70*am_eric + 0.30*af_alloy` | +0.5 st | 1.02 | 175 Hz | Clean triangle | *"I spotted a hairline seam along the third sluice plank—better we fix it while it’s a puddle than weep when it’s a breach."* |

---

### Detailed Character Profiles

#### 1. Caelum (Age 42 · Hydrologist & Canal Master)
- **Role & Personality**: Calm, measured, thoughtful; occasional river metaphors. Maintains Aqualia’s canal networks and water volume records.
- **Vocal Quality**: Grounded low-mid baritone with resonant, calm cadence. Speaks with quiet hydraulic precision.
- **Kokoro-82M Casting**: `0.70 * am_onyx + 0.30 * am_echo`
- **Prosody Settings**: Pitch offset `-1.0 st`, Speech rate `0.95`, Energy `0.50`.
- **In-Engine Blip Settings**:
  - Base Frequency: 125 Hz
  - Waveform: Low-pass filtered triangle (smooth water thrum)
  - Cadence: 135 ms syllable interval
  - Envelope: Attack 15 ms, Decay 95 ms
- **Sample Line**: *"The water belongs to the whole watershed, neighbor; haste won't make the sluice turn any smoother."*

#### 2. Marina (Age 19 · Reed Weaver & Diver)
- **Role & Personality**: Playful, friendly, candid about ambitions. Weaves baskets, dives for lost gear, longs to explore coastal reefs.
- **Vocal Quality**: Bright, clear, buoyant, quick-paced with lilting vocal inflection.
- **Kokoro-82M Casting**: `0.80 * af_sky + 0.20 * af_river`
- **Prosody Settings**: Pitch offset `+1.5 st`, Speech rate `1.08`, Energy `0.60`.
- **In-Engine Blip Settings**:
  - Base Frequency: 260 Hz
  - Waveform: Sine with light overtone (bright chime-like drop)
  - Cadence: 95 ms syllable interval
  - Envelope: Attack 5 ms, Decay 60 ms
- **Sample Line**: *"You can love the sound of your home reeds and still wonder what the wind tastes like past the reef."*

#### 3. Neris (Age 51 · Ferry Keeper)
- **Role & Personality**: Dry humor, careful listener, reliable in storms. Veteran river pilot of three generations; watchful over young travelers.
- **Vocal Quality**: Weathered, gravelly, dry chest tone with relaxed, laconic timing.
- **Kokoro-82M Casting**: `0.65 * bf_emma + 0.35 * am_fenrir`
- **Prosody Settings**: Pitch offset `-1.5 st`, Speech rate `0.92`, Energy `0.45`.
- **In-Engine Blip Settings**:
  - Base Frequency: 145 Hz
  - Waveform: Clipped saw/triangle filter (reed pole knocking wood)
  - Cadence: 140 ms syllable interval
  - Envelope: Attack 10 ms, Decay 100 ms
- **Sample Line**: *"River’s in no hurry to swallow your raft today, but a safe crossing is worth waiting ten beats for."*

#### 4. Reed (Age 28 · Grain Farmer)
- **Role & Personality**: Practical, optimistic, proud of modest improvements. Experiments with flood-tolerant grain varieties; values soil stewardship.
- **Vocal Quality**: Earthy, direct, open tenor/alto register with balanced, unpretentious rhythm.
- **Kokoro-82M Casting**: `0.50 * am_liam + 0.50 * af_bella`
- **Prosody Settings**: Pitch offset `0.0 st`, Speech rate `1.00`, Energy `0.50`.
- **In-Engine Blip Settings**:
  - Base Frequency: 180 Hz
  - Waveform: Soft low-pass square (percussive wooden grain tap)
  - Cadence: 110 ms syllable interval
  - Envelope: Attack 8 ms, Decay 75 ms
- **Sample Line**: *"Leave a furrow for the grazers and the soil remembers your kindness when the autumn floods roll in."*

#### 5. Willa (Age 33 · Wetland Herbalist)
- **Role & Personality**: Soft-spoken, exacting, quietly stubborn. Documents marsh flora; staunch defender of preserving natural wetland channels.
- **Vocal Quality**: Hushed, deliberate, breathy precision with crisp articulation and reflective pacing.
- **Kokoro-82M Casting**: `0.70 * af_aoede + 0.30 * af_kore`
- **Prosody Settings**: Pitch offset `+0.5 st`, Speech rate `0.90`, Energy `0.40`.
- **In-Engine Blip Settings**:
  - Base Frequency: 220 Hz
  - Waveform: Filtered hollow sine (reed pipe resonance)
  - Cadence: 125 ms syllable interval
  - Envelope: Attack 20 ms, Decay 80 ms
- **Sample Line**: *"Step lightly near the root hollows; a marsh is far more than unused mud waiting to be dried."*

#### 6. Oren (Age 57 · Waterwheel Builder)
- **Role & Personality**: Patient teacher, enjoys puzzles and terrible jokes. Master millwright who encourages apprentices to challenge designs.
- **Vocal Quality**: Warm, deep, rumbling elder baritone with humorous, chuckling cadence.
- **Kokoro-82M Casting**: `0.70 * bm_george + 0.30 * bm_fable`
- **Prosody Settings**: Pitch offset `-2.0 st`, Speech rate `0.94`, Energy `0.55`.
- **In-Engine Blip Settings**:
  - Base Frequency: 110 Hz
  - Waveform: Deep square-triangle blend (heavy mill cog clack)
  - Cadence: 145 ms syllable interval
  - Envelope: Attack 12 ms, Decay 110 ms
- **Sample Line**: *"If the axle doesn't squeak, how will you know it's turning? Now fetch the grease horn and let's check the teeth."*

#### 7. Mira (Age 25 · River Wildlife Surveyor)
- **Role & Personality**: Observant, enthusiastic about creatures, peaceful mediator. Tracks Rivallie colonies and wetland migration corridors.
- **Vocal Quality**: Dynamic, animated, alert, rising sentence endings, eager discovery tone.
- **Kokoro-82M Casting**: `0.60 * af_nova + 0.40 * af_nicole`
- **Prosody Settings**: Pitch offset `+1.0 st`, Speech rate `1.05`, Energy `0.60`.
- **In-Engine Blip Settings**:
  - Base Frequency: 240 Hz
  - Waveform: Triangle with subtle rising chirp (droplet / otter whistle)
  - Cadence: 100 ms syllable interval
  - Envelope: Attack 6 ms, Decay 65 ms
- **Sample Line**: *"Look there past the bank—three pups learning to rudder! Count every living thing before you count the season's yield."*

#### 8. Lark (Age 38 · Wetland Painter)
- **Role & Personality**: Dreamy, perceptive, surprisingly concise. Hosts quiet sketching sessions at dusk; listens deeply to the river.
- **Vocal Quality**: Melodic, tranquil, fluid phrasing with generous natural pauses.
- **Kokoro-82M Casting**: `0.50 * bm_lewis + 0.50 * af_river`
- **Prosody Settings**: Pitch offset `-0.5 st`, Speech rate `0.88`, Energy `0.40`.
- **In-Engine Blip Settings**:
  - Base Frequency: 165 Hz
  - Waveform: Smooth sine-triangle (brushstroke sustain)
  - Cadence: 130 ms syllable interval
  - Envelope: Attack 25 ms, Decay 100 ms
- **Sample Line**: *"The mist sits on the current like a grey ribbon this morning; attention is the only gift the water asks of us."*

#### 9. Dara (Age 30 · Outpost Courier)
- **Role & Personality**: Organized, kind, punctual, dependable. Connects distant wetland outposts, checks emergency waystations.
- **Vocal Quality**: Crisp, rhythmic, warm, confident, pacing like a steady walking stride.
- **Kokoro-82M Casting**: `0.70 * af_heart + 0.30 * am_puck`
- **Prosody Settings**: Pitch offset `+0.5 st`, Speech rate `1.04`, Energy `0.55`.
- **In-Engine Blip Settings**:
  - Base Frequency: 200 Hz
  - Waveform: Rounded pulse (wooden knocker / boot step cadence)
  - Cadence: 105 ms syllable interval
  - Envelope: Attack 8 ms, Decay 70 ms
- **Sample Line**: *"Pouch is sealed and the waystones are clear; trust is built one doorstep at a time, rain or shine."*

#### 10. Finn (Age 23 · Canal Apprentice)
- **Role & Personality**: Eager, thoughtful, self-conscious about mistakes. Works on sluice maintenance, studious and humble.
- **Vocal Quality**: Youthful, earnest, slightly breathy, careful, modest tenor tone.
- **Kokoro-82M Casting**: `0.70 * am_eric + 0.30 * af_alloy`
- **Prosody Settings**: Pitch offset `+0.5 st`, Speech rate `1.02`, Energy `0.50`.
- **In-Engine Blip Settings**:
  - Base Frequency: 175 Hz
  - Waveform: Clean triangle (light bronze wrench tap)
  - Cadence: 115 ms syllable interval
  - Envelope: Attack 10 ms, Decay 80 ms
- **Sample Line**: *"I spotted a hairline seam along the third sluice plank—better we fix it while it’s a puddle than weep when it’s a breach."*

## Impact

1. **Audio Engine / Codex**: Provides the definitive casting table for Kokoro-82M voice profile compilation and in-engine syllable blip synthesizer configurations.
2. **Dialogue Runtime (AGT-4.3 & AGT-4.4)**: Establishes base prosody parameters from which emotion transforms (warm, thoughtful, curious, concerned, amused, angry, sad, fearful) are calculated.
3. **No Breaking Changes**: Authored definitions reference existing villager identities in `src/content/villagers.ts` without modifying data structures before approval.
