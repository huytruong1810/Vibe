import { describe, expect, it } from 'vitest';
import {
  ArtifactStore,
  ArtifactSchema,
  ArtifactRecordsSchema,
  sanitizeArtifactText,
  ARTIFACT_PALETTE,
  type NewArtifact,
} from '../src/domain/artifacts';
import { ARTIFACT_LIMITS, NPC_PROFILES } from '../src/content/definitions';
import { TwoSlotInventory, CraftingService } from '../src/domain/inventory';
import { HarvestSystem, ResourceStore } from '../src/domain/resources';
import { flatWorld } from './helpers';

const note = (title = 'Field note'): NewArtifact => ({
  kind: 'note',
  title,
  author: { kind: 'player' },
  createdDay: 1,
  lines: ['By the river.'],
});
describe('bounded authored records', () => {
  it('normalizes NFC, tabs, line endings and controls without truncation', () => {
    expect(sanitizeArtifactText('e\u0301\tA\u0000\u0085\r\nB\rC')).toBe('é A\nB\nC');
    const store = new ArtifactStore();
    const a = store.create({ ...note('e\u0301'), kind: 'note', lines: ['a\tb\u0000'] });
    expect(a.title).toBe('é');
    expect(a.kind === 'note' && a.lines).toEqual(['a b']);
    expect(() => store.create(note('x'.repeat(49)))).toThrow();
    expect(store.serial).toBe(1);
  });
  it('copies inputs and outputs, increments revisions and keeps provenance immutable', () => {
    const store = new ArtifactStore(),
      a = store.create(note());
    a.title = 'Outside';
    expect(store.get(a.id)?.title).toBe('Field note');
    const change = { lines: ['Changed'] };
    expect(store.update(a.id, change).revision).toBe(2);
    change.lines[0] = 'Outside';
    expect(store.get(a.id)).toMatchObject({ lines: ['Changed'] });
    expect(() => store.update(a.id, { author: { kind: 'player' } } as never)).toThrow(/Immutable/);
    expect(() => store.update(a.id, { pages: [[]] })).toThrow();
    expect(store.get(a.id)?.revision).toBe(2);
    expect(store.seal(a.id).revision).toBe(3);
    expect(store.seal(a.id).revision).toBe(3);
    expect(() => store.update(a.id, { title: 'No' })).toThrow(/sealed/);
    expect(() => store.seal('art:999')).toThrow(/Unknown/);
    expect(() => store.update('art:999', {})).toThrow(/Unknown/);
  });
  it('never reuses removed IDs, and restores atomically', () => {
    const store = new ArtifactStore(),
      a = store.create(note());
    store.remove(a.id);
    expect(store.create(note()).id).toBe('art:2');
    const next = new ArtifactStore();
    next.restore(store.snapshot(), store.serial);
    expect(next.create(note()).id).toBe('art:3');
    expect(() => next.restore(store.snapshot(), 0)).toThrow(/counter/);
    expect(next.serial).toBe(3);
    expect(() => next.restore([], -1)).toThrow();
  });
  it.each([
    { title: '' },
    { title: ' ' },
    { title: 'x'.repeat(49) },
    { lines: ['x'.repeat(97)] },
    { lines: Array(25).fill('') },
    { lines: ['a\nb'] },
    { createdDay: -1 },
    { revision: 0 },
    { author: { kind: 'npc', id: 'npc:unknown' } },
    { extra: true },
  ])('rejects invalid note fields %j', (change) => {
    expect(
      ArtifactSchema.safeParse({ ...note(), id: 'art:1', revision: 1, sealed: false, ...change })
        .success,
    ).toBe(false);
  });
  it('accepts boundary text sizes, known authors and 48 pages; rejects page count overflow', () => {
    const store = new ArtifactStore();
    const book = store.create({
      kind: 'book',
      title: 'x'.repeat(48),
      author: { kind: 'npc', id: NPC_PROFILES[0]!.id },
      createdDay: 0,
      pages: Array.from({ length: 48 }, () => Array(24).fill('x'.repeat(96))),
    });
    expect(book.kind === 'book' && book.pages.length).toBe(48);
    expect(() => store.update(book.id, { pages: [] })).toThrow();
    expect(() => store.update(book.id, { pages: Array.from({ length: 49 }, () => []) })).toThrow();
    const view = store.views()[0]!;
    expect(view.length).toBe(48);
    expect(view).not.toHaveProperty('pages');
  });
  it('enforces record and aggregate UTF-16 text budgets without partial updates', () => {
    const store = new ArtifactStore();
    const big = {
      kind: 'book',
      title: 'Book',
      author: { kind: 'player' },
      createdDay: 0,
      pages: Array.from({ length: 48 }, () => Array(24).fill('界'.repeat(96))),
    } as const;
    for (let i = 0; i < 9; i++) store.create(structuredClone(big) as NewArtifact);
    expect(() => store.create(structuredClone(big) as NewArtifact)).toThrow(/budget/);
    expect(store.serial).toBe(9);
    const a = new ArtifactStore().create(note());
    const records = Array.from({ length: ARTIFACT_LIMITS.records }, (_, i) => ({
      ...a,
      id: `art:${i + 1}`,
    }));
    expect(ArtifactRecordsSchema.safeParse(records).success).toBe(true);
    expect(ArtifactRecordsSchema.safeParse([...records, { ...a, id: 'art:513' }]).success).toBe(
      false,
    );
    expect(ArtifactRecordsSchema.safeParse([a, a]).success).toBe(false);
  });
  it('validates painting bytes, colors, provenance and captions', () => {
    const store = new ArtifactStore();
    const a = store.create({
      kind: 'painting',
      title: 'River',
      author: { kind: 'player' },
      createdDay: 1,
      status: 'pending',
      brief: {
        title: 'River',
        subject: 'River bend',
        composition: 'wide landscape',
        mood: 'dawn',
        subjects: [],
      },
    });
    const color = [...ARTIFACT_PALETTE][0]!;
    expect(
      store.update(a.id, {
        status: 'ready',
        pixels: 'A'.repeat(1024),
        palette: [color],
        caption: 'A river.',
      }),
    ).toMatchObject({ status: 'ready' });
    for (const change of [
      { pixels: 'A' },
      { pixels: '/'.repeat(1024) },
      { palette: ['#000000'] },
      { palette: Array(17).fill(color) },
      { palette: [color, color] },
      { caption: Array(41).fill('word').join(' ') },
      { failure: 'x'.repeat(201) },
      { render: { provider: 'mock', model: 'test', seed: 1, steps: 0, width: 48, height: 32 } },
    ])
      expect(() => store.update(a.id, change)).toThrow();
    expect(() =>
      new ArtifactStore().create({
        ...a,
        status: 'ready',
        pixels: undefined,
        palette: undefined,
      } as NewArtifact),
    ).toThrow();
  });
  it('preserves item identity and artifact through swaps, drop and pickup; crafts only blank inputs', () => {
    const inventory = new TwoSlotInventory(),
      store = new ResourceStore(flatWorld());
    const a = { ...inventory.create('note'), artifact: 'art:1' };
    inventory.insert(a);
    inventory.add('fiber');
    inventory.swap();
    expect(new CraftingService().combine(inventory)).not.toContain('Crafted');
    inventory.swap();
    expect(inventory.remove(0)).toEqual(a);
    expect(store.dropItem(a, { x: 4, y: 4 })).toBe(true);
    expect(new HarvestSystem(store).harvest({ x: 4, y: 4 }, inventory, 0).ok).toBe(true);
    expect(inventory.state[0]).toEqual(a);
    inventory.restore([null, null]);
    inventory.add('fiber');
    inventory.add('fiber');
    expect(new CraftingService().combine(inventory)).toBe('Crafted Note.');
    inventory.add('stick');
    expect(new CraftingService().combine(inventory)).toBe('Crafted Blank canvas.');
    inventory.restore([null, null]);
    inventory.add('fiber');
    inventory.add('stick');
    expect(new CraftingService().combine(inventory)).toBe('Crafted Shortbow.');
  });
});
