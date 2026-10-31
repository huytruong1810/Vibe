import { expect, test, type Page } from '@playwright/test';
import type { RenderSnapshot } from '../../src/domain/contracts';

type UiFrame = Pick<RenderSnapshot, 'equipment' | 'inventory' | 'drops'> & {
  readonly guarding: boolean;
};
async function view(page: Page): Promise<UiFrame> {
  return page.evaluate(() => {
    const frame = (
      window as unknown as { __hearthwild: { frame(): RenderSnapshot } }
    ).__hearthwild.frame();
    // Packed render buffers have already been recycled; only copy the UI-owned read models.
    return {
      equipment: frame.equipment,
      inventory: frame.inventory,
      drops: frame.drops,
      guarding: frame.player.guarding ?? false,
    };
  });
}

test('worn gear uses keyboard actions, carried capacity stays two, and guard releases for a modal', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('http://127.0.0.1:11434/**', async (route) => {
    const request = route.request();
    const data = request.postDataJSON() as { format?: { properties?: { ready?: object } } } | null;
    const response = request.url().endsWith('/api/tags')
      ? { models: [{ name: 'qwen2.5:3b', size: 1900000000 }] }
      : {
          message: {
            content: JSON.stringify(
              data?.format?.properties?.ready
                ? { ready: true }
                : {
                    dialogue: 'The river has many quiet places.',
                    emotion: 'neutral',
                    action: { type: 'NONE' },
                  },
            ),
          },
          eval_count: 20,
        };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify(response),
    });
  });
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'Connect & begin journey' }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 30_000 });
  const initial = await view(page);
  const torso = initial.equipment.worn.torso!;
  expect(torso).not.toBeNull();
  await page.keyboard.press('i');
  await expect(page.getByRole('region', { name: 'Worn equipment' })).toBeVisible();
  const worn = (slot: string) => page.locator(`[data-gear-slot="${slot}"]`);
  const carried = (slot: number) => page.locator(`[data-carry-slot="${slot}"]`);
  await worn('torso').focus();
  await page.keyboard.press('u');
  await expect.poll(async () => (await view(page)).equipment.worn.torso).toBeNull();
  await expect.poll(async () => (await view(page)).inventory[0]?.instance).toBe(torso.instance);
  await carried(0).focus();
  await page.keyboard.press('e');
  await expect
    .poll(async () => (await view(page)).equipment.worn.torso?.instance)
    .toBe(torso.instance);
  await expect.poll(async () => (await view(page)).inventory[0]).toBeNull();
  for (const slot of ['legs', 'feet']) {
    await worn(slot).focus();
    await page.keyboard.press('u');
    await expect
      .poll(async () => (await view(page)).equipment.worn[slot as 'legs' | 'feet'])
      .toBeNull();
  }
  const full = await view(page);
  expect(full.inventory).toHaveLength(2);
  expect(full.inventory.every(Boolean)).toBe(true);
  await worn('torso').focus();
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await view(page)).equipment.worn.torso).toBeNull();
  const dropped = await view(page);
  expect(dropped.inventory).toEqual(full.inventory);
  expect(dropped.drops.some((drop) => drop.instance === torso.instance)).toBe(true);
  await expect(page.locator('#ammunition-status')).toContainText('Ammunition: 0');
  await page.getByRole('button', { name: 'Close inventory' }).click();
  await page.locator('#game-viewport').click({ position: { x: 20, y: 20 } });
  await page.keyboard.down('g');
  await expect.poll(async () => (await view(page)).guarding).toBe(true);
  await page.keyboard.press('m');
  await expect(page.locator('#map-dialog')).toBeVisible();
  await expect.poll(async () => (await view(page)).guarding).toBe(false);
  await expect(page.getByRole('navigation', { name: 'Map breadcrumb' })).toBeVisible();
  await page.keyboard.up('g');
  await page.getByRole('button', { name: 'Close map' }).click();
  expect(errors).toEqual([]);
});
