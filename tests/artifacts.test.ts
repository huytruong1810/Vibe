import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_CAPS,
  ArtifactSchema,
  ArtifactStore,
  encodePaintingPixels,
  decodePaintingPixels,
  sanitizeArtifactText,
  sanitizeTitle,
  validateArtifactReferences,
} from '../src/domain/artifacts';

describe('authored artifacts item class and store (C17 / V12)', () => {
  it('sanitizes text with NFC normalization, strips control/BiDi chars, replaces tabs, and enforces line/char caps', () => {
    const raw = 'e\u0301\t\u0007\u202eHello\n' + 'A'.repeat(120) + '\n' + 'line\n'.repeat(30);
    const cleaned = sanitizeArtifactText(
      raw,
      ARTIFACT_CAPS.maxNoteLines,
      ARTIFACT_CAPS.maxNoteLineChars,
      ARTIFACT_CAPS.maxNoteChars,
    );
    const lines = cleaned.split('\n');
    expect(lines.length).toBeLessThanOrEqual(ARTIFACT_CAPS.maxNoteLines);
    expect(lines[0]).toBe('é  Hello');
    expect(Array.from(lines[1]!).length).toBe(ARTIFACT_CAPS.maxNoteLineChars);
    expect(cleaned).not.toContain('\u0007');
    expect(cleaned).not.toContain('\u202e');

    expect(sanitizeTitle('  A\u0000\tTitle ' + 'x'.repeat(80))).toHaveLength(
      ARTIFACT_CAPS.maxTitleChars,
    );
  });

  it('creates, updates, pages, seals, and views notes, books, and paintings with revision bumps', () => {
    const store = new ArtifactStore();
    const note = store.createNote({
      author: 'player',
      createdAtDay: 1,
      title: 'Tide Notice',
      body: 'High tide at dusk.',
    });
    expect(note.revision).toBe(1);
    expect(note.immutable).toBe(false);

    const updatedNote = store.updateNote(note.id, 'Updated Tide Notice', 'High tide at dawn.');
    expect(updatedNote.revision).toBe(2);
    expect(updatedNote.content.kind === 'note' && updatedNote.content.body).toBe(
      'High tide at dawn.',
    );

    const sealed = store.seal(note.id);
    expect(sealed.immutable).toBe(true);
    expect(sealed.revision).toBe(3);
    expect(() => store.updateNote(note.id, 'Cannot Edit', 'Locked')).toThrow(/immutable|sealed/i);

    const book = store.createBook({
      author: 'npc:lark',
      createdAtDay: 2,
      title: 'Lark Sketch Diary',
      pages: [{ heading: 'Day 1', body: 'Sketched the canal lanterns.' }],
    });
    const withPage2 = store.addBookPage(book.id, {
      heading: 'Day 2',
      body: 'Painted the boathouse.',
    });
    expect(withPage2.content.kind === 'book' && withPage2.content.pages).toHaveLength(2);
    const afterRemove = store.removeBookPage(book.id, 0);
    expect(afterRemove.content.kind === 'book' && afterRemove.content.pages).toHaveLength(1);

    // Painting with 48x32 = 1536 palette indices (<= 16 unique colours, all < 64)
    const rawPixels = new Uint8Array(ARTIFACT_CAPS.paintingPixelsLen);
    for (let i = 0; i < rawPixels.length; i++) rawPixels[i] = i % 12;
    const b64 = encodePaintingPixels(rawPixels);
    expect(decodePaintingPixels(b64)).toEqual(rawPixels);

    const painting = store.createPainting({
      author: 'npc:lark',
      createdAtDay: 3,
      title: 'Evening Canal',
      pixels: b64,
      paletteUsed: Array.from({ length: 12 }, (_, i) => i),
      caption: 'Warm lantern reflections on still canal water.',
      subject: 'canal at dusk',
      seed: 42,
      model: 'z-image-turbo',
      status: 'ready',
    });
    expect(painting.immutable).toBe(true);
    const view = store.view(painting.id)!;
    expect(view.id).toBe(painting.id);
    expect(view.kind).toBe('painting');
    expect('pixels' in view).toBe(false);
  });

  it('rejects paintings with > 16 unique colours or out-of-range palette indices', () => {
    const store = new ArtifactStore();
    const tooManyColors = new Uint8Array(ARTIFACT_CAPS.paintingPixelsLen);
    for (let i = 0; i < tooManyColors.length; i++) tooManyColors[i] = i % 20;
    expect(() =>
      store.createPainting({
        author: 'player',
        createdAtDay: 1,
        title: 'Invalid Palette Count',
        pixels: encodePaintingPixels(tooManyColors),
        paletteUsed: Array.from({ length: 20 }, (_, i) => i),
        caption: 'Too many colours.',
        subject: 'test',
        seed: 1,
        model: 'test',
        status: 'ready',
      }),
    ).toThrow(/16|colour|color/i);
  });

  it('validates referential integrity across inventory, ground drops, and display hooks', () => {
    const store = new ArtifactStore();
    const n1 = store.createNote({
      author: 'player',
      createdAtDay: 1,
      title: 'Note 1',
      body: 'Body 1',
    });
    const n2 = store.createNote({
      author: 'player',
      createdAtDay: 1,
      title: 'Note 2',
      body: 'Body 2',
    });

    expect(
      validateArtifactReferences(
        store.toJSON(),
        [n1.id],
        [],
        [{ sceneId: 1, propId: 'hook-1', artifactId: n2.id }],
      ).ok,
    ).toBe(true);

    // Duplicate reference (both held and on a wall hook) fails
    expect(
      validateArtifactReferences(
        store.toJSON(),
        [n1.id],
        [],
        [{ sceneId: 1, propId: 'hook-1', artifactId: n1.id }],
      ).ok,
    ).toBe(false);

    // Missing artifact reference fails
    expect(validateArtifactReferences(store.toJSON(), ['art:missing'], [], []).ok).toBe(false);
  });

  it('round-trips a full 512-artifact store under 3 MB and validates in < 50 ms', () => {
    const store = new ArtifactStore();
    const pixels = new Uint8Array(ARTIFACT_CAPS.paintingPixelsLen);
    for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 7) % 16;
    const encodedPixels = encodePaintingPixels(pixels);

    for (let i = 0; i < ARTIFACT_CAPS.maxArtifactsPerSave; i++) {
      if (i % 3 === 0) {
        store.createNote({
          author: 'player',
          createdAtDay: i,
          title: `Field Note #${i}`,
          body: Array.from(
            { length: 12 },
            (_, l) => `Line ${l} of note ${i} with observations.`,
          ).join('\n'),
        });
      } else if (i % 3 === 1) {
        store.createBook({
          author: 'npc:lark',
          createdAtDay: i,
          title: `Chronicle Volume #${i}`,
          pages: Array.from({ length: 6 }, (_, p) => ({
            heading: `Chapter ${p + 1}`,
            body: Array.from(
              { length: 10 },
              (__, l) => `Page ${p + 1} line ${l + 1} prose text.`,
            ).join('\n'),
          })),
        });
      } else {
        store.createPainting({
          author: 'npc:lark',
          createdAtDay: i,
          title: `Aqualia Study #${i}`,
          pixels: encodedPixels,
          paletteUsed: Array.from({ length: 16 }, (_, c) => c),
          caption: 'A quiet study of lanterns and bridges over the canal.',
          subject: 'canal bridge',
          seed: 1000 + i,
          model: 'z-image-turbo',
          status: 'ready',
        });
      }
    }

    expect(() =>
      store.createNote({ author: 'player', createdAtDay: 999, title: 'Overflow', body: 'No room' }),
    ).toThrow(/512|limit|cap/i);

    const exported = store.toJSON();
    const jsonBytes = new TextEncoder().encode(JSON.stringify(exported)).byteLength;
    expect(jsonBytes).toBeLessThan(3 * 1024 * 1024);

    // Best of three runs: a loaded CI worker can stall a single run; validation cost is what is asserted.
    let restored = ArtifactStore.fromJSON(exported);
    let elapsedMs = Infinity;
    for (let run = 0; run < 3; run++) {
      const t0 = performance.now();
      restored = ArtifactStore.fromJSON(exported);
      elapsedMs = Math.min(elapsedMs, performance.now() - t0);
    }
    expect(elapsedMs).toBeLessThan(50);
    expect(restored.size).toBe(ARTIFACT_CAPS.maxArtifactsPerSave);
    expect(ArtifactSchema.safeParse(exported[0]).success).toBe(true);
  });
});
