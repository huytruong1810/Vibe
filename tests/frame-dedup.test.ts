import { describe, expect, it } from 'vitest';
import { FrameDeduper } from '../scripts/lib/frame-dedup';

describe('FrameDeduper', () => {
  it('maps byte-identical frames to the first id seen', () => {
    const d = new FrameDeduper();
    expect(d.add('a', Buffer.from([1, 2, 3]))).toBe('a');
    expect(d.add('b', Buffer.from([4]))).toBe('b');
    expect(d.add('c', Buffer.from([1, 2, 3]))).toBe('a');
    expect(d.aliases()).toEqual(new Map([['c', 'a']]));
  });
  it('treats same-length different content as distinct', () => {
    const d = new FrameDeduper();
    d.add('a', Buffer.from([1, 2]));
    expect(d.add('b', Buffer.from([2, 1]))).toBe('b');
    expect(d.aliases().size).toBe(0);
  });
  it('reports how many frames were saved', () => {
    const d = new FrameDeduper();
    for (const id of ['x', 'y', 'z']) d.add(id, Buffer.from('same'));
    expect(d.savedFrames).toBe(2);
  });
});
