import type { Artifact } from '../../domain/artifacts';
import type { CommandPayload, CommandResult, RenderSnapshot } from '../../domain/contracts';
import type { Painting } from '../../domain/painting';
import { paintingRgba } from '../../domain/painting-pixels';

interface PaintingHandlers {
  frame(): RenderSnapshot | null;
  content(id: string): Promise<Artifact | null>;
  send(command: CommandPayload): Promise<CommandResult>;
  enabled(): boolean;
  progress(id: string): string;
  raw(id: string): Blob | null;
  cancel(id: string): void;
  settings(): void;
}
/** The worker owns durable state; this modal holds only prompt controls and a temporary raw preview. */
export class PaintingScreen {
  private readonly dialog: HTMLDialogElement;
  private record: Painting | null = null;
  private slot: 0 | 1 | null = null;
  private session = '';
  private revision = 0;
  private loading = false;
  private busy = false;
  private epoch = 0;
  private raw: Blob | null = null;
  private rawUrl: string | null = null;
  private focus: HTMLElement | null = null;
  private padFrame = 0;
  private padButtons: boolean[] = [];
  constructor(
    root: HTMLElement,
    private readonly handlers: PaintingHandlers,
  ) {
    const template = document.createElement('template');
    template.innerHTML = `<dialog id="painting-dialog" class="painting-dialog" aria-labelledby="painting-heading"><div class="modal-heading"><h2 id="painting-heading">Paint a canvas</h2><button id="painting-close" aria-label="Close painting">×</button></div><label>Painting prompt<textarea id="painting-prompt" maxlength="240" rows="3"></textarea></label><p id="painting-counter" aria-live="polite">0 / 240</p><fieldset id="painting-composition"><legend>Composition</legend>${['wide landscape', 'close study', 'portrait', 'still life', 'scene'].map((value, n) => `<label class="painting-chip"><input type="radio" name="painting-composition" value="${value}" ${n === 0 ? 'checked' : ''} />${value}</label>`).join('')}</fieldset><fieldset id="painting-mood"><legend>Mood</legend>${['dawn', 'noon', 'dusk', 'night', 'storm', 'festival', 'quiet'].map((value, n) => `<label class="painting-chip"><input type="radio" name="painting-mood" value="${value}" ${n === 6 ? 'checked' : ''} />${value}</label>`).join('')}</fieldset><section id="painting-previews" class="painting-previews" hidden><figure><figcaption>Game palette · 4×</figcaption><canvas id="painting-palette" width="48" height="32" aria-label="Palette painting preview"></canvas></figure><figure id="painting-raw-figure" hidden><figcaption>Model output</figcaption><img id="painting-raw" alt="Original local model output" /></figure></section><p id="painting-caption"></p><p id="painting-status" role="status"></p><div class="button-row"><button id="painting-generate" class="secondary">Generate</button><button id="painting-cancel" class="secondary" hidden>Cancel painting</button><button id="painting-keep" class="secondary" hidden>Keep painting</button><button id="painting-retry" class="secondary" hidden>Retry with a new seed</button><button id="painting-discard" class="secondary" hidden>Discard painting</button><button id="painting-settings" class="secondary">Open painting settings</button></div></dialog>`;
    root.append(template.content);
    this.dialog = root.querySelector('#painting-dialog')!;
    this.el('painting-close').addEventListener('click', () => {
      void this.close();
    });
    this.dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      void this.close();
    });
    this.el('painting-prompt').addEventListener('input', () => this.counter());
    this.el('painting-generate').addEventListener('click', () => {
      void this.generate();
    });
    this.el('painting-retry').addEventListener('click', () => {
      void this.generate(true);
    });
    this.el('painting-keep').addEventListener('click', () => {
      void this.keep();
    });
    const hang = document.createElement('button');
    hang.id = 'painting-hang';
    hang.className = 'secondary';
    hang.textContent = 'Hang on nearby hook';
    hang.hidden = true;
    this.el('painting-keep').after(hang);
    hang.addEventListener('click', () => {
      void this.display();
    });
    const take = document.createElement('button');
    take.id = 'painting-take';
    take.className = 'secondary';
    take.textContent = 'Take painting';
    take.hidden = true;
    hang.after(take);
    take.addEventListener('click', () => {
      void this.take();
    });
    for (const id of ['painting-cancel', 'painting-discard'])
      this.el(id).addEventListener('click', () => {
        void this.discard();
      });
    this.el('painting-settings').addEventListener('click', () => {
      void this.close().then(() => this.handlers.settings());
    });
  }
  private el<T extends HTMLElement = HTMLElement>(id: string): T {
    return this.dialog.querySelector<T>(`#${id}`)!;
  }
  private counter(): void {
    this.el('painting-counter').textContent =
      `${this.el<HTMLTextAreaElement>('painting-prompt').value.length} / 240`;
  }
  private status(text: string): void {
    this.el('painting-status').textContent = text;
  }
  async open(slot: 0 | 1 | null, id?: string): Promise<void> {
    const frame = this.handlers.frame();
    if (!frame || frame.dialogue || this.loading || document.querySelector('dialog[open]')) return;
    const item = slot === null ? null : frame.inventory[slot];
    if (!id && item?.id !== 'canvas' && item?.id !== 'painting') return;
    this.loading = true;
    const epoch = ++this.epoch;
    try {
      const artifactId = id ?? item?.artifact,
        record = artifactId ? await this.handlers.content(artifactId) : null;
      if (this.handlers.frame()?.session !== frame.session || epoch !== this.epoch) return;
      if (artifactId && record?.kind !== 'painting') return;
      const paused = await this.handlers.send({ type: 'pause', token: 'menu' });
      if (!paused.ok || epoch !== this.epoch) return;
      this.slot = slot;
      this.session = frame.session;
      this.record = record as Painting | null;
      this.revision = record?.revision ?? 0;
      this.focus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (this.record) {
        this.el<HTMLTextAreaElement>('painting-prompt').value = this.record.brief.subject;
        this.dialog.querySelector<HTMLInputElement>(
          `input[name="painting-composition"][value="${this.record.brief.composition}"]`,
        )!.checked = true;
        this.dialog.querySelector<HTMLInputElement>(
          `input[name="painting-mood"][value="${this.record.brief.mood}"]`,
        )!.checked = true;
      } else this.el<HTMLTextAreaElement>('painting-prompt').value = '';
      this.render();
      this.dialog.showModal();
      this.el('painting-prompt').focus();
      this.pollGamepad();
    } catch (error) {
      this.status(String(error));
    } finally {
      this.loading = false;
    }
  }
  update(frame: RenderSnapshot): void {
    if (!this.dialog.open) return;
    if (frame.session !== this.session) {
      void this.close(false);
      return;
    }
    if (!this.record) {
      if (this.el<HTMLButtonElement>('painting-generate').disabled === this.handlers.enabled())
        this.render();
      return;
    }
    const view = frame.artifacts.find((a) => a.id === this.record!.id);
    if (!view) {
      void this.close();
      return;
    }
    if (view.revision !== this.revision && !this.loading) {
      this.loading = true;
      const id = view.id,
        epoch = this.epoch;
      void this.handlers
        .content(id)
        .then((record) => {
          if (
            epoch === this.epoch &&
            record?.kind === 'painting' &&
            this.handlers.frame()?.session === this.session
          ) {
            this.record = record;
            this.revision = record.revision;
            this.render();
          }
        })
        .catch((error) => this.status(String(error)))
        .finally(() => {
          this.loading = false;
        });
    } else if (this.record.status === 'pending' && !this.record.pixels)
      this.status(this.handlers.progress(this.record.id));
  }
  private async generate(retry = false): Promise<void> {
    if (!this.current()) return;
    if (this.busy || this.slot === null || !this.handlers.enabled()) {
      this.status('Choose an available image endpoint in Settings.');
      return;
    }
    this.busy = true;
    const epoch = this.epoch;
    try {
      if (retry && this.record) {
        const discarded = await this.handlers.send({
          type: 'paintingDiscard',
          requestId: this.record.id,
        });
        if (epoch !== this.epoch || !this.current()) return;
        if (!discarded.ok) {
          this.status(discarded.message);
          return;
        }
        this.record = null;
      }
      const result = await this.handlers.send({
        type: 'paintingRequest',
        slot: this.slot,
        prompt: this.el<HTMLTextAreaElement>('painting-prompt').value,
        composition: this.dialog.querySelector<HTMLInputElement>(
          'input[name="painting-composition"]:checked',
        )!.value as Painting['brief']['composition'],
        mood: this.dialog.querySelector<HTMLInputElement>('input[name="painting-mood"]:checked')!
          .value as Painting['brief']['mood'],
      });
      this.status(result.message);
      if (epoch !== this.epoch || !this.current()) return;
      if (result.ok && result.artifactId) {
        const record = await this.handlers.content(result.artifactId);
        if (epoch !== this.epoch || !this.current()) return;
        if (record?.kind === 'painting') {
          this.record = record;
          this.revision = record.revision;
          this.render();
        }
      }
    } catch (error) {
      this.status(String(error));
    } finally {
      this.busy = false;
    }
  }
  private async keep(): Promise<void> {
    if (!this.current() || !this.record || this.busy) return;
    this.busy = true;
    try {
      const result = await this.handlers.send({ type: 'paintingKeep', requestId: this.record.id });
      this.status(result.message);
      if (result.ok) await this.close();
    } catch (error) {
      this.status(String(error));
    } finally {
      this.busy = false;
    }
  }
  private async discard(): Promise<void> {
    if (!this.current() || !this.record || this.busy) return;
    this.busy = true;
    const id = this.record.id;
    this.handlers.cancel(id);
    try {
      const result = await this.handlers.send({ type: 'paintingDiscard', requestId: id });
      this.status(result.message);
      if (result.ok) {
        this.record = null;
        this.revision = 0;
        this.render();
      }
    } catch (error) {
      this.status(String(error));
    } finally {
      this.busy = false;
    }
  }
  private async display(): Promise<void> {
    const frame = this.handlers.frame();
    if (
      !this.current() ||
      this.busy ||
      !frame ||
      this.slot === null ||
      this.record?.status !== 'ready'
    )
      return;
    const candidates = frame.scene.props.filter(
      (prop) =>
        prop.display?.accepts.includes('painting') &&
        Math.hypot(prop.x - frame.player.x, prop.y - frame.player.y) <= 1.5,
    );
    for (const prop of candidates)
      for (let displaySlot = 0; displaySlot < prop.display!.slots; displaySlot++) {
        if (
          frame.placements.some(
            (placement) =>
              placement.sceneId === frame.scene.id &&
              placement.propId === prop.id &&
              placement.slot === displaySlot,
          )
        )
          continue;
        const slot = this.slot;
        this.busy = true;
        try {
          await this.close();
          if (this.handlers.frame()?.session !== frame.session) return;
          const receipt = await this.handlers.send({
            type: 'artifactDisplay',
            slot,
            propId: prop.id,
            displaySlot,
          });
          if (!receipt.ok) {
            await this.open(slot);
            this.status(receipt.message);
          }
        } catch (error) {
          this.status(String(error));
        } finally {
          this.busy = false;
        }
        return;
      }
    this.status('Stand within1.5 tiles of a free wall hook to hang this painting.');
  }
  private async take(): Promise<void> {
    if (!this.current() || !this.record || this.busy) return;
    const frame = this.handlers.frame()!,
      id = this.record.id;
    const placement = frame.placements.find(
      (p) => p.artifactId === id && p.sceneId === frame.scene.id,
    );
    if (!placement) return;
    this.busy = true;
    try {
      await this.close();
      if (this.handlers.frame()?.session !== frame.session) return;
      const result = await this.handlers.send({
        type: 'artifactTake',
        propId: placement.propId,
        displaySlot: placement.slot,
      });
      if (!result.ok) {
        await this.open(null, id);
        this.status(result.message);
      }
    } finally {
      this.busy = false;
    }
  }
  private render(): void {
    const record = this.record,
      writable =
        this.slot !== null && (!record || (record.author.kind === 'player' && !record.sealed));
    const preview = !!(record?.pixels && record.palette),
      pending = record?.status === 'pending' && !preview;
    this.el('painting-heading').textContent = record?.title ?? 'Paint a canvas';
    this.el<HTMLTextAreaElement>('painting-prompt').disabled = !writable || !!record;
    for (const field of this.dialog.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
      field.disabled = !writable || !!record;
    this.el('painting-generate').hidden = !!record || !writable;
    this.el<HTMLButtonElement>('painting-generate').disabled = !this.handlers.enabled();
    this.el('painting-cancel').hidden = !writable || !pending;
    this.el('painting-keep').hidden = !writable || !preview;
    this.el('painting-hang').hidden =
      this.slot === null || record?.status !== 'ready' || !record.sealed;
    this.el('painting-take').hidden =
      this.slot !== null || record?.status !== 'ready' || !record.sealed;
    this.el('painting-retry').hidden = !writable || !record || pending;
    this.el('painting-discard').hidden = !writable || !record || pending;
    this.el('painting-previews').hidden = !preview;
    if (preview)
      this.el<HTMLCanvasElement>('painting-palette')
        .getContext('2d')!
        .putImageData(
          new ImageData(
            paintingRgba({ pixels: record!.pixels!, palette: record!.palette! }),
            48,
            32,
          ),
          0,
          0,
        );
    const raw = record ? this.handlers.raw(record.id) : null;
    if (raw !== this.raw) {
      if (this.rawUrl) URL.revokeObjectURL(this.rawUrl);
      this.raw = raw;
      this.rawUrl = raw ? URL.createObjectURL(raw) : null;
    }
    this.el('painting-raw-figure').hidden = !preview || !this.rawUrl;
    if (this.rawUrl) this.el<HTMLImageElement>('painting-raw').src = this.rawUrl;
    this.dialog.dataset.painted = String(preview);
    this.el('painting-caption').textContent = record?.caption ?? '';
    this.status(
      record?.failure ??
        (pending
          ? this.handlers.progress(record!.id)
          : !this.handlers.enabled() && !preview
            ? 'Choose an image endpoint in Settings to make a painting.'
            : ''),
    );
    this.counter();
  }
  private pollGamepad(): void {
    this.padButtons = [];
    const poll = () => {
      if (!this.dialog.open) return;
      const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p?.connected);
      if (pad) {
        const pressed = (n: number) => !!pad.buttons[n]?.pressed && !this.padButtons[n];
        if (pressed(1)) void this.close();
        else if (pressed(0)) (document.activeElement as HTMLElement | null)?.click();
        else if ([12, 13, 14, 15].some(pressed)) {
          const controls = [
            ...this.dialog.querySelectorAll<HTMLElement>(
              'button:not([hidden]):not(:disabled),input:not(:disabled),textarea:not(:disabled)',
            ),
          ].filter((e) => e.getClientRects().length);
          const index = controls.indexOf(document.activeElement as HTMLElement),
            direction = pressed(12) || pressed(14) ? -1 : 1;
          controls[(index + direction + controls.length) % controls.length]?.focus();
        }
        this.padButtons = pad.buttons.map((button) => button.pressed);
      }
      this.padFrame = requestAnimationFrame(poll);
    };
    this.padFrame = requestAnimationFrame(poll);
  }
  async close(resume = true): Promise<void> {
    ++this.epoch;
    cancelAnimationFrame(this.padFrame);
    this.dialog.close();
    if (this.rawUrl) URL.revokeObjectURL(this.rawUrl);
    this.rawUrl = null;
    this.raw = null;
    if (resume && this.handlers.frame()?.session === this.session)
      await this.handlers
        .send({ type: 'resume', token: 'menu' })
        .catch((error) => this.status(String(error)));
    if (this.focus?.isConnected) this.focus.focus();
  }
  private current(): boolean {
    return this.dialog.open && this.handlers.frame()?.session === this.session;
  }
  dispose(): void {
    void this.close(false);
    this.dialog.remove();
  }
}
