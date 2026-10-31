import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { expect, it } from 'vitest';
import { BAR_PARTS, compileBarStrip } from '../scripts/ui-build';
import { meterFraction, meterPixels } from '../src/presentation/ui/meters';
import { hudTime } from '../src/presentation/ui/state';
import { SimulationHost } from '../src/domain/simulation';
import { CONFIG } from '../src/domain/values';

for (const kind of Object.keys(BAR_PARTS) as (keyof typeof BAR_PARTS)[]) {
  it(`compiles ${kind} losslessly from authored two-pixel blocks`, async () => {
    const source = await readFile(`art/source/ui/kit/export/bar_${kind}.png`);
    const a = await compileBarStrip(source, kind),
      b = await compileBarStrip(source, kind);
    expect(a.equals(b)).toBe(true);
    const { data, info } = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([
      BAR_PARTS[kind].segment,
      BAR_PARTS[kind].height - 8,
    ]);
    const expected = await sharp(source)
      .extract({ left: 4, top: 4, width: info.width, height: info.height })
      .ensureAlpha()
      .raw()
      .toBuffer();
    expect(data.equals(expected)).toBe(true);
    for (let y = 0; y < info.height; y += 2)
      for (let x = 0; x < info.width; x += 2) {
        const pixel = (dx: number, dy: number) =>
          data.subarray(
            ((y + dy) * info.width + x + dx) * 4,
            ((y + dy) * info.width + x + dx) * 4 + 4,
          );
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
          [1, 1],
        ])
          expect(pixel(dx!, dy!).equals(pixel(0, 0))).toBe(true);
      }
    const manifest = JSON.parse(
      await readFile('public/assets/generated/ui/build.json', 'utf8'),
    ) as { derivatives: { file: string; sha256: string; sourceSha256: string }[] };
    const record = manifest.derivatives.find((d) => d.file === `bar_${kind}_fill.png`)!;
    expect(record.sha256).toBe(createHash('sha256').update(a).digest('hex'));
    expect(record.sourceSha256).toBe(createHash('sha256').update(source).digest('hex'));
    expect((await readFile(`public/assets/generated/ui/${record.file}`)).equals(a)).toBe(true);
  });
}
it('rejects a kit with unexpected native dimensions', async () => {
  await expect(
    compileBarStrip(
      await sharp({ create: { width: 10, height: 10, channels: 4, background: '#ffffff' } })
        .png()
        .toBuffer(),
      'hp',
    ),
  ).rejects.toThrow('dimensions');
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
