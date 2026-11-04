import { expect, it } from 'vitest';
import { bookNotice, summarizeBookTrace } from './browser/book-diagnostics';

it('summarizes engine work overlapping the opening on Chromium tracing clocks without summing nested work', () => {
  const summary = summarizeBookTrace([
    { name: 'thread_name', ph: 'M', pid: 1, tid: 1, ts: 0, args: { name: 'CrRendererMain' } },
    { name: 'thread_name', ph: 'M', pid: 1, tid: 2, ts: 0, args: { name: 'DedicatedWorker' } },
    { name: 'hearthwild:book-open', ph: 'b', pid: 1, tid: 1, ts: 10000 },
    { name: 'hearthwild:book-open', ph: 'e', pid: 1, tid: 2, ts: 11000 },
    { name: 'hearthwild:book-open', ph: 'e', pid: 1, tid: 1, ts: 20000 },
    { name: 'RunTask', ph: 'X', pid: 1, tid: 1, ts: 0, dur: 30000 },
    { name: 'Paint', ph: 'X', pid: 1, tid: 1, ts: 11000, dur: 7000 },
    { name: 'Paint', ph: 'X', pid: 1, tid: 1, ts: 19000, dur: 500 },
    { name: 'TimerFire', ph: 'X', pid: 1, tid: 2, ts: 8000, dur: 4000 },
    { name: 'Outside', ph: 'X', pid: 1, tid: 1, ts: 21000, dur: 10000 },
  ]);
  expect(summary.windowMs).toBe(10);
  expect(summary.main).toEqual([
    ['CrRendererMain:RunTask:', -10, 30, 10],
    ['CrRendererMain:Paint:', 1, 7, 7],
  ]);
  expect(summary.other).toEqual([['DedicatedWorker:TimerFire:', -2, 4, 2]]);
  expect(summarizeBookTrace([])).toMatchObject({ error: 'No completed book opening in CPU trace' });
});

it('keeps a valid public notice below the annotation limit with total/phases first and complete artifacts separate', () => {
  const work = Array.from({ length: 32 }, (_, n) => ({
    name: '界'.repeat(100),
    start: n,
    end: n + 50,
  }));
  const notice = bookNotice(
    {
      openingMs: 636.8,
      phaseTimingsMs: { pause: 320.7, content: 312.4, render: 0.1, 'show-modal': 3.6 },
      mountedPages: 2,
      pageLabel: '1–2 / 48',
      pageErrors: ['界'.repeat(200)],
      workerWaits: {
        start: 0,
        main: work,
        requests: Array.from({ length: 8 }, (_, n) => ({
          id: `request:${n}`,
          type: 'artifactContent',
          dispatched: 0,
          resolved: 310,
          worker: {
            requestId: `request:${n}`,
            received: 10000,
            serviceEnd: 10000.4,
            reply: 10000.4,
            recent: work,
          },
        })),
      },
    },
    {
      windowMs: 636.8,
      main: Array(6).fill(['界'.repeat(80), 0, 300, 300]),
      other: Array(4).fill(['界'.repeat(80), 0, 300, 300]),
    },
  );
  expect(Buffer.byteLength(notice, 'utf8')).toBeLessThanOrEqual(3500);
  const parsed = JSON.parse(notice);
  expect(parsed.openingMs).toBe(636.8);
  expect(parsed.phaseTimingsMs.content).toBe(312.4);
  expect(parsed.mountedPages).toBe(2);
  expect(parsed.pageLabel).toBe('1–2 / 48');
  expect(parsed.requests.map((r: { id: string }) => r.id)).toEqual([
    'request:4',
    'request:5',
    'request:6',
    'request:7',
  ]);
});
