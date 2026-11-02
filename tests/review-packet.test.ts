import { describe, expect, it } from 'vitest';
import { ReviewPacketSchema, packetBase } from '../src/presentation/assets/review-packet';
import { experienceFraction } from '../src/presentation/ui/exploration';

export const packetFixture = () => ({
  schemaVersion: 1,
  status: 'candidate',
  asset: 'rivallie',
  sourceDigest: 'a'.repeat(64),
  frames: [
    {
      id: 'idle:s:0',
      pageId: 'idle:s:0',
      textureKey: 'idle:s:0',
      file: 'frames/idle/s_0.png',
      sha256: 'b'.repeat(64),
      rect: { x: 0, y: 0, w: 112, h: 112 },
      trim: { x: 0, y: 0, w: 112, h: 112 },
      sourceSize: { w: 112, h: 112 },
      anchor: { x: 0.5, y: 82 / 112 },
      anchorPx: { x: 56, y: 82 },
      sockets: { Socket_Head: { x: 56, y: 32 } },
    },
  ],
  clips: [
    {
      id: 'idle:s',
      appearanceId: 'rivallie',
      state: 'idle',
      facing: 's',
      frameIds: ['idle:s:0'],
      fps: 6,
      playback: 'loop',
    },
  ],
});
describe('candidate review boundary', () => {
  it('accepts registered frames with shared v2 contracts', () =>
    expect(ReviewPacketSchema.parse(packetFixture()).status).toBe('candidate'));
  it('rejects activation, external paths and traversal', () => {
    expect(ReviewPacketSchema.safeParse({ ...packetFixture(), status: 'approved' }).success).toBe(
      false,
    );
    for (const name of ['../secrets', 'https://host/x', '%2e%2e', '/absolute', 'a/b'])
      expect(() => packetBase(name)).toThrow();
    const p = packetFixture();
    p.frames[0]!.file = '../../secret.png';
    expect(ReviewPacketSchema.safeParse(p).success).toBe(false);
  });
  it('rejects missing/duplicate frames, bad registration and oversized canvases', () => {
    const missing = packetFixture();
    missing.clips[0]!.frameIds = ['absent'];
    expect(ReviewPacketSchema.safeParse(missing).success).toBe(false);
    const duplicate = packetFixture();
    duplicate.frames.push(duplicate.frames[0]!);
    expect(ReviewPacketSchema.safeParse(duplicate).success).toBe(false);
    const anchor = packetFixture();
    anchor.frames[0]!.anchorPx.y = 90;
    expect(ReviewPacketSchema.safeParse(anchor).success).toBe(false);
    const size = packetFixture();
    size.frames[0]!.sourceSize.w = 2048;
    expect(ReviewPacketSchema.safeParse(size).success).toBe(false);
  });
});
it('shows bounded XP progress using existing level thresholds', () => {
  expect(experienceFraction(0, 1)).toBe(0);
  expect(experienceFraction(25, 2)).toBe(0);
  expect(experienceFraction(62.5, 2)).toBe(0.5);
  expect(experienceFraction(1e9, 2)).toBe(1);
  expect(experienceFraction(1, 50)).toBe(1);
});
