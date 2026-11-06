import { describe, expect, it } from 'vitest';
import { SimulationHost } from '../src/domain/simulation';
import { migrateSave } from '../src/domain/save-schema';
import { NPC_PROFILES } from '../src/content/definitions';
import { send } from './helpers';
import type { CommandPayload } from '../src/domain/contracts';

describe('player authored text', () => {
  it('writes three pages, preserves item identity, seals and restores read-only text', () => {
    const host = new SimulationHost(42, 1, 0);
    const item = host.inventory.create('book');
    host.inventory.set(0, item);
    expect(send(host, { type: 'pause', token: 'menu' }).ok).toBe(true);
    const written = send(host, {
      type: 'artifactWrite',
      slot: 0,
      title: 'River diary',
      lines: ['First page.'],
    });
    expect(written.ok).toBe(true);
    expect(written.artifactId).toBeDefined();
    expect(host.inventory.state[0]?.instance).toBe(item.instance);
    for (let page = 2; page <= 3; page++) {
      expect(send(host, { type: 'artifactPageAdd', slot: 0 }).ok).toBe(true);
      expect(
        send(host, { type: 'artifactWrite', slot: 0, page, lines: [`Page ${page}.`] }).ok,
      ).toBe(true);
    }
    expect(host.artifactContent(written.artifactId!)).toMatchObject({
      pages: [['First page.'], ['Page 2.'], ['Page 3.']],
    });
    expect(send(host, { type: 'artifactSeal', slot: 0 }).ok).toBe(true);
    const before = host.artifacts.snapshot();
    for (const command of [
      { type: 'artifactWrite', slot: 0, lines: ['changed'] },
      { type: 'artifactPageAdd', slot: 0 },
      { type: 'artifactPageRemove', slot: 0, page: 1 },
    ] satisfies CommandPayload[])
      expect(send(host, command).ok).toBe(false);
    expect(host.artifacts.snapshot()).toEqual(before);
    const restored = new SimulationHost(42, 1, 0);
    restored.restore(migrateSave(host.snapshot()));
    expect(restored.artifactContent(written.artifactId!)).toEqual(
      host.artifactContent(written.artifactId!),
    );
    expect(send(restored, { type: 'artifactWrite', slot: 0, lines: ['changed'] }).ok).toBe(false);
    host.dispose();
    restored.dispose();
  });
  it('rejects invalid edits without creating orphan records or consuming identities', () => {
    const host = new SimulationHost(42, 1, 0);
    host.inventory.set(0, host.inventory.create('book'));
    const before = host.snapshot();
    for (const command of [
      { type: 'artifactWrite', slot: 0, title: ' ', lines: ['x'] },
      { type: 'artifactWrite', slot: 0, page: 2, lines: ['x'] },
      { type: 'artifactWrite', slot: 0, lines: ['x'.repeat(97)] },
      { type: 'artifactWrite', slot: 0, lines: Array(25).fill('x') },
      { type: 'artifactPageAdd', slot: 0 },
      { type: 'artifactPageRemove', slot: 0, page: 1 },
      { type: 'artifactSeal', slot: 0 },
    ] satisfies CommandPayload[])
      expect(send(host, command).ok).toBe(false);
    expect(host.snapshot().artifacts).toEqual(before.artifacts);
    expect(host.artifacts.serial).toBe(before.artifactSequence);
    expect(host.inventory.state).toEqual(before.inventory);
    expect(send(host, { type: 'artifactWrite', slot: 0, lines: ['Valid'] }).ok).toBe(true);
    expect(send(host, { type: 'artifactPageRemove', slot: 0, page: 1 }).ok).toBe(false);
    expect(send(host, { type: 'artifactWrite', slot: 0, page: 2, lines: ['x'] }).ok).toBe(false);
    for (let n = 1; n < 48; n++)
      expect(send(host, { type: 'artifactPageAdd', slot: 0 }).ok).toBe(true);
    expect(send(host, { type: 'artifactPageAdd', slot: 0 }).ok).toBe(false);
    host.dispose();
  });
  it('rejects other authors and unreachable queries while retaining metadata-only frames', () => {
    const host = new SimulationHost(42, 1, 0);
    const record = host.artifacts.create({
      kind: 'note',
      author: { kind: 'npc', id: NPC_PROFILES[0]!.id },
      title: 'A villager note',
      createdDay: 0,
      lines: ['A note.'],
    });
    host.inventory.set(0, { ...host.inventory.create('note'), artifact: record.id });
    expect(host.artifactContent(record.id)?.kind).toBe('note');
    expect(send(host, { type: 'artifactWrite', slot: 0, lines: ['Changed'] }).ok).toBe(false);
    expect(send(host, { type: 'artifactSeal', slot: 0 }).ok).toBe(false);
    expect(host.frame().artifacts[0]).not.toHaveProperty('lines');
    host.inventory.remove(0);
    expect(host.artifactContent(record.id)).toBeNull();
    host.dispose();
  });
});
