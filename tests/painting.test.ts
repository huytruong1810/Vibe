import { expect, it } from 'vitest';
import { ArtifactStore, PaintingBriefSchema } from '../src/domain/artifacts';
import { TwoSlotInventory } from '../src/domain/inventory';
import {
  PaintingService,
  validatePaintingBrief,
  paintingCaptionFallback,
  groundedPaintingCaption,
  type PaintingResult,
} from '../src/domain/painting';
import { validatePaintingText } from '../src/content/painting-rules';
import { NPC_PROFILES } from '../src/content/definitions';
const brief = PaintingBriefSchema.parse({
  title: 'River reeds',
  subject: 'River reeds at dusk',
  composition: 'wide landscape',
  mood: 'dusk',
  subjects: [],
});
const result: PaintingResult = {
  pixels: 'A'.repeat(1024),
  palette: ['#ece0c2'],
  caption: 'Reeds beside the river.',
  render: { provider: 'sdcpp', model: 'z-image', seed: 42, steps: 8, width: 512, height: 352 },
};
function setup() {
  const artifacts = new ArtifactStore(),
    inventory = new TwoSlotInventory();
  inventory.add('canvas');
  return { artifacts, inventory, service: new PaintingService(artifacts, inventory) };
}
it('grounds captions in declared subjects and falls back on injected names or lettering', () => {
  expect(groundedPaintingCaption(brief, 'Reeds beside the river.')).toBe('Reeds beside the river.');
  expect(groundedPaintingCaption(brief, 'Lark by the river.')).toBe(brief.subject);
  expect(groundedPaintingCaption(brief, 'Write hello on the reeds.')).toBe(brief.subject);
});
it.each([
  'write hello',
  'text that says hello',
  '"HELLO" on a sign',
  '‘hello’ lettering',
  "'HELLO' on a sign",
  'https://example.com',
  'www.example.org',
  'example.net',
  'a Nike logo',
  'a disney castle',
  'Taylor Swift by the reeds',
  'ＮＩＫＥ trainers',
])('rejects shared player/villager content rule: %s', (text) =>
  expect(() => validatePaintingText(text)).toThrow(),
);
it('accepts world subjects without treating an ordinary apostrophe as lettering', () => {
  expect(() => validatePaintingText("Lark's ferry at dusk")).not.toThrow();
  expect(() => validatePaintingBrief(brief)).not.toThrow();
});
it('validates composition, canonical subjects and neutral affinity including names omitted from IDs', () => {
  const subject = NPC_PROFILES[0]!;
  expect(() => validatePaintingBrief({ ...brief, composition: 'portrait' })).toThrow(
    'named villager',
  );
  const portrait = {
    ...brief,
    subject: `${subject.name} beside reeds`,
    composition: 'portrait' as const,
  };
  expect(() => validatePaintingBrief(portrait, () => -1)).toThrow('neutral');
  expect(() => validatePaintingBrief(portrait, () => 0)).not.toThrow();
  expect(() =>
    validatePaintingBrief({ ...brief, subjects: [{ kind: 'creature', id: 'invented' }] }),
  ).toThrow('does not exist');
  expect(PaintingBriefSchema.safeParse({ ...brief, composition: 'advertisement' }).success).toBe(
    false,
  );
});
it('persists an immutable pending brief on the original canvas identity and resumes after restoration', () => {
  const { artifacts, inventory, service } = setup(),
    instance = inventory.state[0]!.instance;
  const pending = service.requestPlayer(0, 'River reeds at dusk', 'quiet', 'wide landscape', 1);
  expect(inventory.state[0]).toEqual({ id: 'painting', instance, artifact: pending.id });
  expect(pending.status).toBe('pending');
  expect(() => service.keep(pending.id)).toThrow('preview');
  const restored = new ArtifactStore();
  restored.restore(artifacts.snapshot(), artifacts.serial);
  const restoredInventory = new TwoSlotInventory();
  restoredInventory.restore(inventory.state, inventory.serial);
  const resumed = new PaintingService(restored, restoredInventory);
  const preview = resumed.complete(pending.id, pending.revision, result);
  expect(preview.status).toBe('pending');
  expect(preview.brief).toEqual(pending.brief);
  expect(resumed.keep(pending.id)).toMatchObject({
    status: 'ready',
    sealed: true,
    caption: result.caption,
    render: result.render,
  });
  expect(() => resumed.discard(pending.id)).toThrow('kept');
});
it('enforces one player pending request and rejects stale/invalid server results atomically', () => {
  const { artifacts, inventory, service } = setup();
  inventory.add('canvas');
  const pending = service.requestPlayer(0, 'River reeds', 'dusk', 'wide landscape', 1);
  expect(() => service.requestPlayer(1, 'River reeds', 'dusk', 'wide landscape', 1)).toThrow(
    'pending',
  );
  expect(() => service.complete(pending.id, pending.revision + 1, result)).toThrow('Stale');
  expect(() =>
    service.complete(pending.id, pending.revision, { ...result, palette: ['#ffffff'] }),
  ).toThrow();
  expect(artifacts.get(pending.id)).toEqual(pending);
  service.complete(pending.id, pending.revision, result);
  expect(() => service.complete(pending.id, pending.revision, result)).toThrow('Stale');
});
it('discards failed work back to the same canvas and allocates a fresh identity for Retry', () => {
  const { artifacts, inventory, service } = setup();
  const instance = inventory.state[0]!.instance;
  const pending = service.requestPlayer(0, 'River reeds', 'dusk', 'wide landscape', 1);
  service.fail(pending.id, pending.revision, 'server unavailable');
  expect(artifacts.get(pending.id)).toMatchObject({
    status: 'failed',
    failure: 'server unavailable',
  });
  service.discard(pending.id);
  expect(inventory.state[0]).toEqual({ id: 'canvas', instance });
  expect(artifacts.get(pending.id)).toBeNull();
  const retry = service.requestPlayer(0, 'River reeds', 'dusk', 'wide landscape', 1);
  expect(retry.id).not.toBe(pending.id);
});
it('accepts the player1–240 character contract without truncation and bounds fallback captions to40 words', () => {
  const { service, artifacts } = setup();
  const first = service.requestPlayer(0, 'x', 'quiet', 'still life', 1);
  service.discard(first.id);
  const full = service.requestPlayer(0, 'x'.repeat(240), 'quiet', 'still life', 1);
  expect(full.brief.subject).toHaveLength(240);
  service.discard(full.id);
  expect(() => service.requestPlayer(0, 'x'.repeat(241), 'quiet', 'still life', 1)).toThrow();
  expect(artifacts.views()).toHaveLength(0);
  expect(
    paintingCaptionFallback({ ...brief, subject: 'a '.repeat(100).trim() }).split(' '),
  ).toHaveLength(40);
});
it.each([true, false])('persists NPC quota from authored records, artist=%s', (artist) => {
  const { artifacts, service } = setup(),
    id = NPC_PROFILES[10]!.id;
  const npc = { id, artist, relations: {} };
  const carry = () => true;
  const painting = service.requestNpc(npc, brief, 1, carry);
  expect(service.complete(painting.id, painting.revision, result)).toMatchObject({
    status: 'ready',
    author: { kind: 'npc', id },
  });
  const restored = new ArtifactStore();
  restored.restore(artifacts.snapshot(), artifacts.serial);
  const next = new PaintingService(restored, new TwoSlotInventory());
  expect(() => next.requestNpc(npc, brief, artist ? 1 : 7, carry)).toThrow('rate');
  expect(next.requestNpc(npc, brief, artist ? 2 : 8, carry).status).toBe('pending');
});
it('does not leave an unreferenced NPC artifact if the painter cannot carry it', () => {
  const { artifacts, service } = setup();
  expect(() =>
    service.requestNpc(
      { id: NPC_PROFILES[10]!.id, artist: true, relations: {} },
      brief,
      1,
      () => false,
    ),
  ).toThrow('free hand');
  expect(artifacts.views()).toHaveLength(0);
});
