import { describe, expect, it } from 'vitest';
import { SimulationHost } from '../src/domain/simulation';
import { migrateSave } from '../src/domain/save-schema';
import { send } from './helpers';

describe('integrated simulation lifecycle', () => {
  it('publishes bounded diagnostics without altering gameplay or advancing a paused world', () => {
    const host = new SimulationHost(42, 1, 24);
    host.advance(60);
    send(host, { type: 'pause', token: 'menu' });
    const before = host.snapshot();
    expect(send(host, { type: 'debug', enabled: true }).ok).toBe(true);
    const frame = host.frame();
    expect(frame.debugEnabled).toBe(true);
    expect(frame.debugPaths.length).toBeLessThanOrEqual(24);
    expect(frame.debugPaths.every((path) => path.points.length <= 48)).toBe(true);
    expect(frame.creatures.every((creature) => Number.isFinite(creature.goal.x))).toBe(true);
    expect(host.snapshot()).toEqual(before);
    send(host, { type: 'debug', enabled: false });
    expect(host.frame().debugPaths).toEqual([]);
  });
  it('freezes the complete world during dialogue and commits gifts only after closing', () => {
    const host = new SimulationHost(42, 1, 24, 'world:dialogue'),
      npc = host.npcs[10]!;
    host.player.x = npc.x;
    host.player.y = npc.y;
    expect(send(host, { type: 'interact', npcId: npc.profileId }).ok).toBe(true);
    const tick = host.tick,
      before = host.creatures.snapshot();
    host.advance(90);
    expect(host.tick).toBe(tick);
    expect(host.creatures.snapshot()).toEqual(before);
    send(host, { type: 'dialogue', text: 'Could you share a gift?' });
    const job = host.frame().jobs[0]!;
    expect(
      send(
        host,
        {
          type: 'agentResult',
          jobId: job.id,
          output: {
            dialogue: 'I can offer a few berries when we finish talking.',
            emotion: 'warm',
            action: { type: 'DROP_GIFT', itemId: 'berries' },
          },
        },
        'inference',
      ).ok,
    ).toBe(true);
    expect(host.resources.drops).toHaveLength(0);
    send(host, { type: 'closeDialogue' });
    expect(host.resources.drops).toHaveLength(1);
    host.step();
    expect(host.tick).toBe(tick + 1);
  });
  it('rejects invalid and duplicate commands without consuming resources twice', () => {
    const host = new SimulationHost(42, 1, 0, 'world:commands');
    expect(
      host.submit({
        id: 'bad',
        session: host.session,
        issuer: 'player',
        command: { type: 'move', x: NaN, y: 0 },
      }).ok,
    ).toBe(false);
    const command = {
      id: 'unique',
      session: host.session,
      issuer: 'player' as const,
      command: { type: 'swap' as const },
    };
    expect(host.submit(command).ok).toBe(true);
    expect(host.submit(command).ok).toBe(false);
    expect(host.submit({ ...command, id: 'old', session: 'obsolete' }).ok).toBe(false);
  });
  it('cancels outstanding dialogue replies after close and preserves a hidden-tab pause', () => {
    const host = new SimulationHost(42, 1, 0),
      npc = host.npcs[10]!;
    host.player.x = npc.x;
    host.player.y = npc.y;
    send(host, { type: 'interact', npcId: npc.profileId });
    send(host, { type: 'dialogue', text: 'Hello.' });
    const job = host.frame().jobs[0]!;
    send(host, { type: 'pause', token: 'hidden' });
    send(host, { type: 'closeDialogue' });
    expect(host.pauses.paused).toBe(true);
    expect(send(host, { type: 'agentResult', jobId: job.id, output: {} }, 'inference').ok).toBe(
      false,
    );
    send(host, { type: 'resume', token: 'hidden' });
    expect(host.pauses.paused).toBe(false);
  });
  it('uses deterministic fallback on an inference outage during play', () => {
    const host = new SimulationHost(42, 1, 0),
      npc = host.npcs[10]!;
    host.player.x = npc.x;
    host.player.y = npc.y;
    send(host, { type: 'interact', npcId: npc.profileId });
    send(host, { type: 'dialogue', text: 'Would you walk with me?' });
    const job = host.frame().jobs[0]!;
    send(host, { type: 'agentFailure', jobId: job.id, reason: 'timeout' }, 'inference');
    expect(host.dialogue?.staged[0]?.type).toBe('FOLLOW_PLAYER');
    send(host, { type: 'closeDialogue' });
    expect(npc.followingUntil).toBeGreaterThan(host.calendar.elapsedSeconds);
  });
  it('waits for all pause owners before committing physical conversation effects', () => {
    const host = new SimulationHost(42, 1, 0),
      npc = host.npcs[10]!;
    host.player.x = npc.x;
    host.player.y = npc.y;
    send(host, { type: 'interact', npcId: npc.profileId });
    send(host, { type: 'dialogue', text: 'Could you offer a gift?' });
    const job = host.frame().jobs[0]!;
    send(host, { type: 'agentFailure', jobId: job.id, reason: 'test outage' }, 'inference');
    send(host, { type: 'pause', token: 'hidden' });
    send(host, { type: 'closeDialogue' });
    expect(host.resources.drops).toHaveLength(0);
    host.step();
    expect(host.tick).toBe(0);
    send(host, { type: 'resume', token: 'hidden' });
    host.step();
    expect(host.resources.drops).toHaveLength(1);
  });
  it('round-trips all persistent state and never transfers authoritative arrays', () => {
    const host = new SimulationHost(42, 1, 100, 'world:before');
    host.advance(90);
    host.inventory.add('flint');
    host.resources.drop('water', host.player);
    const snapshot = migrateSave(host.snapshot()),
      restored = new SimulationHost(42, 1, 0, 'world:after');
    restored.restore(snapshot);
    expect(restored.snapshot()).toEqual(snapshot);
    expect(restored.pauses.paused).toBe(false);
    const frame = host.frame(),
      authoritativeLength = host.creatures.x.byteLength;
    structuredClone(frame.packed, { transfer: [frame.packed.buffer] });
    expect(frame.packed.byteLength).toBe(0);
    expect(host.creatures.x.byteLength).toBe(authoritativeLength);
    host.step();
    expect(Number.isFinite(host.player.x)).toBe(true);
    restored.step();
    restored.creatures.validate();
  });
  it('rejects malformed saves and migrates an earlier checkpoint shape', () => {
    const host = new SimulationHost(42, 1, 0),
      save = host.snapshot();
    expect(() => migrateSave({ ...save, version: 999 })).toThrow(/incompatible/);
    const malformed = structuredClone(save);
    malformed.entities.records[0]!.owner = 0;
    malformed.entities.records[1]!.owner = 0;
    expect(() => migrateSave(malformed)).toThrow();
    expect(migrateSave(save).version).toBe(4);
  });
  it('keeps world state finite and capacity bounded under sustained movement', () => {
    const host = new SimulationHost(83, 1, 100);
    send(host, { type: 'move', x: 1, y: 0.5 });
    host.advance(600);
    host.creatures.validate();
    expect(host.tiers.detailed.length).toBeLessThanOrEqual(128);
    expect(host.npcs).toHaveLength(30);
    expect(host.navigation.pending).toBeLessThanOrEqual(200);
    expect(migrateSave(host.snapshot()).tick).toBe(600);
  });
});
