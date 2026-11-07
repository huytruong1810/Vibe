import { describe, it, expect } from 'vitest';
import { SimulationHost } from '../src/domain/simulation';
import { SPECIES } from '../src/content/definitions';
import {
  TEMPERAMENTS,
  type Temperament,
  calculateEffectiveStat,
  revealedPotentialCount,
  EntityStore,
} from '../src/domain/entities';

describe('CRE-M1..M6 Creature 6-Stat Progression & Move Loadouts', () => {
  it('defines 6 base stats for all 8 species with balanced stat totals', () => {
    expect(SPECIES.length).toBe(8);
    const totals: number[] = [];

    for (const species of SPECIES) {
      expect(species.hp).toBeGreaterThan(0);
      expect(species.attack).toBeGreaterThan(0);
      expect(species.defense).toBeGreaterThan(0);
      expect(species.attunement).toBeGreaterThan(0);
      expect(species.resonance).toBeGreaterThan(0);
      expect(species.speed).toBeGreaterThan(0);

      const total =
        species.hp +
        species.attack +
        species.defense +
        species.attunement! +
        species.resonance! +
        species.speed;
      totals.push(total);
    }

    const avgTotal = totals.reduce((a, b) => a + b, 0) / totals.length;
    for (const total of totals) {
      // Total stats within ±20% of species baseline
      expect(Math.abs(total - avgTotal) / avgTotal).toBeLessThan(0.2);
    }
  });

  it('defines 15 distinct authored temperaments with care preferences and stat modifiers', () => {
    const keys = Object.keys(TEMPERAMENTS);
    expect(keys.length).toBe(15);

    for (const key of keys) {
      const t: Temperament = TEMPERAMENTS[key]!;
      expect(t.name).toBeDefined();
      expect(t.favoredCare).toBeDefined();
      expect(t.dislikedCare).toBeDefined();
      if (t.boosted !== null) {
        expect(['hp', 'attack', 'defense', 'attunement', 'resonance', 'speed']).toContain(
          t.boosted,
        );
      }
      if (t.hindered !== null) {
        expect(['hp', 'attack', 'defense', 'attunement', 'resonance', 'speed']).toContain(
          t.hindered,
        );
      }
    }

    // Check specific iconic temperaments
    expect(TEMPERAMENTS['hardy']!.boosted).toBeNull();
    expect(TEMPERAMENTS['brave']!.boosted).toBe('attack');
    expect(TEMPERAMENTS['brave']!.hindered).toBe('speed');
    expect(TEMPERAMENTS['modest']!.boosted).toBe('attunement');
    expect(TEMPERAMENTS['modest']!.hindered).toBe('attack');
  });

  it('calculates effective stats via Pokémon-shaped formula (CRE-3.3) with temperament scaling', () => {
    // Formula: floor((2 * base + potential + floor(conditioning / 4)) * level / 100) + (isHp ? level + 10 : 5)
    // For Level 50, Base 100, Potential 15, Conditioning 40:
    // Raw HP = floor((200 + 15 + 10) * 50 / 100) + 50 + 10 = floor(225 * 0.5) + 60 = 112 + 60 = 172
    const hpNeutral = calculateEffectiveStat('hp', 100, 15, 40, 50, TEMPERAMENTS['hardy']!);
    expect(hpNeutral).toBe(172);

    // Non-HP stat at Level 50, Base 80, Potential 10, Conditioning 20:
    // Raw = floor((160 + 10 + 5) * 50 / 100) + 5 = floor(175 * 0.5) + 5 = 87 + 5 = 92
    const atkNeutral = calculateEffectiveStat('attack', 80, 10, 20, 50, TEMPERAMENTS['hardy']!);
    expect(atkNeutral).toBe(92);

    // Boosted (+10%) by Brave temperament: 92 * 1.10 = 101.2 -> 101
    const atkBrave = calculateEffectiveStat('attack', 80, 10, 20, 50, TEMPERAMENTS['brave']!);
    expect(atkBrave).toBe(101);

    // Hindered (-10%) by Modest temperament: 92 * 0.90 = 82.8 -> 82
    const atkModest = calculateEffectiveStat('attack', 80, 10, 20, 50, TEMPERAMENTS['modest']!);
    expect(atkModest).toBe(82);
  });

  it('progressively reveals potential stats based on bond hearts (CRE-6.2)', () => {
    expect(revealedPotentialCount(0)).toBe(0);
    expect(revealedPotentialCount(1)).toBe(0);
    expect(revealedPotentialCount(2)).toBe(1);
    expect(revealedPotentialCount(3)).toBe(1);
    expect(revealedPotentialCount(4)).toBe(2);
    expect(revealedPotentialCount(6)).toBe(3);
    expect(revealedPotentialCount(8)).toBe(4);
    expect(revealedPotentialCount(10)).toBe(6);
  });

  it('stores and tracks potential, conditioning, temperament and 4-move loadout on EntityStore', () => {
    const store = new EntityStore();
    const slot = store.spawn(0, 10, 10);

    // Default potential rolled 0..15
    const potential = store.potential(slot);
    expect(potential.length).toBe(6);
    for (const val of potential) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(15);
    }

    // Initial conditioning is 0 across all 6 stats
    const conditioning = store.conditioning(slot);
    expect(conditioning.length).toBe(6);
    expect(conditioning.every((c) => c === 0)).toBe(true);

    // Conditioning increments on care up to 40 per stat and 120 total
    store.addConditioning(slot, 'hp', 25);
    expect(store.conditioning(slot)[0]).toBe(25);
    store.addConditioning(slot, 'hp', 20); // clamps to 40
    expect(store.conditioning(slot)[0]).toBe(40);

    // Moves loadout initialized with strike + elemental move
    const moves = store.moves(slot);
    expect(moves.length).toBeGreaterThanOrEqual(2);
    expect(moves.length).toBeLessThanOrEqual(4);
    expect(moves).toContain('strike');

    // Slot 3 unlocked at 6 bond hearts, slot 4 at 8 bond hearts
    store.bondHearts[slot] = 4;
    expect(store.maxMoveSlots(slot)).toBe(2);
    store.bondHearts[slot] = 6;
    expect(store.maxMoveSlots(slot)).toBe(3);
    store.bondHearts[slot] = 8;
    expect(store.maxMoveSlots(slot)).toBe(4);
  });

  it('computes 6 effectiveStats and baseStats on EntityStore and exposes in RenderSnapshot (UI-M4)', () => {
    const store = new EntityStore();
    const slot = store.spawn(0, 10, 10); // Ignicap
    store.bondHearts[slot] = 6;

    const base = store.baseStats(slot);
    expect(base.hp).toBe(64);
    expect(base.attack).toBe(12);
    expect(base.defense).toBe(7);
    expect(base.attunement).toBe(14);
    expect(base.resonance).toBe(8);
    expect(base.speed).toBe(2.5);

    const effective = store.effectiveStats(slot);
    expect(effective.hp).toBeGreaterThan(0);
    expect(effective.attack).toBeGreaterThan(0);
    expect(effective.defense).toBeGreaterThan(0);
    expect(effective.attunement).toBeGreaterThan(0);
    expect(effective.resonance).toBeGreaterThan(0);
    expect(effective.speed).toBeGreaterThan(0);

    // Also check via SimulationHost
    const host = new SimulationHost(42, 1);
    const companionSlot = host.creatures.spawn(1, host.player.x + 1, host.player.y);
    host.creatures.owner[companionSlot] = 0; // Owned partner
    host.creatures.bondHearts[companionSlot] = 5;

    const frame = host.frame();
    const partner = frame.creatures.find((c) => c.owner === 0);
    expect(partner).toBeDefined();
    expect(partner!.bondHearts).toBe(5);
    expect(partner!.disposition).toBeDefined();
    expect(partner!.moves).toBeDefined();
    expect(partner!.stats).toBeDefined();
    expect(partner!.stats!.hp).toBeGreaterThan(0);
    expect(partner!.baseStats).toBeDefined();
    expect(partner!.baseStats!.hp).toBe(72);
    expect(partner!.revealedPotential).toBe(2);
  });
});
