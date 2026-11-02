# Physical presence

Every living entity owns durable `heightMeters` and `massKg`. Weight in the interface means mass in kilograms; gravity is constant. [PhysiquePolicy](../../src/domain/physique.ts) owns the calculations and [EntityStore](../../src/domain/entities.ts) owns validated numeric columns. All three controllers share these rules.

Species stats already express different anatomy. Absolute kilograms must not multiply those stats again. Instead, individual builds modify their species baseline through bounded ratios. Let `h = height / baseline height` and `m = mass / baseline mass`:

| Effect                     | Formula                                   | Bounds        |
| -------------------------- | ----------------------------------------- | ------------- |
| Movement factor            | `sqrt(h) / cbrt(m)`                       | 0.8–1.15      |
| Attack contribution factor | `m^0.2 × h^0.1`                           | 0.85–1.2      |
| Base defense factor        | `m^0.15`                                  | 0.9–1.15      |
| Cosmetic stride            | `0.88 × height` tiles/cycle               | 0.25–2.5      |
| Target impact velocity     | `1.5 × sqrt(attacker mass / target mass)` | 0.3–3 tiles/s |

Guard multiplies impact velocity by 0.45. The attacker receives smaller opposite recoil, capped at 0.5 tiles/s. Accumulated components are capped at ±4 tiles/s and decay by `exp(-12 × dt)`. Collision-constrained movement applies recoil each simulation tick. Earned XP and base maximum HP remain unchanged. Wellbeing and equipment still apply, with the existing player movement floor.

These are authored balance parameters, not biomechanical predictions. Validation permits heights 0.1–4 m and masses 0.2–1000 kg. Defaults live in `PHYSIQUES`; `setPhysique` validates future authored/customized input. Humans currently share the human baseline unless explicitly authored otherwise. No physique is inferred from gender, pronouns or names.

## Presentation

[Motion feedback](../../src/presentation/motion-feedback.ts) never changes simulation state.

- Camera shake consumes deduplicated committed hits within six tiles, emphasizing player impacts. At most eight impulses contribute, capped at six horizontal and four vertical reference pixels. Its nine-tick envelope follows simulation presentation time: pause freezes it. Terrain, actors, effects, lighting and picking share the displayed camera offset. DOM overlays remain still.
- Grounded walk/run contacts use confirmed travelled distance and height-based stride. Beach, mud and snowy outdoor surfaces receive mass-sized prints within 2–7 pixels. Stationary actors, fliers and teleport discontinuities do not stamp. At most 192 cosmetic marks fade over 180 ticks; they never affect navigation or resources.
- Mud adds a small distance-driven lean scaled by height relative to the cube root of mass. Authored limb animation remains responsible for walking. This does not replace missing poses or directions.
- Reduced motion disables shake, lean and visible footprints. Low quality suppresses optional decals. Gameplay recoil and essential attack/guard feedback remain unchanged.

Height does not stretch approved sprites or silently resize collision footprints. Doorway clearance, ragdolls, garment weight, growth and encumbrance require separate navigation/economy rules and are not inferred from these values.

## Persistence and checks

The in-progress v4 contract persists physique and residual recoil. v2/v3 migrations and earlier development v4 checkpoints receive species defaults with zero recoil, at authoritative float32 precision. Invalid dimensions and unbounded/non-finite impulses are rejected.

[Tests](../../tests/physique.test.ts) cover bounded formulas, actual movement, protected progression, migration, restore, reduced motion, pause-stable shake and bounded footprints. Behavioral/browser checks and the seasonal soak must run after physical simulation changes. Earlier measurements do not qualify this revision.
