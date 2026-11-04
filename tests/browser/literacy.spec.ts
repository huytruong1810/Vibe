import { test, expect } from '@playwright/test';
import type { GameSave } from '../../src/domain/save-schema';
import { mkdir, writeFile } from 'node:fs/promises';
import { bookNotice, summarizeBookTrace } from './book-diagnostics';

test.use({
  // Keep Linux CI headless compositing and WebGL on the same software GLES driver.
  ...(process.env.CI && process.platform === 'linux'
    ? {
        launchOptions: {
          args: [
            '--enable-gpu',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
          ],
        },
      }
    : {}),
  trace: {
    mode: 'retain-on-failure',
    screenshots: false,
    snapshots: true,
  },
});

test('C18 writes three pages, seals and reopens a read-only spread', async ({ page, context }) => {
  const cpu = await context.newCDPSession(page);
  let tracing = false;
  let journeyPhase = 'navigate';
  let cpuSummary: ReturnType<typeof summarizeBookTrace> | { error: string } = {
    error: 'CPU trace not started',
  };
  const saveCpuTrace = async () => {
    if (!tracing) return;
    tracing = false;
    const complete = new Promise<{ stream?: string }>((resolve) =>
      cpu.once('Tracing.tracingComplete', resolve),
    );
    await cpu.send('Tracing.end');
    const { stream } = await complete;
    if (!stream) throw Error('Chromium did not return a CPU trace stream');
    const chunks: Buffer[] = [];
    try {
      for (;;) {
        const chunk = await cpu.send('IO.read', { handle: stream });
        chunks.push(Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8'));
        if (chunk.eof) break;
      }
      await mkdir('artifacts', { recursive: true });
      const trace = Buffer.concat(chunks);
      await writeFile('artifacts/c18-book-cpu.json', trace);
      cpuSummary = summarizeBookTrace(JSON.parse(trace.toString('utf8')).traceEvents);
    } catch (error) {
      cpuSummary = { error: `CPU trace collection failed: ${String(error).slice(0, 128)}` };
      throw error;
    } finally {
      await cpu.send('IO.close', { handle: stream });
    }
  };
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const saveDiagnostics = async () => {
    const diagnostics = await page
      .evaluate(() => {
        const measurements = performance
          .getEntriesByType('measure')
          .filter(
            (entry) =>
              entry.name === 'hearthwild:book-open' ||
              entry.name.startsWith('hearthwild:book-open:'),
          );
        return {
          workerWaits: (window as any).__hearthwild.bookDiagnostics(),
          viewport: { width: innerWidth, height: innerHeight },
          maximumPages: 48,
          mountedPages: document.querySelectorAll('#book-spread article').length,
          pageLabel: document.getElementById('book-pages')?.textContent ?? null,
          openingMs:
            measurements.find((entry) => entry.name === 'hearthwild:book-open')?.duration ?? null,
          phaseTimingsMs: Object.fromEntries(
            ['pause', 'content', 'render', 'show-modal'].map((phase) => [
              phase,
              measurements.find((entry) => entry.name === `hearthwild:book-open:${phase}`)
                ?.duration ?? null,
            ]),
          ),
          measurements: measurements.map(({ name, startTime, duration }) => ({
            name,
            startTime,
            duration,
          })),
        };
      })
      .catch((error: unknown) => ({ diagnosticError: String(error) }));
    await mkdir('artifacts', { recursive: true });
    await writeFile(
      'artifacts/c18-book-browser.json',
      JSON.stringify({ ...diagnostics, journeyPhase, cpuSummary, pageErrors: errors }, null, 2),
    );
    return diagnostics;
  };
  try {
    await page.goto('/?test=1');
    journeyPhase = 'start offline world';
    await page.getByRole('button', { name: 'Play without local AI', exact: true }).click();
    await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 60000 });
    journeyPhase = 'checkpoint blank book';
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const save: GameSave = await page.evaluate(() => (window as any).__hearthwild.checkpoint());
    save.inventory = [{ id: 'book', instance: `item:${++save.inventorySerial}` }, null];
    const importSave = async (value: GameSave) => {
      const session = await page.evaluate(() => (window as any).__hearthwild.frame().session);
      await page.locator('#import-input').setInputFiles({
        name: 'book.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(value)),
      });
      await expect
        .poll(() => page.evaluate(() => (window as any).__hearthwild.frame().session))
        .not.toBe(session);
    };
    journeyPhase = 'import blank book';
    await importSave(save);
    journeyPhase = 'open blank book';
    await page.getByRole('button', { name: 'Close settings' }).click();
    await page.locator('#inventory-button').click();
    const use = page.locator('[data-carry-slot="0"] button[data-action="use"]');
    await use.click();
    await expect(page.locator('#book-dialog')).toBeVisible();
    journeyPhase = 'reject overlong line';
    await page.locator('#book-title').fill('River diary');
    await page.locator('#book-text').fill('x'.repeat(97));
    await page.getByRole('button', { name: 'Add page', exact: true }).click();
    await expect(page.locator('#book-status')).toContainText('96 characters');
    await expect(page.locator('#book-text')).toHaveValue('x'.repeat(97));
    await expect(page.locator('#book-pages')).toHaveText('1 / 1');
    journeyPhase = 'write three pages';
    await page.locator('#book-text').fill('The tide is high.\nAqualia wakes beside the river.');
    await page.getByRole('button', { name: 'Add page', exact: true }).click();
    await expect(page.locator('#book-pages')).toHaveText('2 / 2');
    await page.locator('#book-text').fill('Second page: reeds and rain.');
    await page.getByRole('button', { name: 'Add page', exact: true }).click();
    await expect(page.locator('#book-pages')).toHaveText('3 / 3');
    await page.locator('#book-text').fill('Third page: the ferries return.');
    journeyPhase = 'seal book';
    await page.getByRole('button', { name: 'Seal', exact: true }).click();
    await expect(page.locator('#book-seal-confirm')).toBeVisible();
    await page.getByRole('button', { name: 'Seal permanently', exact: true }).click();
    await expect(page.locator('#book-provenance')).toContainText('Sealed');
    await expect(page.locator('#book-write')).toBeHidden();
    journeyPhase = 'reopen sealed spread';
    await page.getByRole('button', { name: 'Close book' }).click();
    await use.click();
    await expect(page.locator('#book-spread article')).toHaveCount(2);
    await expect(page.locator('#book-spread')).toContainText('The tide is high.');
    await expect(page.locator('#book-spread')).toContainText('Second page: reeds and rain.');
    journeyPhase = 'keyboard and gamepad turns';
    await page.locator('#book-close').focus();
    await page.keyboard.press('End');
    await expect(page.locator('#book-spread')).toContainText('Third page: the ferries return.');
    await page.keyboard.press('Home');
    await expect(page.locator('#book-pages')).toHaveText('1–2 / 3');
    await page.evaluate(() => {
      const state = { button: 5 as number | null };
      (window as any).__bookPad = state;
      Object.defineProperty(navigator, 'getGamepads', {
        configurable: true,
        value: () => [
          {
            connected: true,
            buttons: Array.from({ length: 16 }, (_, n) => ({ pressed: n === state.button })),
          },
        ],
      });
    });
    await expect(page.locator('#book-pages')).toHaveText('3 / 3');
    await page.evaluate(() => {
      (window as any).__bookPad.button = 4;
    });
    await expect(page.locator('#book-pages')).toHaveText('1–2 / 3');
    await page.evaluate(() => {
      (window as any).__bookPad.button = null;
    });
    journeyPhase = 'capture spread';
    await mkdir('artifacts', { recursive: true });
    await page.screenshot({ path: 'artifacts/c18-book-spread-1080p.png' });
    await page.getByRole('button', { name: 'Close book' }).click();
    await expect(use).toBeFocused();
    journeyPhase = 'checkpoint maximum book';
    // Warm on-demand opening of a maximum-size record still mounts only two pages.
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const full: GameSave = await page.evaluate(() => (window as any).__hearthwild.checkpoint());
    const book = full.artifacts.find((a) => a.id === full.inventory[0]!.artifact)!;
    if (book.kind !== 'book') throw Error('Expected book');
    book.pages = Array.from({ length: 48 }, (_, n) =>
      Array.from(
        { length: 24 },
        (_, line) => `Page ${n + 1} line ${line + 1}: ` + 'reeds '.repeat(11),
      ),
    );
    book.revision++;
    journeyPhase = 'import maximum book';
    await importSave(full);
    journeyPhase = 'start opening CPU trace';
    await page.getByRole('button', { name: 'Close settings' }).click();
    await cpu.send('Tracing.start', {
      categories:
        'devtools.timeline,v8,disabled-by-default-v8.cpu_profiler,blink.user_timing,toplevel,cc,gpu',
      transferMode: 'ReturnAsStream',
    });
    tracing = true;
    journeyPhase = 'open maximum spread';
    await use.click();
    // Closing retains the old articles; wait for the newly imported record to open.
    await expect(page.locator('#book-dialog')).toBeVisible();
    await expect(page.locator('#book-pages')).toHaveText('1–2 / 48');
    await expect(page.locator('#book-spread article')).toHaveCount(2);
    await saveCpuTrace();
    journeyPhase = 'assert opening measurements';
    const diagnostics = await saveDiagnostics();
    if (!('openingMs' in diagnostics)) throw Error(diagnostics.diagnosticError);
    expect(diagnostics.pageLabel).toBe('1–2 / 48');
    const { openingMs } = diagnostics;
    expect(openingMs).not.toBeNull();
    expect(openingMs).toBeLessThanOrEqual(100);
    expect(errors).toEqual([]);
    expect(diagnostics.measurements).toHaveLength(5);
    expect(
      Object.values(diagnostics.phaseTimingsMs).reduce<number>((sum, ms) => sum + (ms ?? 0), 0),
    ).toBeCloseTo(openingMs!, 5);
    journeyPhase = 'complete';
  } finally {
    try {
      await saveCpuTrace().catch((error: unknown) => {
        cpuSummary = { error: `CPU trace cleanup failed: ${String(error).slice(0, 128)}` };
      });
    } finally {
      try {
        const diagnostics = await saveDiagnostics();
        if (process.env.CI)
          console.log(
            `::notice title=C18 book opening diagnostics::${bookNotice({ ...diagnostics, journeyPhase, pageErrors: errors }, cpuSummary)}`,
          );
      } finally {
        await cpu.detach().catch((error: unknown) => {
          // Timeout teardown can close the target first; preserve the original failing operation.
          if (!page.isClosed()) throw error;
        });
      }
    }
  }
});
