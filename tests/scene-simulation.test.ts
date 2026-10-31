import { describe, expect, it } from 'vitest';
import { SimulationHost } from '../src/domain/simulation';
import { migrateSave } from '../src/domain/save-schema';
import { send } from './helpers';

function enterPublicHome(host: SimulationHost) {
  const portal = host.scenes.portals.find(
    (p) => p.source === 0 && p.owner === null && !p.id.includes('cave:'),
  )!;
  host.player.x = portal.x;
  host.player.y = portal.y;
  expect(
    send(host, { type: 'enterPortal', portalId: portal.id, expectedScene: 'overworld' }).ok,
  ).toBe(true);
  return portal;
}

describe('scene-aware authoritative simulation', () => {
  it('cleans abandoned attacks before a checkpoint can persist stale combat', () => {
    const host = new SimulationHost(42, 1, 0),
      combat = host.combat.snapshot();
    host.combat.restore({
      ...combat,
      attacks: [
        [
          11,
          { kind: 'element', moveId: 'element', instanceId: 'action:11:0', startedAt: 0, hit: [] },
        ],
      ],
      pursuits: [],
    });
    host.step();
    expect(host.combat.snapshot().attacks).toEqual([]);
    expect(() => migrateSave(host.snapshot())).not.toThrow();
    const s = host.entities,
      a = s.require(11),
      b = s.require(12);
    s.x[a] = s.x[b] = 264.5;
    s.y[a] = 284.5;
    s.y[b] = 285.5;
    s.setNature(a, { response: 'avoid', aggression: [] });
    host.combat.restore({
      ...host.combat.snapshot(),
      attacks: [
        [
          11,
          { kind: 'element', moveId: 'element', instanceId: 'action:11:0', startedAt: 0, hit: [] },
        ],
      ],
      pursuits: [[11, { target: 12, cause: 'retaliate', until: 300 }]],
    });
    host.advance(30);
    expect(host.combat.snapshot().attacks.some(([id]) => id === 11)).toBe(false);
  });
  it('publishes only local terrain and actors while global time and distant physiology continue', () => {
    const host = new SimulationHost(42, 1, 24),
      portal = enterPublicHome(host);
    const frame = host.frame(),
      before = host.entities.food[host.entities.require(11)]!;
    expect(frame.scene.id).toBe(host.scenes.id(portal.target));
    expect(frame.actors.every((a) => a.sceneId === frame.scene.id)).toBe(true);
    expect(host.terrain().size).toBeLessThan(host.world.size);
    host.advance(60);
    expect(host.tick).toBe(60);
    expect(host.entities.food[host.entities.require(11)]).toBeLessThan(before);
    const tick = host.tick;
    send(host, { type: 'pause', token: 'menu' });
    host.advance(30);
    expect(host.tick).toBe(tick);
    expect(send(host, { type: 'guard', active: false }).ok).toBe(true);
  });
  it('retains local identity, dropped item instances and shared supplies across restore', () => {
    const host = new SimulationHost(42, 1, 0);
    enterPublicHome(host);
    host.inventory.add('arrow-bundle');
    const instance = host.inventory.state[0]!.instance;
    expect(send(host, { type: 'drop', slot: 0 }).ok).toBe(true);
    const scene = host.sceneId,
      save = migrateSave(host.snapshot());
    const restored = new SimulationHost(42, 1, 0);
    restored.restore(save);
    expect(restored.sceneId).toBe(scene);
    expect(restored.frame().drops[0]?.instance).toBe(instance);
    expect(restored.frame().drops[0]?.charges).toBe(12);
    const code = restored.entities.scene[restored.entities.require(0)]!;
    const pantry = restored.scenes.context(code).resources.supplies[0]!;
    const account = restored.resources.supplies.find((p) => p.id === pantry.id)!;
    pantry.stock.berries = 2;
    expect(account.stock.berries).toBe(2);
    const exit = restored.scenes.portals.find((p) => p.source === code)!;
    restored.player.x = exit.x;
    restored.player.y = exit.y;
    expect(
      send(restored, { type: 'enterPortal', portalId: exit.id, expectedScene: scene }).ok,
    ).toBe(true);
    expect(restored.entities.id(restored.entities.require(0))).toBe(0);
    expect(restored.entities.scene[restored.entities.require(0)]).toBe(0);
  });
  it('stages invitations until dialogue closes and rejects an obsolete scene command', () => {
    const host = new SimulationHost(42, 1, 0),
      npc = host.npcs[11]!;
    host.player.x = npc.x;
    host.player.y = npc.y;
    const home = host.scenes.home(npc.entityId)!,
      portal = host.scenes.portals.find((p) => p.source === 0 && p.target === home.code)!;
    send(host, { type: 'interact', npcId: npc.profileId });
    expect(send(host, { type: 'invite', npcId: npc.profileId }).ok).toBe(true);
    expect(host.scenes.allowed(portal, 0, host.calendar.day)).toBe(false);
    send(host, { type: 'closeDialogue' });
    expect(host.scenes.allowed(portal, 0, host.calendar.day)).toBe(true);
    host.player.x = portal.x;
    host.player.y = portal.y;
    expect(
      send(host, { type: 'enterPortal', portalId: portal.id, expectedScene: 'obsolete' }).ok,
    ).toBe(false);
    expect(host.sceneId).toBe('overworld');
  });
  it('does not release an interrupted or restored bow action twice', () => {
    const host = new SimulationHost(42, 1, 0);
    host.inventory.add('bow');
    host.inventory.add('arrow-bundle');
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    host.advance(6);
    const restored = new SimulationHost(42, 1, 0);
    restored.restore(migrateSave(host.snapshot()));
    restored.advance(6);
    expect(restored.inventory.state[1]?.charges).toBe(11);
    const committed = migrateSave(restored.snapshot()),
      again = new SimulationHost(42, 1, 0);
    again.restore(committed);
    again.advance(4);
    expect(again.inventory.state[1]?.charges).toBe(11);
    expect(again.combat.projectiles.snapshot().serial).toBe(1);
    const interrupted = new SimulationHost(42, 1, 0);
    interrupted.inventory.add('bow');
    interrupted.inventory.add('arrow-bundle');
    send(interrupted, { type: 'attack', kind: 'strike' });
    interrupted.player.hp = 0;
    interrupted.step();
    expect(interrupted.inventory.state[1]?.charges).toBe(12);
    expect(interrupted.equipment.hasReservation(0)).toBe(false);
    const resting = new SimulationHost(42, 1, 0);
    resting.inventory.add('bow');
    resting.inventory.add('arrow-bundle');
    send(resting, { type: 'attack', kind: 'strike' });
    expect(send(resting, { type: 'sleep' }).ok).toBe(true);
    expect(resting.equipment.hasReservation(0)).toBe(false);
    expect(resting.inventory.state[1]?.charges).toBe(12);
  });
});
