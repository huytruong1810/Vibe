import { describe, it, expect } from 'vitest';
import {
  SPECIES_LEARNABLE_MOVES,
  learnableMovesForSpecies,
  CREATURES,
  type SpeciesId,
} from '../src/content/definitions';
import { EntityStore } from '../src/domain/entities';

describe('CRE-M4 & CRE-M5 Species move pools and disposition player-facing rename', () => {
  it('defines canonical learnable move pools for all 8 species with level and bond requirements', () => {
    const speciesIds = Object.keys(CREATURES);
    expect(speciesIds.length).toBe(8);

    for (const speciesId of speciesIds) {
      const pool = SPECIES_LEARNABLE_MOVES[speciesId as SpeciesId];
      expect(pool).toBeDefined();
      expect(pool.length).toBeGreaterThanOrEqual(4);

      // Verify each entry has valid moveId and level requirement >= 1
      for (const entry of pool) {
        expect(entry.moveId).toBeDefined();
        expect(typeof entry.moveId).toBe('string');
        expect(entry.requiredLevel).toBeGreaterThanOrEqual(1);
        if (entry.requiredBondHearts !== undefined) {
          expect(entry.requiredBondHearts).toBeGreaterThanOrEqual(1);
          expect(entry.requiredBondHearts).toBeLessThanOrEqual(10);
        }
      }
    }
  });

  it('filters learnable moves based on current level and bond hearts', () => {
    // Rivallie level 1, 0 bond hearts should unlock basic tier 1 moves only
    const basicMoves = learnableMovesForSpecies('rivallie', 1, 0);
    expect(basicMoves.length).toBeGreaterThanOrEqual(1);

    // Rivallie level 20, 5 bond hearts should unlock higher tier moves
    const advancedMoves = learnableMovesForSpecies('rivallie', 20, 5);
    expect(advancedMoves.length).toBeGreaterThan(basicMoves.length);
    expect(advancedMoves.every((m) => m.requiredLevel <= 20)).toBe(true);
  });

  it('validates equipped moves against learnable pool and requirements', () => {
    const store = new EntityStore();
    // Species 1 is Rivallie
    const slot = store.spawn(1, 10, 10);
    store.level[slot] = 1;

    // Default moves
    expect(store.moves(slot).length).toBeLessThanOrEqual(4);

    // Assigning valid level 1 moves succeeds
    const validMoves = learnableMovesForSpecies('rivallie', 1, 0)
      .map((m) => m.moveId)
      .slice(0, 2);
    expect(store.setMoves(slot, validMoves)).toBe(true);
    expect(store.moves(slot)).toEqual(validMoves);

    // Assigning a move not in species learnable pool fails
    expect(store.setMoves(slot, ['fake_forbidden_move'])).toBe(false);

    // Assigning a high-level move to a level 1 creature fails
    const highLevelMove = SPECIES_LEARNABLE_MOVES['rivallie']!.find((m) => m.requiredLevel > 5);
    if (highLevelMove) {
      expect(store.setMoves(slot, [highLevelMove.moveId])).toBe(false);
    }
  });

  it('exposes displayDisposition matching CRE-M5 player-facing renaming requirement', () => {
    const store = new EntityStore();
    const slot = store.spawn(0, 10, 10);
    store.setTemperament(slot, 'bold');

    // displayDisposition should return formatted name
    expect(store.displayDisposition(slot)).toBe('Bold');
  });
});
