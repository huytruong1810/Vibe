import { packetBase, ReviewPacketSchema, type ReviewPacket } from './assets/review-packet';

/** An isolated review surface: candidate art never enters AssetManager or the world. */
export function mountPacketReview(root: HTMLElement): () => void {
  const section = document.createElement('details');
  section.className = 'packet-review';
  section.innerHTML = `<summary>Forge packet · candidate review</summary><form><label>Packet directory <input name="packet" value="2026-10-31-rivallie" required></label><button>Load packet</button></form><p role="status">Candidate preview only. No approval or gameplay activation.</p><div class="packet-controls"><label>Clip <select aria-label="Packet clip"></select></label><button type="button" data-play>Pause</button><button type="button" data-step>Step</button><label><input type="checkbox" data-overlays checked> Anchors and sockets</label></div><canvas width="800" height="360" aria-label="Candidate in-scene preview"></canvas><pre></pre>`;
  root.querySelector('main')!.prepend(section);
  const query = <T extends HTMLElement>(selector: string) => section.querySelector<T>(selector)!;
  const status = query<HTMLParagraphElement>('[role=status]'),
    canvas = query<HTMLCanvasElement>('canvas'),
    select = query<HTMLSelectElement>('select');
  const ctx = canvas.getContext('2d')!;
  let request = new AbortController(),
    disposed = false,
    raf = 0,
    previous = 0,
    elapsed = 0,
    index = 0,
    playing = true;
  let packet: ReviewPacket | null = null;
  let images = new Map<string, ImageBitmap>();
  const clear = () => {
    for (const image of images.values()) image.close();
    images.clear();
  };
  const fail = (error: unknown) => {
    if (!disposed && !(error instanceof DOMException && error.name === 'AbortError'))
      status.textContent = String(error);
  };
  async function loadClip(base: string) {
    request.abort();
    request = new AbortController();
    const signal = request.signal;
    clear();
    index = 0;
    elapsed = 0;
    const clip = packet?.clips.find((c) => c.id === select.value);
    if (!clip || !packet) return;
    const required = clip.frameIds.map((id) => packet!.frames.find((f) => f.id === id)!);
    const bytes = required.reduce((sum, f) => sum + f.sourceSize.w * f.sourceSize.h * 4, 0);
    if (bytes > 32 * 1024 * 1024) throw new Error('Selected clip exceeds 32 MiB review budget');
    const loaded = new Map<string, ImageBitmap>();
    try {
      // Sequential bounded decoding avoids unbounded request bursts and allocations.
      for (const frame of required) {
        const response = await fetch(base + frame.file, { signal });
        if (!response.ok) throw new Error(`Missing packet frame: ${frame.file}`);
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > 4 * 1024 * 1024)
          throw new Error('Packet image exceeds encoded budget');
        const hash = Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)),
          (n) => n.toString(16).padStart(2, '0'),
        ).join('');
        if (hash !== frame.sha256) throw new Error(`Frame digest mismatch: ${frame.file}`);
        const image = await createImageBitmap(new Blob([buffer], { type: 'image/png' }));
        if (signal.aborted || disposed) {
          image.close();
          throw new DOMException('Obsolete packet', 'AbortError');
        }
        if (image.width !== frame.sourceSize.w || image.height !== frame.sourceSize.h) {
          image.close();
          throw new Error(`Frame dimensions mismatch: ${frame.file}`);
        }
        loaded.set(frame.id, image);
      }
      if (signal.aborted || disposed) throw new DOMException('Obsolete packet', 'AbortError');
      images = loaded;
      status.textContent = `Candidate ${packet.asset} · ${clip.facing} · ${clip.frameIds.length} frames · ${(bytes / 1048576).toFixed(2)} MiB. Manual preview timing; no simulated combat.`;
    } catch (error) {
      for (const image of loaded.values()) image.close();
      throw error;
    }
  }
  let base = '';
  const lifecycle = new AbortController();
  query<HTMLFormElement>('form').addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      request.abort();
      request = new AbortController();
      const signal = request.signal;
      clear();
      packet = null;
      void (async () => {
        base = packetBase(query<HTMLInputElement>('input[name=packet]').value.trim());
        status.textContent = 'Loading candidate packet…';
        const response = await fetch(base + 'review.json', { signal });
        if (
          response.status === 404 ||
          response.headers.get('content-type')?.includes('text/html')
        ) {
          status.textContent =
            'Legacy packet: no review.json or registered frames. Sheets/GIFs remain available; rerun forge packet on machine A for in-scene review.';
          query<HTMLPreElement>('pre').replaceChildren();
          for (const file of ['contact.png', 'turntable.gif', 'qa_report.json']) {
            const link = document.createElement('a');
            link.href = base + file;
            link.textContent = file + ' ';
            link.target = '_blank';
            link.rel = 'noopener';
            query('pre').append(link);
          }
          return;
        }
        if (!response.ok) throw new Error(`Packet load failed (${response.status})`);
        const text = await response.text();
        if (text.length > 4 * 1024 * 1024) throw new Error('Packet manifest exceeds 4 MiB');
        const parsed = ReviewPacketSchema.parse(JSON.parse(text));
        if (signal.aborted || disposed) return;
        packet = parsed;
        select.replaceChildren(
          ...packet.clips.map(
            (c) => new Option(`${c.state} · ${c.moveId ?? ''} · ${c.facing}`, c.id),
          ),
        );
        query<HTMLPreElement>('pre').textContent =
          `sourceDigest ${packet.sourceDigest}\nCandidate only. The director owns approval.\nCanvas and timing use shared v2 frame/clip contracts.\n` +
          (packet.qa
            ?.map(
              (check) =>
                `${check.pass ? 'PASS' : 'OPEN'} ${check.check} (${check.rule}): ${check.detail}`,
            )
            .join('\n') ?? 'QA summary absent; inspect qa_report.json before review.');
        await loadClip(base);
      })().catch(fail);
    },
    { signal: lifecycle.signal },
  );
  select.addEventListener('change', () => void loadClip(base).catch(fail), {
    signal: lifecycle.signal,
  });
  query('[data-play]').addEventListener(
    'click',
    () => {
      playing = !playing;
      query('[data-play]').textContent = playing ? 'Pause' : 'Play';
    },
    { signal: lifecycle.signal },
  );
  query('[data-step]').addEventListener(
    'click',
    () => {
      playing = false;
      query('[data-play]').textContent = 'Play';
      index++;
    },
    { signal: lifecycle.signal },
  );
  function draw(now: number) {
    if (disposed) return;
    const dt = previous ? Math.min(100, now - previous) : 0;
    previous = now;
    const clip = packet?.clips.find((c) => c.id === select.value);
    if (playing && section.open && clip) {
      elapsed += dt;
      const span = 1000 / clip.fps;
      while (elapsed >= span) {
        index++;
        elapsed -= span;
      }
    }
    if (section.open) {
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#314748';
      ctx.fillRect(0, 0, 800, 360);
      ctx.strokeStyle = '#506056';
      ctx.lineWidth = 2;
      for (let x = 0; x < 800; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 360);
        ctx.stroke();
      }
      for (let y = 0; y < 360; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(800, y);
        ctx.stroke();
      }
      if (clip && packet) {
        const id = clip.frameIds[index % clip.frameIds.length]!,
          frame = packet.frames.find((f) => f.id === id)!,
          image = images.get(id);
        if (image) {
          const anchor = frame.anchorPx!,
            x = 400 - anchor.x,
            y = 256 - anchor.y;
          ctx.drawImage(image, x, y);
          if (query<HTMLInputElement>('[data-overlays]').checked) {
            ctx.fillStyle = '#ee7d69';
            ctx.fillRect(394, 254, 12, 4);
            ctx.fillRect(398, 250, 4, 12);
            ctx.font = '38px Silver';
            ctx.fillStyle = '#f5ddb0';
            ctx.fillText(
              `${(index % clip.frameIds.length) + 1}/${clip.frameIds.length} · ${clip.facing}`,
              12,
              40,
            );
            for (const [name, point] of Object.entries(frame.sockets ?? {})) {
              ctx.fillStyle = '#79bdbe';
              ctx.fillRect(x + point.x - 2, y + point.y - 2, 4, 4);
              ctx.fillText(name, x + point.x + 6, y + point.y);
            }
          }
        }
      }
    }
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);
  return () => {
    disposed = true;
    request.abort();
    lifecycle.abort();
    cancelAnimationFrame(raf);
    clear();
    section.remove();
  };
}
