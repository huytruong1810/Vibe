import type { Artifact } from '../../domain/artifacts';
import type { CommandPayload, CommandResult, RenderSnapshot } from '../../domain/contracts';
import { NPC_PROFILES } from '../../content/definitions';

type TextArtifact = Extract<Artifact, { kind: 'note' | 'book' }>;
interface BookHandlers {
  diagnostics?(active: boolean): void;
  frame(): RenderSnapshot | null;
  send(command: CommandPayload): Promise<CommandResult>;
  content(id: string): Promise<Artifact | null>;
  notify(message: string): void;
}

/** Only the current spread is mounted; mutations and flushes share one serial queue. */
export class BookScreen {
  private readonly dialog: HTMLDialogElement;
  private readonly confirm: HTMLDialogElement;
  private record: TextArtifact | null = null;
  private kind: 'note' | 'book' = 'book';
  private slot: 0 | 1 | null = null;
  private session = '';
  private page = 0;
  private editing = false;
  private dirty = false;
  private draftRevision = 0;
  private busy = false;
  private opening = false;
  private disposed = false;
  private serial: Promise<void> = Promise.resolve();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private gamepadFrame = 0;
  private previousButtons: boolean[] = [];
  private returnFocus: HTMLElement | null = null;
  constructor(
    root: HTMLElement,
    private readonly handlers: BookHandlers,
  ) {
    const template = document.createElement('template');
    template.innerHTML = `<dialog id="book-dialog" class="book-dialog" aria-labelledby="book-heading"><div class="modal-heading"><h2 id="book-heading">Book</h2><button id="book-close" aria-label="Close book">×</button></div><p id="book-provenance"></p><div class="button-row"><button id="book-read">Read</button><button id="book-write">Write</button></div><section id="book-spread" class="book-spread" aria-label="Open pages"></section><section id="book-editor" hidden><label>Title<input id="book-title" maxlength="48" /></label><label>Page text<textarea id="book-text" rows="8" spellcheck="false"></textarea></label><p id="book-counter" aria-live="polite"></p><div class="button-row"><button id="book-add">Add page</button><button id="book-remove">Remove page</button><button id="book-seal">Seal</button></div></section><nav class="button-row" aria-label="Book pages"><button id="book-previous" aria-label="Previous pages">← Previous</button><span id="book-pages"></span><button id="book-next" aria-label="Next pages">Next →</button></nav><p id="book-status" role="status"></p></dialog><dialog id="book-seal-confirm" class="book-dialog" aria-labelledby="book-seal-heading"><h2 id="book-seal-heading">Seal this text?</h2><p>Sealed text cannot be edited again.</p><div class="button-row"><button id="book-seal-cancel">Keep writing</button><button id="book-seal-accept">Seal permanently</button></div></dialog>`;
    for (const button of template.content.querySelectorAll('button'))
      button.classList.add('secondary');
    root.append(template.content);
    this.dialog = root.querySelector('#book-dialog')!;
    this.confirm = root.querySelector('#book-seal-confirm')!;
    const action = (id: string, task: () => Promise<void>) =>
      this.el(id).addEventListener('click', () => this.enqueue(task));
    action('book-close', () => this.close());
    action('book-previous', () => this.turn(-1));
    action('book-next', () => this.turn(1));
    action('book-read', async () => {
      if (await this.flush()) {
        this.editing = false;
        this.page -= this.page % 2;
        this.render();
      }
    });
    action('book-write', async () => {
      this.editing = true;
      this.render();
      this.el('book-text').focus();
    });
    action('book-add', async () => {
      if (
        (await this.flush()) &&
        (await this.mutate({ type: 'artifactPageAdd', slot: this.slot! }))
      ) {
        this.page = this.length - 1;
        this.render();
      }
    });
    action('book-remove', async () => {
      if (
        (await this.flush()) &&
        (await this.mutate({ type: 'artifactPageRemove', slot: this.slot!, page: this.page + 1 }))
      ) {
        this.page = Math.min(this.page, this.length - 1);
        this.render();
      }
    });
    action('book-seal', async () => {
      if (await this.flush()) this.confirm.showModal();
    });
    action('book-seal-accept', async () => {
      if (await this.mutate({ type: 'artifactSeal', slot: this.slot! })) {
        this.confirm.close();
        this.editing = false;
        this.page -= this.page % 2;
        this.render();
      }
    });
    this.el('book-seal-cancel').addEventListener('click', () => this.confirm.close());
    this.dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.enqueue(() => this.close());
    });
    this.dialog.addEventListener('keydown', (event) => {
      if (
        (event.target as HTMLElement).matches('input,textarea') ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      this.enqueue(() =>
        this.turn(
          event.key === 'ArrowLeft' ? -1 : 1,
          event.key === 'Home' ? 0 : event.key === 'End' ? this.length - 1 : undefined,
        ),
      );
    });
    for (const id of ['book-title', 'book-text'])
      this.el(id).addEventListener('input', () => {
        this.draftRevision++;
        this.dirty = true;
        this.counter();
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.timer = null;
          this.enqueue(async () => {
            await this.flush();
          });
        }, 500);
      });
  }
  private el<T extends HTMLElement = HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
  }
  private get length(): number {
    return this.record?.kind === 'book' ? this.record.pages.length : 1;
  }
  private get writable(): boolean {
    return (
      this.slot !== null &&
      (!this.record || (this.record.author.kind === 'player' && !this.record.sealed))
    );
  }
  async open(slot: 0 | 1 | null, id?: string): Promise<void> {
    const frame = this.handlers.frame();
    if (this.opening || !frame || frame.dialogue || document.querySelector('dialog[open]')) return;
    const item = slot === null ? null : frame.inventory[slot];
    if (slot !== null && item?.id !== 'book' && item?.id !== 'note') return;
    this.opening = true;
    this.handlers.diagnostics?.(true);
    for (const name of ['hearthwild:book-open', 'pause', 'content', 'render', 'show-modal'])
      performance.clearMeasures(
        name === 'hearthwild:book-open' ? name : `hearthwild:book-open:${name}`,
      );
    const started = performance.now();
    let phaseStarted = started;
    const measurePhase = (phase: 'pause' | 'content' | 'render' | 'show-modal'): number => {
      const end = performance.now();
      performance.measure(`hearthwild:book-open:${phase}`, { start: phaseStarted, end });
      phaseStarted = end;
      return end;
    };
    const focus = document.activeElement;
    this.returnFocus = focus instanceof HTMLElement ? focus : null;
    this.session = frame.session;
    this.slot = slot;
    this.kind = item?.id === 'note' ? 'note' : 'book';
    try {
      const contentPromise =
        id || item?.artifact ? this.handlers.content(id ?? item!.artifact!) : Promise.resolve(null);
      const pause = await this.handlers.send({ type: 'pause', token: 'menu' });
      measurePhase('pause');
      if (!pause.ok) {
        void contentPromise.catch(() => {});
        return;
      }
      const record = await contentPromise;
      measurePhase('content');
      if (this.disposed || this.handlers.frame()?.session !== this.session) return;
      if ((id || item?.artifact) && (!record || record.kind === 'painting'))
        throw Error('That text is no longer within reach.');
      this.record = record as TextArtifact | null;
      this.kind = this.record?.kind ?? this.kind;
      this.page = 0;
      this.dirty = false;
      this.editing = this.record === null && slot !== null;
      this.status('');
      this.render();
      measurePhase('render');
      this.dialog.showModal();
      const opened = measurePhase('show-modal');
      performance.measure('hearthwild:book-open', { start: started, end: opened });
      cancelAnimationFrame(this.gamepadFrame);
      this.previousButtons =
        navigator
          .getGamepads?.()
          .find((p) => p?.connected)
          ?.buttons.map((b) => b.pressed) ?? [];
      this.pollGamepad();
    } catch (error) {
      this.handlers.notify(String(error));
      if (!document.querySelector('dialog[open]'))
        await this.handlers.send({ type: 'resume', token: 'menu' });
    } finally {
      this.handlers.diagnostics?.(false);
      this.opening = false;
    }
  }
  update(frame: RenderSnapshot): void {
    if (this.dialog.open && frame.session !== this.session) {
      this.dirty = false;
      this.confirm.close();
      this.dialog.close();
      if (this.timer) clearTimeout(this.timer);
      void this.handlers.send({ type: 'resume', token: 'menu' });
    }
  }
  private enqueue(task: () => Promise<void>): void {
    this.serial = this.serial.then(async () => {
      if (this.disposed) return;
      this.busy = true;
      this.lock();
      try {
        await task();
      } catch (error) {
        this.status(String(error));
      } finally {
        this.busy = false;
        this.lock();
      }
    });
  }
  private lock(): void {
    if (this.disposed) return;
    for (const el of this.dialog.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement
    >('input,textarea,button'))
      // Actions already share the serial queue. Disabling a button when an
      // autosave starts between pointer-down and pointer-up discards that click.
      el.disabled = this.busy && !(el instanceof HTMLButtonElement);
    this.el<HTMLButtonElement>('book-write').disabled = !this.writable;
    this.el<HTMLButtonElement>('book-previous').disabled = this.page === 0;
    this.el<HTMLButtonElement>('book-next').disabled =
      this.page + (this.editing ? 1 : 2) >= this.length;
    this.el<HTMLButtonElement>('book-add').disabled = this.kind !== 'book' || this.length >= 48;
    this.el<HTMLButtonElement>('book-remove').disabled = this.kind !== 'book' || this.length <= 1;
  }
  private status(message: string): void {
    if (this.disposed) return;
    this.el('book-status').textContent = message;
  }
  private counter(): boolean {
    const text = this.el<HTMLTextAreaElement>('book-text'),
      lines = text.value.split('\n');
    const valid =
      lines.length <= 24 &&
      lines.every((line) => line.length <= 96) &&
      !!this.el<HTMLInputElement>('book-title').value.trim();
    text.setCustomValidity(valid ? '' : 'Use at most 24 lines of 96 characters and a title.');
    this.el('book-counter').textContent =
      `${lines.length}/24 lines · longest ${Math.max(...lines.map((line) => line.length))}/96 characters`;
    return valid;
  }
  private async flush(): Promise<boolean> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.editing) return true;
    while (this.dirty || !this.record) {
      if (!this.counter()) {
        this.status('Use at most 24 lines of 96 characters and a title.');
        return false;
      }
      const revision = this.draftRevision;
      const ok = await this.mutate({
        type: 'artifactWrite',
        slot: this.slot!,
        title: this.el<HTMLInputElement>('book-title').value.trim(),
        page: this.page + 1,
        lines: this.el<HTMLTextAreaElement>('book-text').value.split('\n'),
      });
      if (!ok) return false;
      // An input event already queued when controls were locked can arrive while
      // this write is awaiting its reply. Only the captured draft was persisted.
      if (revision === this.draftRevision) this.dirty = false;
    }
    return true;
  }
  private async mutate(command: CommandPayload): Promise<boolean> {
    if (this.handlers.frame()?.session !== this.session) return false;
    const result = await this.handlers.send(command);
    if (this.disposed) return false;
    this.status(result.message);
    if (!result.ok || !result.artifactId) return false;
    const record = await this.handlers.content(result.artifactId);
    if (
      this.disposed ||
      this.handlers.frame()?.session !== this.session ||
      !record ||
      record.kind === 'painting'
    )
      return false;
    this.record = record;
    return true;
  }
  private async turn(direction: number, page?: number): Promise<void> {
    if (!(await this.flush())) return;
    const target = Math.max(
      0,
      Math.min(this.length - 1, page ?? this.page + direction * (this.editing ? 1 : 2)),
    );
    this.page = this.editing ? target : target - (target % 2);
    this.render();
  }
  private async close(): Promise<void> {
    if (!(await this.flush())) return;
    this.dialog.close();
    cancelAnimationFrame(this.gamepadFrame);
    await this.handlers.send({ type: 'resume', token: 'menu' });
    this.returnFocus?.focus();
  }
  private render(): void {
    if (this.disposed) return;
    this.el('book-heading').textContent = this.record?.title ?? `Untitled ${this.kind}`;
    const author = this.record?.author;
    const name =
      author?.kind === 'npc'
        ? (NPC_PROFILES.find((p) => p.id === author.id)?.name ?? 'Villager')
        : 'You';
    this.el('book-provenance').textContent = this.record
      ? `by ${name}, day ${this.record.createdDay + 1}${this.record.sealed ? ' · Sealed' : ''}`
      : 'by You';
    this.el('book-editor').hidden = !this.editing;
    this.el('book-spread').hidden = this.editing;
    this.el('book-write').hidden = !this.writable;
    const pages = this.record?.kind === 'book' ? this.record.pages : [this.record?.lines ?? []];
    const spread = this.el('book-spread');
    this.dialog.dataset.kind = this.kind;
    this.dialog.dataset.sealed = String(!!this.record?.sealed);
    this.dialog.dataset.written = String(pages.some((page) => page?.some((line) => line.trim())));
    spread.replaceChildren();
    if (this.editing) {
      this.el<HTMLInputElement>('book-title').value = this.record?.title ?? `Untitled ${this.kind}`;
      this.el<HTMLTextAreaElement>('book-text').value = (pages[this.page] ?? []).join('\n');
      this.counter();
    } else {
      for (
        let n = this.page;
        n < Math.min(pages.length, this.page + (this.kind === 'book' ? 2 : 1));
        n++
      ) {
        const page = document.createElement('article');
        page.setAttribute('aria-label', `Page ${n + 1}`);
        const body = document.createElement('p'),
          number = document.createElement('small');
        body.textContent = pages[n]!.join('\n');
        number.textContent = String(n + 1);
        page.append(body, number);
        spread.append(page);
      }
    }
    this.el('book-pages').textContent =
      `${this.page + 1}${!this.editing && this.kind === 'book' && this.page + 1 < this.length ? `–${this.page + 2}` : ''} / ${this.length}`;
    this.lock();
  }
  private pollGamepad = (): void => {
    if (!this.dialog.open) return;
    const pad = navigator.getGamepads?.().find((p) => p?.connected);
    const buttons = pad?.buttons.map((b) => b.pressed) ?? [];
    for (let n = 0; n < buttons.length; n++)
      if (buttons[n] && !this.previousButtons[n] && !this.busy) {
        if (!this.confirm.open && (n === 4 || n === 5))
          this.enqueue(() => this.turn(n === 4 ? -1 : 1));
        else if (n === 1) {
          if (this.confirm.open) this.confirm.close();
          else this.enqueue(() => this.close());
        } else if (n === 0 && document.activeElement instanceof HTMLButtonElement)
          document.activeElement.click();
        else if ([12, 13, 14, 15].includes(n)) {
          const controls = [
            ...(this.confirm.open ? this.confirm : this.dialog).querySelectorAll<HTMLElement>(
              'button:not(:disabled),input,textarea',
            ),
          ].filter((el) => el.getClientRects().length);
          const index = controls.indexOf(document.activeElement as HTMLElement);
          controls[
            (index + (n === 12 || n === 14 ? -1 : 1) + controls.length) % controls.length
          ]?.focus();
        }
      }
    this.previousButtons = buttons;
    this.gamepadFrame = requestAnimationFrame(this.pollGamepad);
  };
  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    cancelAnimationFrame(this.gamepadFrame);
    this.dialog.remove();
    this.confirm.remove();
  }
}
