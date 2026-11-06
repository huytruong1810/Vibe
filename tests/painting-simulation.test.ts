import { expect, it } from 'vitest';
import { SimulationHost } from '../src/domain/simulation';
import { migrateSave } from '../src/domain/save-schema';
import { paintingRgba } from '../src/domain/painting-pixels';
import { send } from './helpers';
import { NPC_PROFILES } from '../src/content/definitions';
const result = {
  pixels: 'A'.repeat(1024),
  palette: ['#ece0c2'],
  caption: 'River reeds at dusk',
  render: { provider: 'sdcpp', model: 'z-image', seed: 42, steps: 8, width: 512, height: 352 },
};
it('restores a pending painting in a real save and requires inference provenance for completion', () => {
  const host = new SimulationHost(42, 1, 0),
    restored = new SimulationHost(42, 1, 0);
  try {
    host.inventory.set(0, host.inventory.create('canvas'));
    expect(
      send(host, { type: 'paintingRequest', slot: 0, prompt: 'River reeds', mood: 'dusk' }).message,
    ).toContain('endpoint');
    expect(host.inventory.state[0]?.id).toBe('canvas');
    send(host, { type: 'configurePainting', enabled: true });
    expect(send(host, { type: 'pause', token: 'menu' }).ok).toBe(true);
    const request = send(host, {
      type: 'paintingRequest',
      slot: 0,
      prompt: 'River reeds',
      mood: 'dusk',
    });
    expect(request.ok).toBe(true);
    const artifactId = request.artifactId!;
    const pending = host.artifactContent(artifactId)!;
    const saved = migrateSave(host.snapshot());
    restored.restore(saved);
    expect(restored.artifactContent(artifactId)).toEqual(pending);
    const command = {
      type: 'paintingResult' as const,
      artifactId,
      revision: pending.revision,
      result,
    };
    expect(send(restored, command).message).toContain('Inference receipt');
    expect(send(restored, command, 'inference').ok).toBe(true);
    expect(send(restored, { type: 'paintingKeep', requestId: artifactId }).ok).toBe(true);
    expect(
      migrateSave(restored.snapshot()).artifacts.find((a) => a.id === artifactId),
    ).toMatchObject({ status: 'ready', sealed: true, caption: result.caption });
  } finally {
    host.dispose();
    restored.dispose();
  }
});
it('ignores a late generation result after discard without recreating the artifact', () => {
  const host = new SimulationHost(42, 1, 0);
  try {
    send(host, { type: 'configurePainting', enabled: true });
    host.inventory.set(0, host.inventory.create('canvas'));
    const request = send(host, {
      type: 'paintingRequest',
      slot: 0,
      prompt: 'River reeds',
      mood: 'quiet',
    });
    const artifactId = request.artifactId!;
    expect(send(host, { type: 'drop', slot: 0 }).ok).toBe(false);
    expect(send(host, { type: 'paintingDiscard', requestId: artifactId }).ok).toBe(true);
    expect(
      send(host, { type: 'paintingResult', artifactId, revision: 1, result }, 'inference').ok,
    ).toBe(false);
    expect(host.artifactContent(artifactId)).toBeNull();
    expect(host.inventory.state[0]?.id).toBe('canvas');
    expect(() => migrateSave(host.snapshot())).not.toThrow();
  } finally {
    host.dispose();
  }
});
it('decodes high-nibble-first palette pixels and rejects unavailable indices', () => {
  const pixels = Buffer.alloc(768, 0x01).toString('base64');
  expect([...paintingRgba({ pixels, palette: ['#112233', '#445566'] }).slice(0, 8)]).toEqual([
    17, 34, 51, 255, 68, 85, 102, 255,
  ]);
  expect(() => paintingRgba({ pixels, palette: ['#112233'] })).toThrow('index');
});
it('reserves a home hook, restores NPC work, keeps quotas and stores caption notices only nearby', () => {
  const host = new SimulationHost(42, 1, 0),
    restored = new SimulationHost(42, 1, 0);
  try {
    const index = NPC_PROFILES.findIndex((p) => p.name === 'Lark'),
      npc = host.npcs[index]!;
    const home = host.scenes.home(npc.entityId)!;
    npc.memory.records.push({
      id: 'painting-source',
      type: 'sight',
      text: 'River reeds at dusk',
      subjects: [],
      importance: 4,
      createdTick: 0,
      lastAccessTick: 0,
      confidence: 'witnessed',
      source: { kind: 'sight', ids: [] },
    });
    const action = {
      type: 'CREATE_PAINTING' as const,
      brief: {
        title: 'River reeds',
        subject: 'River reeds at dusk',
        mood: 'dusk' as const,
        composition: 'wide landscape' as const,
        subjects: [],
      },
    };
    expect(host.executePainting(npc, action).message).toContain('endpoint');
    expect(send(host, { type: 'configurePainting', enabled: true }).ok).toBe(true);
    expect(host.executePainting(npc, action).ok).toBe(true);
    const placement = host.placements.find(
      (p) => p.sceneId === home.id && host.artifacts.get(p.artifactId)?.kind === 'painting',
    )!;
    const pending = host.artifactContent(placement.artifactId, 'generation')!;
    expect(pending).toMatchObject({
      status: 'pending',
      author: { kind: 'npc', id: npc.profileId },
    });
    expect(host.artifactContent(pending.id)).toBeNull();
    restored.restore(migrateSave(host.snapshot()));
    const painter = restored.npcs[index]!;
    expect(
      send(
        restored,
        { type: 'paintingResult', artifactId: pending.id, revision: pending.revision, result },
        'inference',
      ).ok,
    ).toBe(true);
    expect(painter.memory.records.some((m) => m.text === "I painted 'River reeds'.")).toBe(true);
    expect(
      restored.executePainting(painter, { type: 'HANG_PAINTING', artifactId: pending.id }).ok,
    ).toBe(false);
    restored.entities.scene[restored.entities.require(painter.entityId)] = home.code;
    painter.x = 7;
    painter.y = 3;
    const witness = restored.npcs.find((n) => n !== painter)!;
    restored.entities.scene[restored.entities.require(witness.entityId)] = home.code;
    witness.x = 7;
    witness.y = 3;
    const distant = restored.npcs.find((n) => n !== painter && n !== witness)!;
    restored.entities.scene[restored.entities.require(distant.entityId)] = 0;
    distant.x = 7;
    distant.y = 3;
    expect(
      restored.executePainting(painter, { type: 'HANG_PAINTING', artifactId: pending.id }).ok,
    ).toBe(true);
    expect(
      witness.memory.records.some((m) => m.type === 'sight' && m.source.ids.includes(pending.id)),
    ).toBe(true);
    expect(distant.memory.records.some((m) => m.source.ids.includes(pending.id))).toBe(false);
    expect(() => migrateSave(restored.snapshot())).not.toThrow();
    send(restored, { type: 'configurePainting', enabled: true });
    expect(restored.executePainting(painter, action).message).toContain('rate');
    expect(
      restored.executePainting(painter, { type: 'HANG_PAINTING', artifactId: pending.id }).ok,
    ).toBe(false);
  } finally {
    host.dispose();
    restored.dispose();
  }
});
