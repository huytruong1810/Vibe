import { test, expect } from '@playwright/test';

test('procedural and authored Aqualia worlds load baked public/assets with zero pageerrors, console.errors, or 404s', async ({
  page,
}) => {
  test.setTimeout(120000);
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const notFoundUrls: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', (res) => {
    if (res.status() === 404) notFoundUrls.push(res.url());
  });
  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.goto('/?test=1');
  await page.locator('#authored-toggle').check();
  await page.getByRole('button', { name: 'Play without local AI' }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 30000 });
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              __hearthwild?: { frame(): { player?: { x: number; y: number } } | null };
            }
          ).__hearthwild?.frame()?.player?.x ?? 0,
      ),
    )
    .toBeGreaterThan(0);
  const worldSource = await page.evaluate(async () => {
    const save = await (
      window as unknown as { __hearthwild: { checkpoint(): Promise<{ worldSource?: string }> } }
    ).__hearthwild.checkpoint();
    return save.worldSource;
  });
  expect(worldSource).toBe('authored');
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(notFoundUrls).toEqual([]);
});
