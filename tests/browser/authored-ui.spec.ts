import { expect, test } from '@playwright/test';

for (const sample of [
  { kind: 'book', width: 1920 },
  { kind: 'note', width: 1920 },
  { kind: 'book', width: 760 },
] as const)
  test(`approved ${sample.kind} UI preserves sealed text at ${sample.width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: sample.width, height: 1080 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.url().includes('/assets/generated/ui/') && !response.ok())
        errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto('/tests/browser/fixtures/book-screen.html');
    await page.waitForFunction(() => !!(window as any).BookScreen);
    await page.evaluate(async (kind) => {
      const lines = Array.from({ length: 24 }, (_, n) => `Line ${n + 1}: reeds and river light.`);
      const record = {
        id: 'art:1',
        kind,
        title: 'River journal',
        author: { kind: 'player' },
        createdDay: 1,
        sealed: true,
        revision: 1,
        ...(kind === 'book' ? { pages: [lines, ['Second page.'], ['Third page.']] } : { lines }),
      };
      const screen = new (window as any).BookScreen(document.getElementById('book-fixture'), {
        frame: () => ({
          session: 'approved-ui',
          inventory: [{ id: kind, artifact: 'art:1' }, null],
        }),
        content: async () => record,
        notify: (message: string) => {
          throw Error(message);
        },
        send: async () => ({ ok: true, message: '' }),
      });
      await screen.open(0);
    }, sample.kind);
    await expect(page.locator('#book-spread article')).toHaveCount(sample.kind === 'book' ? 2 : 1);
    await expect(page.locator('#book-spread')).toContainText('Line 24:');
    await expect(page.locator('#book-write')).toBeHidden();
    await expect(page.locator('#book-dialog')).toHaveAttribute('data-sealed', 'true');
    await expect(page.locator('#book-dialog')).toHaveAttribute('data-written', 'true');
    const styles = await page.evaluate(() => {
      const spread = document.getElementById('book-spread')!;
      return {
        background: getComputedStyle(spread).backgroundImage,
        page: getComputedStyle(spread.firstElementChild!).borderImageSource,
        seal: getComputedStyle(document.getElementById('book-provenance')!, '::after')
          .backgroundImage,
        icon: getComputedStyle(document.getElementById('book-heading')!, '::before')
          .backgroundImage,
      };
    });
    expect(sample.width < 800 ? styles.page : styles.background).toContain(
      sample.width < 800 || sample.kind === 'note'
        ? 'frame_note_page.png'
        : 'frame_book_spread.png',
    );
    expect(styles.seal).toContain('seal_stamp.png');
    expect(styles.icon).toContain(`artifact-${sample.kind}-written.png`);
    await page.screenshot({ path: info.outputPath(`${sample.kind}-${sample.width}.png`) });
    if (sample.kind === 'book') {
      await page.getByRole('button', { name: 'Next pages' }).click();
      await expect(page.locator('#book-spread')).toContainText('Third page.');
    }
    await page.getByRole('button', { name: 'Close book' }).click();
    await expect(page.locator('#book-dialog')).not.toBeVisible();
    expect(errors).toEqual([]);
  });
