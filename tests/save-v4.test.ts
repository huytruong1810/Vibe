import { describe, expect, it } from 'vitest';
import { SimulationHost } from '../src/domain/simulation';
import { migrateSave } from '../src/domain/save-schema';

describe('v4 ownership and scene validation', () => {
  const baseline = new SimulationHost(42, 1, 24).snapshot();
  it('rejects item duplication across equipment and carried capacity', () => {
    const save = structuredClone(baseline),
      torso = save.equipment.loadouts.find((l) => l.entityId === 0)!.worn.torso!;
    save.inventory = [{ ...torso }, null];
    expect(() => migrateSave(save)).toThrow(/Duplicate item/);
  });
  it('rejects resource storage in NPC combat-only loadouts', () => {
    const save = structuredClone(baseline);
    save.equipment.loadouts.find((l) => l.entityId === 1)!.combat = [
      { id: 'berries', instance: `item:${++save.inventorySerial}` },
      null,
    ];
    expect(() => migrateSave(save)).toThrow(/loadout cannot store/);
  });
  it('rejects unknown bindings and local positions outside the canonical interior', () => {
    const save = structuredClone(baseline);
    save.scenes.bindings[1]!.id = 'invented-room';
    expect(() => migrateSave(save)).toThrow(/canonical scene/);
    const outside = structuredClone(baseline),
      body = outside.entities.records.find((r) => r.id === 0)!;
    body.scene = outside.scenes.bindings.find((b) => b.id.includes(':home:0'))!.code;
    body.x = 400;
    expect(() => migrateSave(outside)).toThrow(/outside its scene/);
  });
  it('rejects protected carrion hidden in a pocket scene', () => {
    const save = structuredClone(baseline),
      partner = save.entities.records.find((r) => r.species < 8 && r.owner > 0)!;
    save.scenes.states.push({
      id: save.scenes.bindings[1]!.id,
      deltas: [],
      drops: [],
      carrion: [
        { sourceId: partner.id, species: 'ignicap', x: 5, y: 5, remaining: 4, expiresAt: 999 },
      ],
    });
    expect(() => migrateSave(save)).toThrow(/Carrion/);
  });
  it('rejects orphan reservations and impossible committed projectiles', () => {
    const save = structuredClone(baseline);
    save.equipment.reservations.push({ id: 'action:0:0', entityId: 0, instance: 'item:1' });
    expect(() => migrateSave(save)).toThrow(/reservation/);
    const arrow = structuredClone(baseline);
    arrow.combat.projectiles = {
      serial: 1,
      arrows: [
        { id: 1, actor: 0, scene: 0, x: 264, y: 284, vx: 180, vy: 0, expiresAt: 20, power: 12 },
      ],
    };
    expect(() => migrateSave(arrow)).toThrow();
  });
});
