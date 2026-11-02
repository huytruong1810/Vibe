import { expect, it } from 'vitest';
import { SimulationHost } from '../src/domain/simulation';
import { migrateSave, GameSaveSchema } from '../src/domain/save-schema';
import { ArtifactStore } from '../src/domain/artifacts';

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
