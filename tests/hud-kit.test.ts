import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { meterFraction, meterPixels } from '../src/presentation/ui/meters';
import { hudTime } from '../src/presentation/ui/state';
import { SimulationHost } from '../src/domain/simulation';
import { CONFIG } from '../src/domain/values';

it('verifies compiled UI derivatives in public/assets/generated/ui match build.json hashes', async () => {
  const manifest = JSON.parse(await readFile('public/assets/generated/ui/build.json', 'utf8')) as {
    derivatives: { file: string; sha256: string }[];
  };
  expect(manifest.derivatives.length).toBeGreaterThan(0);
  for (const record of manifest.derivatives) {
    const bytes = await readFile(`public/assets/generated/ui/${record.file}`);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256);
  }
});
it('clamps and quantizes only the visible fill while preserving the precise fraction', () => {
  for (const [v, pixels] of [
    [-1, 0],
    [0, 0],
    [0.501, 80],
    [1, 160],
    [2, 160],
    [NaN, 0],
    [Infinity, 0],
  ])
    expect(meterPixels(v!, 160)).toBe(pixels);
  expect(meterFraction(0.501)).toBe(0.501);
  expect(meterPixels(0.5, 24)).toBe(12);
  expect(meterPixels(1, 159)).toBe(158);
  expect(meterPixels(1, 0)).toBe(0);
});
for (const [hour, phase] of [
  [0, 'Night'],
  [4.999, 'Night'],
  [5, 'Dawn'],
  [8.999, 'Dawn'],
  [9, 'Day'],
  [16.999, 'Day'],
  [17, 'Dusk'],
  [20.999, 'Dusk'],
  [21, 'Night'],
  [23.999, 'Night'],
  [24, 'Night'],
] as const)
  it(`labels hour ${hour} as ${phase}`, () => {
    expect(
      hudTime({
        day: 0,
        hour,
        calendar: 'Mon · 08:00',
        weather: { kind: 'rain', intensity: 1, wind: 0 },
      }),
    ).toEqual({ day: 'Day 1', phase, clock: 'Mon · 08:00', weather: 'rain' });
  });
it('follows paused, accelerated calendar and restored snapshot time without wall time', () => {
  const host = new SimulationHost(42, 1, 0, 'kit-time');
  try {
    const initial = hudTime(host.frame());
    host.pauses.acquire('menu');
    host.advance(30);
    expect(hudTime(host.frame())).toEqual(initial);
    host.pauses.release('menu');
    host.calendar.advance((CONFIG.daySeconds * 2) / 3);
    const checkpoint = host.snapshot(),
      time = hudTime(host.frame());
    expect(time.day).toBe('Day 2');
    expect(time.phase).toBe('Night');
    host.calendar.advance(CONFIG.daySeconds / 3);
    expect(hudTime(host.frame()).phase).toBe('Dawn');
    host.restore(checkpoint);
    expect(hudTime(host.frame())).toEqual(time);
  } finally {
    host.dispose();
  }
});
