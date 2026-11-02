import { describe, expect, it } from 'vitest';
import { SimulationHost } from '../src/domain/simulation';
import { migrateSave, GameSaveSchema } from '../src/domain/save-schema';
import { ArtifactStore } from '../src/domain/artifacts';
import { artifactFurniture } from '../src/domain/scenes';
import { NPC_PROFILES } from '../src/content/definitions';
import { IndexedDbSaveRepository } from '../src/adapters/persistence';
import { IDBFactory } from 'fake-indexeddb';
import { send } from './helpers';

function carryNote(host: SimulationHost) {
  const a = host.artifacts.create({
    kind: 'note',
    title: 'River',
    author: { kind: 'player' },
    createdDay: 0,
    lines: ['The river rises.'],
  });
  const item = { ...host.inventory.create('note'), artifact: a.id };
  host.inventory.set(0, item);
  return { a, item };
}
function publicHome(host: SimulationHost) {
  const portal = host.scenes.portals.find(
    (p) => p.source === 0 && p.owner === null && !p.id.includes('cave:'),
  )!;
  host.player.x = portal.x;
  host.player.y = portal.y;
  expect(
    send(host, { type: 'enterPortal', portalId: portal.id, expectedScene: 'overworld' }).ok,
  ).toBe(true);
  return host.scenes.definitions[portal.target]!;
}
describe('artifact simulation and save v5', () => {
  it('displays and takes atomically with exact identity; snapshots carry metadata only', () => {
    const host = new SimulationHost(42, 1, 0),
      { a, item } = carryNote(host);
    const home = publicHome(host),
      table = home.props.find((p) => p.display?.accepts.includes('note'))!;
    const display = { type: 'artifactDisplay', slot: 0, propId: table.id, displaySlot: 0 } as const;
    expect(send(host, display).ok).toBe(false);
    host.player.x = table.x;
    host.player.y = table.y;
    expect(send(host, display).ok).toBe(true);
    expect(host.inventory.state[0]).toBeNull();
    expect(host.placements[0]?.item).toEqual(item);
    const frame = host.frame();
    expect(frame.artifacts[0]).toMatchObject({ id: a.id, length: 1 });
    expect(frame.artifacts[0]).not.toHaveProperty('lines');
    expect(send(host, display).ok).toBe(false);
    host.inventory.add('berries');
    host.inventory.add('fiber');
    const take = { type: 'artifactTake', propId: table.id, displaySlot: 0 } as const;
    expect(send(host, take)).toMatchObject({ ok: false, message: 'Both hands are full.' });
    expect(host.placements).toHaveLength(1);
    const save = migrateSave(host.snapshot()),
      restored = new SimulationHost(42, 1, 0);
    restored.restore(save);
    expect(restored.placements).toEqual(host.placements);
    expect(restored.snapshot().artifacts).toEqual(save.artifacts);
    expect(restored.snapshot().placements).toEqual(save.placements);
    expect(restored.snapshot().artifactSequence).toBe(save.artifactSequence);
    restored.inventory.remove(0);
    expect(send(restored, take).ok).toBe(true);
    expect(restored.inventory.state[0]).toEqual(item);
    expect(send(restored, take)).toMatchObject({
      ok: false,
      message: 'That display slot is empty.',
    });
  });
  it('rejects wrong furniture/kind/slot and occupied displays without moving items', () => {
    const host = new SimulationHost(42, 1, 0),
      { item } = carryNote(host),
      home = publicHome(host);
    const hook = home.props.find((p) => p.display?.accepts.includes('painting'))!;
    host.player.x = hook.x;
    host.player.y = hook.y;
    for (const [propId, displaySlot] of [
      [hook.id, 0],
      [hook.id, 1],
      ['unknown', 0],
    ] as const)
      expect(send(host, { type: 'artifactDisplay', slot: 0, propId, displaySlot }).ok).toBe(false);
    expect(host.inventory.state[0]).toEqual(item);
    const table = home.props.find((p) => p.display?.accepts.includes('note'))!;
    host.player.x = table.x;
    host.player.y = table.y;
    expect(
      send(host, { type: 'artifactDisplay', slot: 0, propId: table.id, displaySlot: 0 }).ok,
    ).toBe(true);
    carryNote(host);
    expect(
      send(host, { type: 'artifactDisplay', slot: 0, propId: table.id, displaySlot: 0 }).ok,
    ).toBe(false);
    expect(host.inventory.state[0]?.artifact).toBe('art:2');
    host.player.x += 2;
    expect(send(host, { type: 'artifactTake', propId: table.id, displaySlot: 0 }).ok).toBe(false);
  });
  it('keeps display transfers out of attacks, sleep and combat', () => {
    const host = new SimulationHost(42, 1, 0);
    carryNote(host);
    const home = publicHome(host),
      table = home.props.find((p) => p.display?.accepts.includes('note'))!;
    host.player.x = table.x;
    host.player.y = table.y;
    const command = { type: 'artifactDisplay', slot: 0, propId: table.id, displaySlot: 0 } as const;
    host.player.attack = { kind: 'strike', startedAt: 0, hit: [] };
    expect(send(host, command).ok).toBe(false);
    host.player.attack = null;
    host.entities.sleeping[host.entities.require(0)] = 1;
    expect(send(host, command).ok).toBe(false);
    expect(host.placements).toHaveLength(0);
  });
  it('gives every home a hook and only Lark three hooks plus an easel', () => {
    const host = new SimulationHost(42, 1, 0);
    for (const home of host.scenes.definitions.filter((d) => d.kind === 'building')) {
      const painter = home.owner !== null && NPC_PROFILES[home.owner - 1]?.name === 'Lark';
      expect(home.props.filter((p) => p.display?.accepts.includes('painting'))).toHaveLength(
        painter ? 3 : 1,
      );
      expect(home.props.some((p) => p.interaction === 'paint')).toBe(painter);
    }
    expect(
      artifactFurniture('test', NPC_PROFILES.findIndex((p) => p.name === 'Lark') + 1),
    ).toHaveLength(4);
  });
  it('migrates genuine v4 checkpoints and retains v5 contents, sequence and export/import', () => {
    const host = new SimulationHost(42, 1, 0),
      current = host.snapshot();
    const { artifacts: _a, placements: _p, artifactSequence: _s, ...legacy } = current;
    const upgraded = migrateSave({ ...legacy, version: 4 });
    expect(upgraded).toEqual(current);
    carryNote(host);
    host.artifacts.remove(host.inventory.state[0]!.artifact!);
    host.inventory.remove(0);
    const next = new SimulationHost(42, 1, 0);
    next.restore(host.snapshot());
    expect(carryNote(next).a.id).toBe('art:2');
    const repository = new IndexedDbSaveRepository('artifact-export', new IDBFactory());
    const save = next.snapshot();
    expect(repository.import(repository.export(save))).toEqual(save);
    expect(migrateSave(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });
  it.each([
    'dangling',
    'orphan',
    'duplicate',
    'kind',
    'counter',
    'author',
    'drop-instance',
    'pocket-drop',
  ] as const)('rejects corrupt references: %s', (fault) => {
    const host = new SimulationHost(42, 1, 0),
      { a, item } = carryNote(host),
      save = host.snapshot();
    if (fault === 'dangling') save.inventory[0]!.artifact = 'art:999';
    if (fault === 'orphan') save.inventory[0] = null;
    if (fault === 'duplicate')
      save.inventory[1] = {
        id: 'note',
        artifact: item.artifact,
        instance: `item:${++save.inventorySerial}`,
      };
    if (fault === 'kind') save.inventory[0]!.id = 'book';
    if (fault === 'counter') save.artifactSequence = 0;
    if (fault === 'author') save.artifacts[0]!.author = { kind: 'npc', id: 'npc:unknown' };
    if (fault === 'drop-instance') {
      save.inventory[0] = null;
      save.drops.push({ id: 1, item: 'note', artifact: a.id, x: host.player.x, y: host.player.y });
    }
    if (fault === 'pocket-drop')
      save.scenes.states.push({
        id: save.scenes.bindings[1]!.id,
        deltas: [],
        carrion: [],
        drops: [
          {
            id: 1,
            item: 'note',
            artifact: 'art:999',
            instance: `item:${++save.inventorySerial}`,
            x: 5,
            y: 5,
          },
        ],
      });
    expect(() => migrateSave(save)).toThrow();
  });
  it('rejects corrupt placement destinations, kinds, occupied slots and item identities', () => {
    const host = new SimulationHost(42, 1, 0),
      { a, item } = carryNote(host),
      home = publicHome(host);
    const table = home.props.find((p) => p.display?.accepts.includes('note'))!;
    host.player.x = table.x;
    host.player.y = table.y;
    send(host, { type: 'artifactDisplay', slot: 0, propId: table.id, displaySlot: 0 });
    const baseline = host.snapshot();
    for (const change of [
      { sceneId: 'unknown' },
      { propId: 'unknown' },
      { slot: 2 },
      { artifactId: 'art:999' },
      { item: { ...item, artifact: 'art:999' } },
      { propId: `${home.id}:hook:0` },
    ]) {
      const save = structuredClone(baseline);
      Object.assign(save.placements[0]!, change);
      expect(() => migrateSave(save)).toThrow();
    }
    const duplicate = structuredClone(baseline);
    duplicate.inventory[0] = { id: 'note', instance: item.instance, artifact: a.id };
    expect(() => migrateSave(duplicate)).toThrow();
    duplicate.inventory[0] = null;
    duplicate.placements.push(structuredClone(duplicate.placements[0]!));
    expect(() => migrateSave(duplicate)).toThrow();
  });
  it('round-trips 512 text artifacts below 3 MB with validation below 50 ms', () => {
    const host = new SimulationHost(42, 1, 0),
      save = host.snapshot(),
      store = new ArtifactStore();
    const a = store.create({
      kind: 'note',
      title: 'Field journal',
      author: { kind: 'player' },
      createdDay: 0,
      lines: Array(20).fill('x'.repeat(96)),
    });
    save.artifacts = Array.from({ length: 512 }, (_, i) => ({ ...a, id: `art:${i + 1}` }));
    save.artifactSequence = 512;
    save.drops = save.artifacts.map((record, i) => ({
      id: i + 1,
      item: 'note',
      artifact: record.id,
      instance: `item:${++save.inventorySerial}`,
      x: host.player.x,
      y: host.player.y,
      scene: 0,
    }));
    const json = JSON.stringify(save);
    expect(new TextEncoder().encode(json).byteLength).toBeLessThan(3_000_000);
    // Warm the schema/JIT before measuring one complete validation, excluding JSON decode.
    GameSaveSchema.parse(save);
    const start = performance.now(),
      validated = GameSaveSchema.parse(save),
      elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
    expect(migrateSave(JSON.parse(json))).toEqual(validated);
    const restored = new SimulationHost(42, 1, 0);
    restored.restore(validated);
    expect(restored.snapshot()).toEqual(validated);
    console.log(
      `C17 512-artifact save: ${new TextEncoder().encode(json).byteLength} bytes; ${elapsed.toFixed(2)} ms validation`,
    );
  });
});
