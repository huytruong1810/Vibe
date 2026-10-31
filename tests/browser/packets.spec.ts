import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('delivered creature packets play every supplied facing clip without activation', async ({
  page,
}) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?gallery=1');
  await page.getByText('Forge packet · candidate review', { exact: true }).click();
  for (const name of ['rivallie', 'bramblefang']) {
    const packet = JSON.parse(
      await readFile(`art/review/2026-10-31-${name}/review.json`, 'utf8'),
    ) as { clips: { id: string; state: string; facing: string; frameIds: string[] }[] };
    await page.getByLabel('Packet directory').fill(`2026-10-31-${name}`);
    await page.getByRole('button', { name: 'Load packet', exact: true }).click();
    const status = page.locator('.packet-review [role=status]');
    await expect(status).toContainText(`Candidate ${name}`);
    for (const clip of packet.clips.filter((c) =>
      ['idle', 'walk', 'run', 'attack', 'sleep', 'downed'].includes(c.state),
    )) {
      await page.getByLabel('Packet clip', { exact: true }).selectOption(clip.id);
      await expect(status).toHaveAttribute('data-clip', clip.id);
      await expect(status).toContainText(`${clip.facing} · ${clip.frameIds.length} frames`);
    }
    const walk = packet.clips.find((c) => c.state === 'walk' && c.facing === 's')!;
    await page.getByLabel('Packet clip', { exact: true }).selectOption(walk.id);
    await expect(status).toContainText('8 frames');
    await page.getByRole('button', { name: 'Step', exact: true }).click();
    await page.getByLabel('Packet magnification').selectOption('4');
    await page
      .locator('.packet-review')
      .screenshot({ path: `docs/team/comms/codex/tmp/${name}-packet-gallery.png` });
  }
  await expect(page.locator('#setup-dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});
