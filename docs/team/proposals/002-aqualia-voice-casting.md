---
id: 002
author: communicator
rule: AGT-4.2
status: candidate (revised per directive 006 / proposal-002 changes-requested)
---

# Proposal 002: Aqualia Villager Voice Casting Sheet (Revision 2)

## Problem

Under doctrine **AGT-4.2**, voice profiles are authored rather than inferred. Gender must never be inferred from pronouns or names, and casting must be informed strictly by age, role, and personality. The Director must approve a voice casting sheet with one sample line per villager before voiced dialogue or blip synthesis ships.

In review record `docs/team/comms/director/approvals/proposal-002.md`, the Director requested revisions to eliminate pronoun-inferred voice assignments, remove all gender or pronoun references from casting rationales, align personality profiles with canonical `src/content/villagers.ts` definitions (specifically correcting Mira, Dara, and Finn), and record the voice library version.

## Kokoro Model & Voice Reference

All voice identifiers are drawn from the **Kokoro-82M v0.19 / v1.0** official model checkpoint library:

- American English timbres: `af_alloy`, `af_aoede`, `af_bella`, `af_heart`, `af_jessica`, `af_kore`, `af_nicole`, `af_nova`, `af_river`, `af_sarah`, `af_sky`, `am_adam`, `am_echo`, `am_eric`, `am_fenrir`, `am_liam`, `am_michael`, `am_onyx`, `am_puck`.
- British English timbres: `bf_alice`, `bf_emma`, `bf_isabella`, `bf_lily`, `bm_daniel`, `bm_fable`, `bm_george`, `bm_lewis`.

Voice blends are constructed through acoustic linear interpolation (e.g., `0.65 * voice_a + 0.35 * voice_b`) to achieve targeted age texture, vocal weight, and role resonance without regard to character pronouns.

---

## Proposed Text

Adopt the following authored voice casting records for the 10 Aqualia villagers into `src/content/villagers.ts` and audio engine configurations:

### Summary Table

| Villager   | Age | Role                       | Engine Voice Blend (Kokoro-82M)  | Pitch Offset | Speech Rate | Blip Pitch | Blip Waveform         | Sample Line                                                                                                                   |
| :--------- | :-- | :------------------------- | :------------------------------- | :----------- | :---------- | :--------- | :-------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| **Caelum** | 42  | Hydrologist & canal master | `0.65*am_onyx + 0.35*bf_emma`    | -1.0 st      | 0.95        | 125 Hz     | Filtered triangle     | _"The water belongs to the whole watershed, neighbor; haste won't make the sluice turn any smoother."_                        |
| **Marina** | 19  | Reed weaver & diver        | `0.70*af_sky + 0.30*am_puck`     | +1.5 st      | 1.08        | 260 Hz     | Sine / light overtone | _"You can love the sound of your home reeds and still wonder what the wind tastes like past the reef."_                       |
| **Neris**  | 51  | Ferry keeper               | `0.60*bm_george + 0.40*af_bella` | -1.5 st      | 0.92        | 145 Hz     | Clipped reed saw      | _"River’s in no hurry to swallow your raft today, but a safe crossing is worth waiting ten beats for."_                       |
| **Reed**   | 28  | Grain farmer               | `0.55*af_heart + 0.45*am_eric`   | 0.0 st       | 1.00        | 180 Hz     | Soft low-pass square  | _"Leave a furrow for the grazers and the soil remembers your kindness when the autumn floods roll in."_                       |
| **Willa**  | 33  | Wetland herbalist          | `0.70*af_aoede + 0.30*bm_lewis`  | +0.5 st      | 0.90        | 220 Hz     | Filtered hollow sine  | _"Step lightly near the root hollows; a marsh is far more than unused mud waiting to be dried."_                              |
| **Oren**   | 57  | Waterwheel builder         | `0.75*bm_fable + 0.25*am_fenrir` | -2.0 st      | 0.94        | 110 Hz     | Deep square-triangle  | _"If the axle doesn't squeak, how will you know it's turning? Now fetch the grease horn and let's check the teeth."_          |
| **Mira**   | 25  | River wildlife surveyor    | `0.65*am_echo + 0.35*af_nova`    | +1.0 st      | 1.05        | 240 Hz     | Triangle with chirp   | _"Look there past the bank—three pups learning to rudder! Count every living thing before you count the season's yield."_     |
| **Lark**   | 38  | Wetland painter            | `0.50*af_river + 0.50*bm_lewis`  | -0.5 st      | 0.88        | 165 Hz     | Smooth sine-triangle  | _"The mist sits on the current like a grey ribbon this morning; attention is the only gift the water asks of us."_            |
| **Dara**   | 30  | Outpost courier            | `0.60*am_liam + 0.40*af_alloy`   | +0.5 st      | 1.04        | 200 Hz     | Rounded pulse         | _"Pouch is sealed and the waystones are clear; trust is built one doorstep at a time, rain or shine."_                        |
| **Finn**   | 23  | Canal apprentice           | `0.65*af_kore + 0.35*am_adam`    | +0.5 st      | 1.02        | 175 Hz     | Clean triangle        | _"I spotted a hairline seam along the third sluice plank—better we fix it while it’s a puddle than weep when it’s a breach."_ |

---

### Detailed Character Profiles & Rationales

#### 1. Caelum (Age 42 · Hydrologist & Canal Master)

- **Role & Personality**: Calm, measured, thoughtful; occasional river metaphors. Maintains canal sluices and coordinates regional water runoff measurements.
- **Casting Rationale**: Mature hydrology overseer whose deliberate water management demands an unhurried, measured baritone with resonant acoustic weight.
- **Kokoro-82M Casting**: `0.65 * am_onyx + 0.35 * bf_emma`
- **Prosody Settings**: Pitch offset `-1.0 st`, Speech rate `0.95`, Energy `0.50`.
- **In-Engine Blip Settings**:
  - Base Frequency: 125 Hz
  - Waveform: Low-pass filtered triangle (smooth water thrum)
  - Cadence: 135 ms syllable interval
  - Envelope: Attack 15 ms, Decay 95 ms
- **Sample Line**: _"The water belongs to the whole watershed, neighbor; haste won't make the sluice turn any smoother."_

#### 2. Marina (Age 19 · Reed Weaver & Diver)

- **Role & Personality**: Playful, friendly, candid about ambitions. Weaves baskets, dives for lost tools, dreams of coastal exploration.
- **Casting Rationale**: Young, agile wetland diver whose curious exploration and weaving craft call for a buoyant, high-energy tenor/soprano blend with rapid cadence.
- **Kokoro-82M Casting**: `0.70 * af_sky + 0.30 * am_puck`
- **Prosody Settings**: Pitch offset `+1.5 st`, Speech rate `1.08`, Energy `0.60`.
- **In-Engine Blip Settings**:
  - Base Frequency: 260 Hz
  - Waveform: Sine with light overtone (bright chime-like drop)
  - Cadence: 95 ms syllable interval
  - Envelope: Attack 5 ms, Decay 60 ms
- **Sample Line**: _"You can love the sound of your home reeds and still wonder what the wind tastes like past the reef."_

#### 3. Neris (Age 51 · Ferry Keeper)

- **Role & Personality**: Dry humor, careful listener, reliable in storms. Three generations of river ferry experience; vigilant guardian of young travelers.
- **Casting Rationale**: Weathered river pilot with fifty years of flood experience whose steady vigilance requires a rasping, low-register chest tone and dry, laconic pacing.
- **Kokoro-82M Casting**: `0.60 * bm_george + 0.40 * af_bella`
- **Prosody Settings**: Pitch offset `-1.5 st`, Speech rate `0.92`, Energy `0.45`.
- **In-Engine Blip Settings**:
  - Base Frequency: 145 Hz
  - Waveform: Clipped saw/triangle filter (reed pole knocking wood)
  - Cadence: 140 ms syllable interval
  - Envelope: Attack 10 ms, Decay 100 ms
- **Sample Line**: _"River’s in no hurry to swallow your raft today, but a safe crossing is worth waiting ten beats for."_

#### 4. Reed (Age 28 · Grain Farmer)

- **Role & Personality**: Practical, optimistic, proud of modest improvements. Experiments with flood-tolerant crops near Reedhaven; values shared soil inheritance.
- **Casting Rationale**: Practical agricultural steward whose experimental flood-crop cultivation suggests an earthy, centered vocal weight with unadorned, balanced cadence.
- **Kokoro-82M Casting**: `0.55 * af_heart + 0.45 * am_eric`
- **Prosody Settings**: Pitch offset `0.0 st`, Speech rate `1.00`, Energy `0.50`.
- **In-Engine Blip Settings**:
  - Base Frequency: 180 Hz
  - Waveform: Soft low-pass square (percussive wooden grain tap)
  - Cadence: 110 ms syllable interval
  - Envelope: Attack 8 ms, Decay 75 ms
- **Sample Line**: _"Leave a furrow for the grazers and the soil remembers your kindness when the autumn floods roll in."_

#### 5. Willa (Age 33 · Wetland Herbalist)

- **Role & Personality**: Soft-spoken, exacting, quietly stubborn. Catalogs swamp flora and fauna; staunch defender of preserving wetland habitats over drainage.
- **Casting Rationale**: Exact swamp botanist whose meticulous field observations require a hushed, contemplative tone with crisp, quiet articulation.
- **Kokoro-82M Casting**: `0.70 * af_aoede + 0.30 * bm_lewis`
- **Prosody Settings**: Pitch offset `+0.5 st`, Speech rate `0.90`, Energy `0.40`.
- **In-Engine Blip Settings**:
  - Base Frequency: 220 Hz
  - Waveform: Filtered hollow sine (reed pipe resonance)
  - Cadence: 125 ms syllable interval
  - Envelope: Attack 20 ms, Decay 80 ms
- **Sample Line**: _"Step lightly near the root hollows; a marsh is far more than unused mud waiting to be dried."_

#### 6. Oren (Age 57 · Waterwheel Builder)

- **Role & Personality**: Patient teacher, enjoys puzzles and terrible jokes. Master millwright who encourages apprentices to challenge designs and innovate.
- **Casting Rationale**: Senior millwright and mentor whose affection for mechanical puzzles and bad puns calls for a deep, rumbling resonance with warm, chuckling timing.
- **Kokoro-82M Casting**: `0.75 * bm_fable + 0.25 * am_fenrir`
- **Prosody Settings**: Pitch offset `-2.0 st`, Speech rate `0.94`, Energy `0.55`.
- **In-Engine Blip Settings**:
  - Base Frequency: 110 Hz
  - Waveform: Deep square-triangle blend (heavy mill cog clack)
  - Cadence: 145 ms syllable interval
  - Envelope: Attack 12 ms, Decay 110 ms
- **Sample Line**: _"If the axle doesn't squeak, how will you know it's turning? Now fetch the grease horn and let's check the teeth."_

#### 7. Mira (Age 25 · River Wildlife Surveyor)

- **Role & Personality**: Observant, enthusiastic about creatures, dislikes needless fighting. Records Rivallie herds and nesting grounds; coordinates regional surveys.
- **Casting Rationale**: Keen wildlife observer tracking river fauna whose field enthusiasm and avoidance of combat call for an animated, alert timbre with upward inflection.
- **Kokoro-82M Casting**: `0.65 * am_echo + 0.35 * af_nova`
- **Prosody Settings**: Pitch offset `+1.0 st`, Speech rate `1.05`, Energy `0.60`.
- **In-Engine Blip Settings**:
  - Base Frequency: 240 Hz
  - Waveform: Triangle with subtle rising chirp (droplet / otter whistle)
  - Cadence: 100 ms syllable interval
  - Envelope: Attack 6 ms, Decay 65 ms
- **Sample Line**: _"Look there past the bank—three pups learning to rudder! Count every living thing before you count the season's yield."_

#### 8. Lark (Age 38 · Wetland Painter)

- **Role & Personality**: Dreamy, perceptive, surprisingly concise. Paints the same river bend every season; hosts quiet sketching sessions at dusk.
- **Casting Rationale**: Perceptive landscape artist whose seasonal waterside studies require a tranquil, melodic vocal texture with generous, unhurried pauses.
- **Kokoro-82M Casting**: `0.50 * af_river + 0.50 * bm_lewis`
- **Prosody Settings**: Pitch offset `-0.5 st`, Speech rate `0.88`, Energy `0.40`.
- **In-Engine Blip Settings**:
  - Base Frequency: 165 Hz
  - Waveform: Smooth sine-triangle (brushstroke sustain)
  - Cadence: 130 ms syllable interval
  - Envelope: Attack 25 ms, Decay 100 ms
- **Sample Line**: _"The mist sits on the current like a grey ribbon this morning; attention is the only gift the water asks of us."_

#### 9. Dara (Age 30 · Outpost Courier)

- **Role & Personality**: Organized, kind, remembers small promises. Connects Reedhaven and Tidecross to Aqualia; inspects storm shelters along routes.
- **Casting Rationale**: Organized overland dispatch runner whose punctual deliveries and storm inspections call for a brisk, rhythmic, warm projection with confident pacing.
- **Kokoro-82M Casting**: `0.60 * am_liam + 0.40 * af_alloy`
- **Prosody Settings**: Pitch offset `+0.5 st`, Speech rate `1.04`, Energy `0.55`.
- **In-Engine Blip Settings**:
  - Base Frequency: 200 Hz
  - Waveform: Rounded pulse (wooden knocker / boot step cadence)
  - Cadence: 105 ms syllable interval
  - Envelope: Attack 8 ms, Decay 70 ms
- **Sample Line**: _"Pouch is sealed and the waystones are clear; trust is built one doorstep at a time, rain or shine."_

#### 10. Finn (Age 23 · Canal Apprentice)

- **Role & Personality**: Eager, thoughtful, embarrassed by praise. Studies under Caelum and Oren; repairs sluices and learns to address problems early.
- **Casting Rationale**: Thoughtful engineering apprentice whose earnest diligence and humility when praised call for an open, slightly breathy youthful register with careful diction.
- **Kokoro-82M Casting**: `0.65 * af_kore + 0.35 * am_adam`
- **Prosody Settings**: Pitch offset `+0.5 st`, Speech rate `1.02`, Energy `0.50`.
- **In-Engine Blip Settings**:
  - Base Frequency: 175 Hz
  - Waveform: Clean triangle (light bronze wrench tap)
  - Cadence: 115 ms syllable interval
  - Envelope: Attack 10 ms, Decay 80 ms
- **Sample Line**: _"I spotted a hairline seam along the third sluice plank—better we fix it while it’s a puddle than weep when it’s a breach."_

---

## Impact

1. **Doctrine Compliance (AGT-4.2)**: Completely removes pronoun and name inferences from casting. All rationales are strictly grounded in age, role, and personality without referencing gender.
2. **Personality Alignment**: Re-anchors Mira, Dara, and Finn strictly to canonical identities defined in `src/content/villagers.ts`.
3. **Audio Synthesis Architecture**: Provides the definitive casting table for Kokoro-82M (v0.19 / v1.0) and procedural syllable blip parameters for Codex audio integration.
