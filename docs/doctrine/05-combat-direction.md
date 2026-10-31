# 05 — Combat direction

Human combat follows Zenonia 4 (REF-2): combo-driven melee, class-identity skills,
crowd fights, loud feedback. Readability and fairness come from CrossCode (REF-8)
and Hyper Light Drifter (REF-10). The simulation stays authoritative and
deterministic. Everything "feel"-related here is presentation unless a rule says
otherwise.

## CMB-1 Inputs and verbs (unchanged controls)

**J** strike · **K** origin element skill · **Space** dash · **1/2** use hand
item. Basic combat is innate; tools occupy hands; origin bonuses are passive
(existing rules).

## CMB-2 The strike combo (Zenonia chain)

- **CMB-2.1** (T1 proposal) J chains up to **3 hits** when pressed within each hit's
  recovery window: hit 1 a quick jab, hit 2 a wider sweep, hit 3 a heavier finisher
  with knockback. Missing the window resets to hit 1.
- **CMB-2.2** Each hit is a separate authoritative move phase (windup, active,
  recovery). Presentation uses one 12-frame strike clip per hit variant, with
  ranges mapped to those phases (ART-9.5).
- **CMB-2.3** Movement input during recovery steers the next hit's direction
  (8-way). Dash can cancel the recovery of hits 1 and 2, but not hit 3.

## CMB-3 Timing (engineering move registry, 30 Hz)

| Move                                            | Windup / active / recovery ticks | Art clip                                            |
| ----------------------------------------------- | -------------------------------- | --------------------------------------------------- |
| Innate strike                                   | 4 / 2 / 9                        | `strike`, 12 frames × 8 facings                     |
| Element                                         | 7 / 3 / 16                       | `element`, 12 × 8                                   |
| Sword slash (humans)                            | 6 / 3 / 12                       | `sword_slash`, 12 × 8                               |
| Spear thrust (humans)                           | 8 / 2 / 14                       | `spear_thrust`, 12 × 8                              |
| Bow shot (humans; left hand holds, right draws) | 12 / 1 / 12                      | `bow_shot`, 12 × 8; arrows have separate flight art |

The registry is authoritative and engineering tunes it. Twelve art frames don't
mean twelve ticks: art maps onto the registry's exclusive-end phase ranges. Pose
anticipation on windup frames, the clearest silhouette on the first active frame,
and follow-through over recovery. The 3-hit chain in CMB-2 is a T1 proposal
layered on these moves (each chain hit reuses a registry move with its own clip
variant).

## CMB-4 Telegraphs and fairness

- **CMB-4.1** Every enemy attack that can deal more than 15% of the player's
  max HP has a world-space telegraph (ground marking, glint or body flash) that
  starts no later than the start of its windup.
- **CMB-4.2** Predators telegraph with a crouch-and-shiver pose (ART-10).
- **CMB-4.3** VFX and damage numbers never cover a telegraph (ART-12.3).

## CMB-5 Origin skills and skill trees

- **CMB-5.1** K uses the player's origin element: Aqualia **water**, Pyrador
  **fire**, Zephyria **wind**. The existing terrain reactions (soaking, burning,
  gusting) are part of the skill's identity.
- **CMB-5.2** Each origin gets a skill tree with **3 branches** (proposal for
  T1): **Edge** (melee augment), **Tide/Flame/Gale** (ranged or area element),
  **Ward** (defensive or support, including companion synergy). Points come from
  level-ups. One active skill slot in T0; up to three slots in T1.
- **CMB-5.3** The element triangle stays: water > fire > wind > water,
  multipliers 1.5 / 1 / 0.75 (existing rule).

## CMB-6 Hit feel (presentation)

- **CMB-6.1 Hit-stop:** on a confirmed hit the renderer freezes both actors'
  poses for 2 frames (jab), 3 (sweep) or 4 (finisher or crit). It must not delay
  simulation ticks: it is a visual hold that later catches up by skipping
  display frames, so determinism is untouched.
- **CMB-6.2 Flash:** the target sprite shows a 1-frame white silhouette (the
  palette's `highlight` of `outline-neutral`), then a 2-frame red tint on damage.
- **CMB-6.3 Knockback:** the finisher and strong element hits push targets back
  as authoritative movement; art shows a dedicated `hit` clip.
- **CMB-6.4 Screen shake:** at most 2 art px, finisher and crits only, disabled
  by reduced motion.
- **CMB-6.5 Sound:** every hit layers a whoosh (windup), an impact keyed to
  material (flesh, shell, wood, stone) and an element tail.

## CMB-7 Companion in combat

The partner fights in real time beside the player using its equipped moves
(CRE-5) and its wellbeing multiplier. The player can give one contextual command
(focus target, regroup). Commands are a T1 proposal.

## CMB-8 Defeat and recovery

Humans and bonded companions are downed and recover (existing rule). Downed and
recovery clips must read as clearly different from death. Carrion art is a
separate, non-animated environment state (existing contract).

## Engineering mandates

| ID     | Mandate                                                                                    |
| ------ | ------------------------------------------------------------------------------------------ |
| CMB-M1 | A 3-hit strike chain with per-hit move phases and input buffering inside recovery windows. |
| CMB-M2 | Dash cancel windows on hits 1 and 2.                                                       |
| CMB-M3 | Presentation-only hit-stop that never alters simulation tick timing.                       |
| CMB-M4 | Telegraph cues for qualifying enemy attacks, emitted at windup start.                      |
| CMB-M5 | Hit cues carry element, effectiveness, material and crit flags for VFX, UI and audio.      |
