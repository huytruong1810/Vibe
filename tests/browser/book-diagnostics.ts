import type { WorkerTiming, WorkTiming } from '../../src/domain/contracts';

interface TraceEvent {
  name: string;
  ph: string;
  pid: number;
  tid: number;
  ts: number;
  dur?: number;
  args?: { name?: string; data?: { functionName?: string } };
}
const round = (value: number): number => Math.round(value * 10) / 10;

/** Trace timestamps share Chromium's tracing clock, unlike the two request clocks. */
export function summarizeBookTrace(events: readonly TraceEvent[]) {
  const begin = events.find((e) => e.name === 'hearthwild:book-open' && e.ph === 'b');
  const end = events.find(
    (e) =>
      e.name === 'hearthwild:book-open' &&
      e.ph === 'e' &&
      e.pid === begin?.pid &&
      e.tid === begin.tid &&
      e.ts >= begin.ts,
  );
  if (!begin || !end)
    return { error: 'No completed book opening in CPU trace', main: [], other: [] };
  const threads = new Map(
    events
      .filter((e) => e.name === 'thread_name')
      .map((e) => [`${e.pid}:${e.tid}`, e.args?.name ?? 'unknown']),
  );
  const longest = (main: boolean, limit: number) => {
    const byName = new Map<string, { event: TraceEvent; overlap: number }>();
    for (const event of events) {
      if (
        event.ph !== 'X' ||
        !event.dur ||
        (event.pid === begin.pid && event.tid === begin.tid) !== main
      )
        continue;
      const overlap = Math.min(end.ts, event.ts + event.dur) - Math.max(begin.ts, event.ts);
      if (overlap < 500) continue;
      const key = `${threads.get(`${event.pid}:${event.tid}`)}:${event.name}:${event.args?.data?.functionName ?? ''}`;
      if (overlap > (byName.get(key)?.overlap ?? 0)) byName.set(key, { event, overlap });
    }
    return [...byName.entries()]
      .sort((a, b) => b[1].overlap - a[1].overlap)
      .slice(0, limit)
      .map(([name, { event, overlap }]) => [
        name.slice(0, 80),
        round((event.ts - begin.ts) / 1000),
        round(event.dur! / 1000),
        round(overlap / 1000),
      ]);
  };
  return {
    windowMs: round((end.ts - begin.ts) / 1000),
    main: longest(true, 6),
    other: longest(false, 4),
  };
}

interface BookReceipt {
  journeyPhase?: string;
  openingMs?: number | null;
  phaseTimingsMs?: Record<string, number | null>;
  mountedPages?: number;
  pageLabel?: string | null;
  pageErrors?: readonly string[];
  diagnosticError?: string;
  workerWaits?: {
    start: number;
    requests: readonly {
      id: string;
      type: string;
      dispatched: number;
      resolved?: number;
      worker?: WorkerTiming;
    }[];
    main: readonly WorkTiming[];
  } | null;
}

/** GitHub notices truncate around 4 KiB; the artifact retains the complete receipt. */
export function bookNotice(
  receipt: BookReceipt,
  cpu: ReturnType<typeof summarizeBookTrace> | { error: string },
): string {
  const main = [...(receipt.workerWaits?.main ?? [])]
    .sort((a, b) => b.end - b.start - (a.end - a.start))
    .slice(0, 8)
    .map((e) => [
      e.name.slice(0, 32),
      round(e.start - receipt.workerWaits!.start),
      round(e.end - e.start),
    ]);
  const requests = receipt.workerWaits?.requests.slice(-4).map((r) => ({
    id: r.id.slice(-96),
    type: r.type.slice(0, 24),
    waitMs: r.resolved === undefined ? null : round(r.resolved - r.dispatched),
    serviceMs: r.worker ? round(r.worker.serviceEnd - r.worker.received) : null,
    recent: [...(r.worker?.recent ?? [])]
      .sort((a, b) => b.end - b.start - (a.end - a.start))
      .slice(0, 3)
      .map((e) => [
        e.name.slice(0, 32),
        round(e.start - r.worker!.received),
        round(e.end - e.start),
      ]),
  }));
  const summary = {
    format: 2,
    journeyPhase: receipt.journeyPhase?.slice(0, 64),
    openingMs: receipt.openingMs,
    phaseTimingsMs: receipt.phaseTimingsMs,
    mountedPages: receipt.mountedPages,
    pageLabel: receipt.pageLabel?.slice(0, 32),
    pageErrors: receipt.pageErrors?.slice(0, 3).map((e) => e.slice(0, 128)),
    diagnosticError: receipt.diagnosticError?.slice(0, 128),
    requests,
    main,
    cpu: structuredClone(cpu),
  };
  // Keep valid JSON and the total/phases even if an unusually busy opening fills every ring.
  while (Buffer.byteLength(JSON.stringify(summary), 'utf8') > 3500) {
    if ('other' in summary.cpu && summary.cpu.other.length) summary.cpu.other.pop();
    else if ('main' in summary.cpu && summary.cpu.main.length) summary.cpu.main.pop();
    else if (main.length) main.pop();
    else if (requests?.some((r) => r.recent.length))
      requests.find((r) => r.recent.length)!.recent.pop();
    else break;
  }
  return JSON.stringify(summary);
}
