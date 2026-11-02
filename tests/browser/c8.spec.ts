import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

test('Silver kit HUD keeps corners, focus and smaller desktop access', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.route('http://127.0.0.1:11434/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        route.request().url().endsWith('/api/tags')
          ? { models: [{ name: 'qwen2.5:3b', size: 1 }] }
          : { message: { content: JSON.stringify({ ready: true }) } },
      ),
    }),
  );
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'Connect & begin journey' }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 30000 });
  await expect(page.locator('#player-medallion img')).toBeVisible();
  expect(
    await page.locator('#inventory-button').evaluate((e) => getComputedStyle(e).fontFamily),
  ).toBe('Silver');
  expect(
    await page.locator('#inventory-button').evaluate((e) => getComputedStyle(e).fontSize),
  ).toBe('38px');
  await expect(page.locator('.action-hud')).toBeVisible();
  await page.screenshot({ path: 'docs/team/comms/codex/tmp/c8-hud-1080.png' });
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.keyboard.press('i');
    await expect(page.locator('#close-inventory')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#inventory-panel')).not.toBeVisible();
    await page.keyboard.press('f');
    await expect(page.locator('#inspection-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByText('Silver font by Poppy Works (CC BY 4.0)')).toBeAttached();
    await page.getByRole('button', { name: 'Close settings' }).click();
    await page.getByRole('button', { name: 'Close inspection' }).click();
  }
  await page.screenshot({ path: 'docs/team/comms/codex/tmp/c8-hud-1024.png' });
  expect(errors).toEqual([]);
});

test('packet viewer validates frames, offers legacy recovery and stays outside the game', async ({
  page,
}) => {
  let inference = 0;
  page.on('request', (r) => {
    if (r.url().includes(':11434')) inference++;
  });
  const bytes = await sharp({
    create: { width: 112, height: 112, channels: 4, background: '#79bdbe' },
  })
    .png()
    .toBuffer();
  const hash = createHash('sha256').update(bytes).digest('hex');
  const rect = { x: 0, y: 0, w: 112, h: 112 };
  const fixture = {
    schemaVersion: 1,
    status: 'candidate',
    asset: 'test-only',
    sourceDigest: 'a'.repeat(64),
    frames: [
      {
        id: 'f',
        pageId: 'f',
        textureKey: 'f',
        file: 'frames/idle/s_0.png',
        sha256: hash,
        rect,
        trim: rect,
        sourceSize: { w: 112, h: 112 },
        anchor: { x: 0.5, y: 82 / 112 },
        anchorPx: { x: 56, y: 82 },
        sockets: { Socket_Head: { x: 56, y: 32 } },
      },
    ],
    clips: [
      {
        id: 'idle',
        appearanceId: 'test-only',
        state: 'idle',
        facing: 's',
        frameIds: ['f'],
        fps: 6,
        playback: 'loop',
      },
    ],
  };
  await page.route('**/art/review/test-packet/review.json', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }),
  );
  await page.route('**/art/review/test-packet/frames/**', (r) =>
    r.fulfill({ contentType: 'image/png', body: bytes }),
  );
  await page.goto('/?gallery=1');
  await page.getByText('Forge packet · candidate review', { exact: true }).click();
  await page.getByLabel('Packet directory').fill('test-packet');
  await page.getByRole('button', { name: 'Load packet', exact: true }).click();
  await expect(page.locator('.packet-review [role=status]')).toContainText('1 frames');
  await expect(page.locator('#setup-dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  // Capture the registered fixture, not a claim about Rivallie's visual quality.
  await page.screenshot({ path: 'docs/team/comms/codex/tmp/c8-packet-fixture.png' });
  await page.route('**/art/review/legacy-packet/review.json', (r) =>
    r.fulfill({ status: 404, body: 'missing' }),
  );
  await page.getByLabel('Packet directory').fill('legacy-packet');
  await page.getByRole('button', { name: 'Load packet', exact: true }).click();
  await expect(page.locator('.packet-review [role=status]')).toContainText('Legacy packet');
  await expect(page.locator('.packet-review a').first()).toHaveAttribute(
    'href',
    '/art/review/legacy-packet/contact.png',
  );
  fixture.frames[0]!.sha256 = '0'.repeat(64);
  await page.getByLabel('Packet directory').fill('test-packet');
  await page.getByRole('button', { name: 'Load packet', exact: true }).click();
  await expect(page.locator('.packet-review [role=status]')).toContainText('digest mismatch');
  expect(inference).toBe(0);
});

test('obsolete and malformed packet loads cannot replace the current candidate', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/art/review/slow/review.json', async (route) => {
    await gate;
    await route
      .fulfill({ contentType: 'application/json', body: '{"status":"approved"}' })
      .catch(() => {});
  });
  await page.route('**/art/review/invalid/review.json', (r) =>
    r.fulfill({ contentType: 'application/json', body: '{"status":"approved"}' }),
  );
  await page.goto('/?gallery=1');
  await page.getByText('Forge packet · candidate review', { exact: true }).click();
  const input = page.getByLabel('Packet directory'),
    load = page.getByRole('button', { name: 'Load packet', exact: true });
  await input.fill('slow');
  await load.click();
  await page.route('**/art/review/legacy-packet/review.json', (r) =>
    r.fulfill({ status: 404, body: 'missing' }),
  );
  await input.fill('legacy-packet');
  await load.click();
  await expect(page.locator('.packet-review [role=status]')).toContainText('Legacy packet');
  release();
  // The invalid current load should report validation; the obsolete load stays ignored.
  await input.fill('invalid');
  await load.click();
  await expect(page.locator('.packet-review [role=status]')).toContainText('schemaVersion');
});
