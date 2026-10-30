import { test, expect } from '@playwright/test';

test('HD overlays preserve focus, portrait identity, quality and saved outcomes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('http://127.0.0.1:11434/**', async (route) => {
    const tags = route.request().url().endsWith('/api/tags');
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        tags
          ? { models: [{ name: 'qwen2.5:3b', size: 1 }] }
          : { message: { content: JSON.stringify({ ready: true }) }, eval_count: 1 },
      ),
    });
  });
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'Connect & begin journey' }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 30000 });
  await expect(page.locator('#inventory-panel')).not.toBeVisible();
  await expect(page.locator('#inspection-panel')).not.toBeVisible();
  const canvas = page.locator('.game-viewport canvas');
  await expect(canvas).toHaveAttribute('width', '1920');
  const bounds = await canvas.boundingBox();
  expect(bounds!.width).toBe(1920);
  expect(bounds!.height).toBe(1080);
  await page.keyboard.press('i');
  await expect(page.locator('#inventory-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close inventory' })).toBeFocused();
  await page.keyboard.press('i');
  await expect(page.locator('#inventory-panel')).not.toBeVisible();
  await page.keyboard.press('f');
  await expect(page.locator('#inspection-panel')).toBeVisible();
  await page.getByRole('tab', { name: 'Villagers', exact: true }).click();
  const control = page.locator('[data-action="inspect-human"]').first();
  await control.focus();
  const stable = await control.evaluate((node) => {
    (window as unknown as { focusedControl: Element }).focusedControl = node;
    return true;
  });
  expect(stable).toBe(true);
  await page.waitForTimeout(450);
  expect(
    await control.evaluate(
      (node) =>
        node === (window as unknown as { focusedControl: Element }).focusedControl &&
        document.activeElement === node,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Close inspection' }).click();
  await page.keyboard.press('l');
  await expect(page.locator('#journal-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#journal-dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const before = await page.evaluate(() =>
    (
      window as unknown as { __hearthwild: { checkpoint(): Promise<unknown> } }
    ).__hearthwild.checkpoint(),
  );
  await page.getByLabel('Visual quality').selectOption('low');
  await page.getByLabel('Reduce motion').check();
  const after = await page.evaluate(() =>
    (
      window as unknown as { __hearthwild: { checkpoint(): Promise<unknown> } }
    ).__hearthwild.checkpoint(),
  );
  expect(after).toEqual(before);
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect
    .poll(async () => {
      const b = await canvas.boundingBox();
      return Math.round((b!.width / b!.height) * 1000);
    })
    .toBe(1778);
  await page.keyboard.press('f');
  await expect(page.locator('#inspection-panel')).toBeVisible();
  await page.screenshot({ path: 'artifacts/hd-overlays-1024.png' });
  expect(errors).toEqual([]);
});
