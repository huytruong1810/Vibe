# 06 — Creatures and progression

Pokémon (REF-3) gives the **depth** of creature stats. Stardew (REF-4) gives the
**driver**: creatures grow through how you care for them, not through grinding.
The existing rules stay in force: one bonded partner, the five needs, the
wellbeing multiplier, wildness, base HP, level and XP never shrinking, and
predation relationships. This doc adds a stat layer on top.

Status: **design direction.** The stat model below is the target for T0/T1.
Formulas are starting points; engineering owns the final maths and balance.

## CRE-1 Design intent

A player who loves creature games should be able to theorycraft a partner. A
player who never opens a stat screen should still see their partner become
visibly stronger and happier because they cared for it.

## CRE-2 Six stats

| Stat       | Abbrev | Role                                              | Exists today    |
| ---------- | ------ | ------------------------------------------------- | --------------- |
| Vitality   | HP     | Max HP                                            | yes (`hp`)      |
| Might      | ATK    | Physical strike damage                            | yes (`attack`)  |
| Guard      | DEF    | Physical damage taken                             | yes (`defense`) |
| Attunement | ELM    | Element move damage and terrain-reaction strength | **new**         |
| Resonance  | RES    | Element damage taken                              | **new**         |
| Swiftness  | SPD    | Move speed and attack cadence                     | yes (`speed`)   |

Each species has six **base stats** that define its identity: Steamshell is a
Guard/Resonance wall, Bramblefang a Might/Swiftness hunter, Cindermoth a fragile
Attunement striker. Base stat totals are within ±10% across species so no species
is strictly better.

## CRE-3 Individual variation: Potential and Conditioning

- **CRE-3.1 Potential (IV analogue):** each individual rolls 0–15 per stat at
  birth, from the deterministic world seed. Potential is hidden at first and
  revealed one stat at a time as bond hearts rise (CRE-6.2), so getting to know
  your creature is literal.
- **CRE-3.2 Conditioning (EV analogue):** earned through **care activities**,
  not kills. Total cap 120 points, at most 40 per stat:

| Care activity                                                                | Conditions                |
| ---------------------------------------------------------------------------- | ------------------------- |
| Walking together (distance)                                                  | Swiftness                 |
| Play and recreation                                                          | Might                     |
| Feeding preferred diet foods                                                 | Vitality                  |
| Bathing in the species' bath type                                            | Resonance                 |
| Sparring or agreed duels                                                     | Guard (and Might on wins) |
| Element exposure (swimming, warm forges, windy ridges, matching the element) | Attunement                |

- **CRE-3.3 Suggested formula** (Pokémon-shaped, for engineering to tune):
  `stat = floor((2·base + potential + floor(cond/4)) · level / 100) + 5`, and
  for Vitality `+ level + 10` instead of `+ 5`. Then multiply by the existing
  wellbeing combat multiplier. Base HP never shrinking still holds:
  conditioning and potential only add.

## CRE-4 Temperament (nature analogue)

- **CRE-4.1** Each individual has one of 15 temperaments: +10% to one stat,
  −10% to another (or neutral). Each temperament also names a **favourite care
  activity** that fills the recreation need 50% faster and a **disliked** one.
  This links stats to the Stardew-style care loop.
- **CRE-4.2** Temperament also flavours idle animation choice and the
  creature's lines when villagers talk about it.
- **CRE-4.3** Naming: the existing behaviour system called "Nature" (Passive,
  Neutral, Hostile; retaliation, territorial, hunting) stays as it is
  internally, but its **player-facing label becomes "Disposition"**, so
  players who know Pokémon don't confuse it with temperament.

## CRE-5 Moves

- **CRE-5.1** A partner equips **4 moves**: one basic strike, one element
  move, two flexible slots. Moves are learned by level and at bond milestones.
- **CRE-5.2** Each move has an element, power, cadence (windup, active,
  recovery), an optional effect (knockback, soak, burn, gust, guard break) and a
  terrain reaction where relevant. Dual-element species can learn moves of
  both elements.
- **CRE-5.3** Each move is a combat clip for art (contract `attack` row: 12
  frames per move per facing). Moves that share an animation archetype
  (lunge, spit, slam, flutter) reuse clips with different VFX. Every new move does
  **not** need new body animation.

## CRE-6 Bond

- **CRE-6.1** Bond has 10 hearts, raised by care, time together and shared
  victories, and lowered by neglect (wildness rules unchanged).
- **CRE-6.2** Milestones: 2 hearts → first potential revealed; every 2 hearts
  after → another; 6 hearts → third move slot unlock; 8 hearts → companion
  command (CMB-7); 10 hearts → ascension eligible.
- **CRE-6.3 Ascension (T2):** at 10 hearts, level 20+ and sufficient element
  exposure, a partner can ascend to a second form: new art, a stat redistribution,
  a signature move. T2 only, because it doubles creature art cost.

## CRE-7 Wild individuals

Wild creatures have potential and temperament too. Inspecting one shows species
base stats, temperament (after 3 seconds of observation) and an estimated
"promise" rating. This makes choosing a partner meaningful without a catch loop.

## Engineering mandates

| ID     | Mandate                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------- |
| CRE-M1 | Add Attunement and Resonance base stats to species definitions; keep the existing four.                             |
| CRE-M2 | Per-individual potential (seeded, deterministic) and conditioning ledger with caps; care events award conditioning. |
| CRE-M3 | Temperament with stat modifiers and favourite/disliked care activity.                                               |
| CRE-M4 | Four-slot move loadout per partner, learnable by level and bond milestone.                                          |
| CRE-M5 | Player-facing rename of behavioural "Nature" to "Disposition". Internal identifiers may stay.                       |
| CRE-M6 | Save migration for all of the above (save version bump per existing policy).                                        |
