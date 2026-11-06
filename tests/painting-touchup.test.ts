import { describe, expect, it } from 'vitest';
import { SimulationHost } from '../src/domain/simulation';
import { send } from './helpers';
import { decodePaintingIndices, encodePaintingIndices } from '../src/domain/painting-pixels';
import { PAINTING_COLORS } from '../src/domain/painting-quantize';

describe('painting pixel touch-up (C21, AGT-6.7, spec §8.3)', () => {
  it('round-trips 1536 pixel indices to 1024 base64 chars losslessly', () => {
    const original = new Uint8Array(48 * 32);
    for (let i = 0; i < original.length; i++) {
      original[i] = i % 16;
    }
    const encoded = encodePaintingIndices(original);
    expect(encoded).toHaveLength(1024);
    expect(/^[A-Za-z0-9+/]+$/.test(encoded)).toBe(true);
    const decoded = decodePaintingIndices(encoded);
    expect(decoded).toEqual(original);
  });

  it('rejects malformed indices or invalid base64 payloads', () => {
    expect(() => encodePaintingIndices(new Uint8Array(100))).toThrow();
    expect(() => encodePaintingIndices(new Uint8Array(1536).fill(16))).toThrow();
    expect(() => decodePaintingIndices('too-short')).toThrow();
    expect(() => decodePaintingIndices('!'.repeat(1024))).toThrow();
  });

  it('allows the player to retouch kept unsealed paintings and bumps revision', () => {
    const host = new SimulationHost(42, 1, 0, 'world:touchup');
    send(host, { type: 'configurePainting', enabled: true });
    send(host, { type: 'pause', token: 'menu' });
    // Give player a canvas in slot 0
    host.inventory.set(0, host.inventory.create('canvas'));
    // Request painting
    const req = send(host, {
      type: 'paintingRequest',
      slot: 0,
      prompt: 'A tranquil riverbank',
      mood: 'quiet',
      composition: 'wide landscape',
    });
    expect(req.ok).toBe(true);
    const artifactId = req.artifactId!;

    // Deliver ready result from inference
    const rawPixels = new Uint8Array(48 * 32).fill(1);
    const palette = [PAINTING_COLORS[0]!, PAINTING_COLORS[1]!];
    const encoded = encodePaintingIndices(rawPixels);
    const result = send(
      host,
      {
        type: 'paintingResult',
        artifactId,
        revision: 1,
        result: {
          pixels: encoded,
          palette,
          caption: 'A tranquil riverbank with reeds.',
          render: {
            provider: 'sdcpp',
            model: 'z-image',
            seed: 42,
            steps: 8,
            width: 512,
            height: 352,
          },
        },
      },
      'inference',
    );
    expect(result.ok).toBe(true);

    const before = host.artifacts.get(artifactId as any)!;
    expect(before.kind).toBe('painting');
    if (before.kind !== 'painting') throw Error('Expected painting');
    const startRevision = before.revision;
    expect(before.sealed).toBe(false);

    // Touch up pixels on the unsealed painting (change pixel 0 to index 2 with an added palette color)
    const modified = new Uint8Array(rawPixels);
    modified[0] = 2;
    const newPalette = [...palette, PAINTING_COLORS[2]!];
    const touchUp = send(host, {
      type: 'paintingTouchUp',
      slot: 0,
      pixels: encodePaintingIndices(modified),
      palette: newPalette,
    });
    expect(touchUp.ok).toBe(true);
    expect(touchUp.message).toBe('Painting retouched.');

    const after = host.artifacts.get(artifactId as any)!;
    if (after.kind !== 'painting') throw Error('Expected painting');
    expect(after.revision).toBe(startRevision + 1);
    expect(after.palette).toEqual(newPalette);
    expect(decodePaintingIndices(after.pixels!)[0]).toBe(2);

    // Keep painting (which seals the finished work)
    expect(send(host, { type: 'paintingKeep', requestId: artifactId }).ok).toBe(true);
    const sealedRecord = host.artifacts.get(artifactId as any)!;
    expect(sealedRecord.sealed).toBe(true);
    expect(sealedRecord.kind).toBe('painting');
    if (sealedRecord.kind === 'painting') {
      expect(sealedRecord.status).toBe('ready');
    }

    // Sealed paintings reject further touch-up
    const sealedTouchUp = send(host, {
      type: 'paintingTouchUp',
      slot: 0,
      pixels: encodePaintingIndices(modified),
      palette: newPalette,
    });
    expect(sealedTouchUp.ok).toBe(false);
    expect(sealedTouchUp.message).toMatch(/sealed/);
  });

  it('rejects touch-up when not carrying a painting or with invalid palette', () => {
    const host = new SimulationHost(42, 1, 0, 'world:touchup:reject');
    host.inventory.set(0, { id: 'note', instance: 'note:1' });
    const emptyIndices = new Uint8Array(48 * 32);
    const rejectItem = send(host, {
      type: 'paintingTouchUp',
      slot: 0,
      pixels: encodePaintingIndices(emptyIndices),
      palette: [PAINTING_COLORS[0]!],
    });
    expect(rejectItem.ok).toBe(false);
    expect(rejectItem.message).toMatch(/Carry a painting/);
  });
});
