import { describe, expect, it } from 'vitest';
import {
  BinaryHeap,
  CommandDispatcher,
  FixedStepClock,
  PauseController,
  RingBuffer,
  SeededRandom,
  WorldCalendar,
} from '../src/domain/core';
import { ContentRegistry, NPC_PROFILES, SETTLEMENTS } from '../src/content/definitions';
import { CONFIG, need } from '../src/domain/values';

describe('deterministic foundations', () => {
  it('restores random state and keeps stream consumption independent', () => {
    const root = new SeededRandom(42),
      a = root.fork('ecology'),
      b = root.fork('combat');
    const duplicate = root.fork('combat');
    a.next();
    a.next();
    expect(b.next()).toBe(duplicate.next());
    const restored = new SeededRandom(a.state);
    expect(restored.next()).toBe(a.next());
    expect(new SeededRandom(42).next()).not.toBe(new SeededRandom(43).next());
  });
  it('uses stable priorities in its heap', () => {
    const heap = new BinaryHeap<string>();
    heap.push('third', 3);
    heap.push('first', 1);
    heap.push('second', 1);
    expect([heap.pop(), heap.pop(), heap.pop(), heap.pop()]).toEqual([
      'first',
      'second',
      'third',
      undefined,
    ]);
  });
  it('bounds diagnostic history', () => {
    const ring = new RingBuffer<number>(2);
    [1, 2, 3].forEach((n) => ring.push(n));
    expect(ring.values()).toEqual([2, 3]);
  });
  it('never releases another pause owner', () => {
    const pause = new PauseController();
    pause.acquire('dialogue');
    pause.acquire('hidden');
    pause.acquire('hidden');
    pause.release('dialogue');
    expect(pause.paused).toBe(true);
    pause.release('hidden');
    expect(pause.paused).toBe(false);
  });
  it('discards elapsed paused time and bounds catch-up', () => {
    const clock = new FixedStepClock();
    let steps = 0;
    clock.consume(10000, true, () => steps++);
    clock.consume(17, false, () => steps++);
    expect(steps).toBe(0);
    clock.consume(17, false, () => steps++);
    expect(steps).toBe(1);
    clock.consume(10000, false, () => steps++);
    expect(steps).toBe(6);
  });
  it('uses absolute days for weeks and seasons', () => {
    const calendar = new WorldCalendar(0);
    calendar.advance(CONFIG.daySeconds * 7);
    expect(calendar.day).toBe(7);
    expect(calendar.weekday).toBe(0);
    expect(calendar.season).toBe(1);
    calendar.advance(CONFIG.daySeconds * 21);
    expect(calendar.season).toBe(0);
  });
  it('deduplicates commands and rejects obsolete sessions', () => {
    const dispatcher = new CommandDispatcher('current');
    expect(dispatcher.accept('1', 'old')).toMatch(/Obsolete/);
    expect(dispatcher.accept('1', 'current')).toBeNull();
    expect(dispatcher.accept('1', 'current')).toMatch(/already/);
  });
  it('validates normalized values and the complete content registries', () => {
    expect(() => need(NaN)).toThrow();
    expect(() => need(1.1)).toThrow();
    expect(need(0)).toBe(0);
    expect(() => new ContentRegistry().validate()).not.toThrow();
    expect(NPC_PROFILES).toHaveLength(30);
    expect(SETTLEMENTS).toHaveLength(9);
  });
});
