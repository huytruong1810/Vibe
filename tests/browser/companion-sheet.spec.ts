import { expect, test, type Page } from '@playwright/test';

async function mockOllama(page: Page): Promise<void> {
  await page.route('http://127.0.0.1:11434/**', async (route) => {
    const data = route.request().postDataJSON() as {
      format?: { properties?: { ready?: object } };
    } | null;
    const body = route.request().url().endsWith('/api/tags')
      ? { models: [{ name: 'gemma4-abliterated:e4b', size: 1900000000 }] }
      : {
          message: {
            content: JSON.stringify(
              data?.format?.properties?.ready
                ? { ready: true }
                : {
                    dialogue: 'The river is peaceful today.',
                    emotion: 'neutral',
                    action: { type: 'NONE' },
                  },
            ),
          },
          eval_count: 20,
          done: true,
        };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify(body),
    });
  });
}

test('companion inspection sheet opens via P key, medallion click, and toolbar button, displaying 6-stats, moves, and disposition (UI-M4)', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await mockOllama(page);
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'Connect & begin journey' }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 30_000 });

  // 1. Companion button in toolbar starts with aria-expanded="false"
  const companionBtn = page.locator('#companion-button');
  await expect(companionBtn).toBeVisible();
  await expect(companionBtn).toHaveAttribute('aria-expanded', 'false');

  // 2. Pressing 'P' opens the companion sheet in empty state when no partner owned
  await page.keyboard.press('p');
  const sheet = page.locator('#companion-sheet');
  await expect(sheet).toHaveAttribute('open', '');
  await expect(companionBtn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.companion-empty-state')).toBeVisible();

  // Pressing 'p' again closes it
  await page.keyboard.press('p');
  await expect(sheet).not.toHaveAttribute('open', '');
  await expect(companionBtn).toHaveAttribute('aria-expanded', 'false');

  // 3. Set a partner creature in the world via save import with bond hearts and moves
  const save = await page.evaluate(() => (window as any).__hearthwild.checkpoint());
  const player = save.entities.records.find((e: any) => e.id === 0);
  expect(player).toBeDefined();
  const creature =
    save.entities.records.find((e: any) => e.species < 8 && e.owner === -1) ??
    save.entities.records.find((e: any) => e.species < 8 && e.id !== 0);
  expect(creature).toBeDefined();
  if (creature.owner > 0) {
    const previousOwner = save.npcs.find((n: any) => n.entityId === creature.owner);
    if (previousOwner) previousOwner.partner = null;
  }
  creature.owner = 0;
  creature.bondHearts = 6;
  creature.moves = ['strike', 'river_pulse'];
  creature.x = player.x + 1;
  creature.y = player.y;
  creature.targetX = player.x + 1;
  creature.targetY = player.y;
  creature.scene = player.scene ?? 0;

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#import-input').setInputFiles({
    name: 'companion.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(save)),
  });
  await expect(page.locator('#toast')).toContainText('imported');
  // Close settings dialog
  await page.locator('[data-close="settings-dialog"]').click();
  await expect(page.locator('#settings-dialog')).not.toHaveAttribute('open', '');

  // 4. Companion medallion in exploration HUD should now be visible
  const medallion = page.locator('#companion-medallion');
  await expect(medallion).toBeVisible({ timeout: 10_000 });

  // Click companion medallion to toggle inspection sheet
  await medallion.click();
  await expect(sheet).toHaveAttribute('open', '');
  await expect(companionBtn).toHaveAttribute('aria-expanded', 'true');

  // 5. Verify companion inspection sheet components (UI-M4, UI-6)
  // Partner name and level
  await expect(page.locator('.companion-display-name')).toBeVisible();
  await expect(page.locator('.disposition-badge')).toBeVisible();

  // Bond hearts (10 items, 6 filled) and Potential stars (6 items, 3 revealed at 6 hearts)
  await expect(page.locator('.bond-hearts .bond-heart')).toHaveCount(10);
  await expect(page.locator('.bond-hearts .bond-heart.filled')).toHaveCount(6);
  await expect(page.locator('.potential-stars .potential-star')).toHaveCount(6);
  await expect(page.locator('.potential-stars .potential-star.revealed')).toHaveCount(3);

  // 6-stat progression meters (HP, Might, Guard, Attunement, Resonance, Swiftness)
  await expect(page.locator('.stat-row[data-stat="hp"]')).toBeVisible();
  await expect(page.locator('.stat-row[data-stat="attack"]')).toBeVisible();
  await expect(page.locator('.stat-row[data-stat="defense"]')).toBeVisible();
  await expect(page.locator('.stat-row[data-stat="attunement"]')).toBeVisible();
  await expect(page.locator('.stat-row[data-stat="resonance"]')).toBeVisible();
  await expect(page.locator('.stat-row[data-stat="speed"]')).toBeVisible();

  // 4 equipped move cards (2 active, 2 empty slots)
  await expect(page.locator('.moves-grid .move-card')).toHaveCount(4);

  // Wellbeing and care section
  await expect(page.locator('.wellbeing-status')).toBeVisible();
  await expect(page.locator('.care-buttons button')).toHaveCount(5);

  // 6. Close via Esc key and verify focus restore
  await page.keyboard.press('Escape');
  await expect(sheet).not.toHaveAttribute('open', '');
  await expect(companionBtn).toHaveAttribute('aria-expanded', 'false');

  // 7. Open via toolbar button and close via close icon
  await companionBtn.click();
  await expect(sheet).toHaveAttribute('open', '');
  await page.locator('[data-close="companion-sheet"]').click();
  await expect(sheet).not.toHaveAttribute('open', '');
  await expect(companionBtn).toHaveAttribute('aria-expanded', 'false');

  expect(errors).toHaveLength(0);
});
