import { expect, test } from '@playwright/test';

for (const newerDraft of ['x'.repeat(97), 'Newer valid draft'])
  test(`book preserves a ${newerDraft.length > 96 ? 'rejected' : 'valid'} draft arriving during autosave`, async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto('/tests/browser/fixtures/book-screen.html');
    await page.waitForFunction(() => !!(window as any).BookScreen);
    await page.evaluate(async () => {
      let record: any = null;
      const writes: any[] = [];
      let additions = 0;
      let finishWrite: (() => void) | undefined;
      const screen = new (window as any).BookScreen(document.getElementById('book-fixture'), {
        frame: () => ({ session: 'draft-regression', inventory: [{ id: 'book' }, null] }),
        content: async () => record,
        notify: (message: string) => {
          throw Error(message);
        },
        send: async (command: any) => {
          if (command.type === 'artifactWrite') {
            writes.push(command);
            if (writes.length === 1)
              await new Promise<void>((resolve) => {
                finishWrite = resolve;
              });
            record = {
              id: 'art:1',
              kind: 'book',
              title: command.title,
              author: { kind: 'player' },
              createdDay: 0,
              sealed: false,
              pages: [command.lines],
            };
            return { ok: true, artifactId: record.id, message: 'Page saved.' };
          }
          if (command.type === 'artifactPageAdd') {
            additions++;
            record.pages.push([]);
            return { ok: true, artifactId: record.id, message: 'Page added.' };
          }
          return { ok: true, message: '' };
        },
      });
      (window as any).draftFixture = {
        writes,
        additions: () => additions,
        finish: () => finishWrite!(),
      };
      await screen.open(0);
    });
    await page.locator('#book-title').fill('River diary');
    await page.locator('#book-text').fill('Original draft');
    await page.clock.fastForward(500);
    await expect(page.locator('#book-text')).toBeDisabled();
    // Reproduce an input event queued before the async save locked its controls.
    await page.evaluate((text) => {
      const editor = document.getElementById('book-text') as HTMLTextAreaElement;
      editor.value = text;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      (window as any).draftFixture.finish();
    }, newerDraft);
    await expect(page.locator('#book-text')).toBeEnabled();
    await expect(page.locator('#book-text')).toHaveValue(newerDraft);
    if (newerDraft.length > 96) {
      await page.getByRole('button', { name: 'Add page', exact: true }).click();
      await expect(page.locator('#book-status')).toContainText('96 characters');
      await expect(page.locator('#book-pages')).toHaveText('1 / 1');
      expect(await page.evaluate(() => (window as any).draftFixture.additions())).toBe(0);
      expect(await page.evaluate(() => (window as any).draftFixture.writes.length)).toBe(1);
      await expect(page.locator('#book-text')).toHaveValue(newerDraft);
    } else {
      expect(
        await page.evaluate(() =>
          (window as any).draftFixture.writes.map((write: any) => write.lines),
        ),
      ).toEqual([['Original draft'], [newerDraft]]);
    }
  });
