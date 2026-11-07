import { decodePaintingIndices, encodePaintingIndices } from '../../domain/painting-pixels';
import { PAINTING_COLORS } from '../../domain/painting-quantize';

export type ToolType = 'pencil' | 'fill' | 'dropper';

export interface PaintingEditorOptions {
  onSave: (pixels: string, palette: string[]) => Promise<void>;
  onClose?: () => void;
}

export class PaintingEditor {
  private readonly dialog: HTMLDialogElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly swatchesContainer: HTMLElement;
  private readonly undoBtn: HTMLButtonElement;
  private readonly redoBtn: HTMLButtonElement;
  private readonly saveBtn: HTMLButtonElement;
  private readonly statusEl: HTMLElement;

  private indices: Uint8Array = new Uint8Array(48 * 32);
  private palette: string[] = [];
  private activeColor = 0;
  private activeTool: ToolType = 'pencil';
  private drawing = false;

  private undoStack: Uint8Array[] = [];
  private redoStack: Uint8Array[] = [];
  private static readonly MAX_UNDO = 32;

  constructor(
    root: HTMLElement,
    private readonly options: PaintingEditorOptions,
  ) {
    const template = document.createElement('template');
    template.innerHTML = `
<dialog id="painting-editor-dialog" class="painting-editor-dialog" aria-labelledby="painting-editor-heading">
  <div class="modal-heading">
    <h2 id="painting-editor-heading">Pixel Touch-Up · 48×32</h2>
    <button id="painting-editor-close" aria-label="Close pixel editor">×</button>
  </div>
  <div class="painting-editor-body" style="display: flex; flex-direction: column; gap: 16px; align-items: center;">
    <div class="painting-editor-toolbar" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
      <button type="button" id="tool-pencil" class="secondary" data-active="true">Pencil</button>
      <button type="button" id="tool-fill" class="secondary">Fill</button>
      <button type="button" id="tool-dropper" class="secondary">Eyedropper</button>
      <button type="button" id="tool-undo" class="secondary" disabled>Undo</button>
      <button type="button" id="tool-redo" class="secondary" disabled>Redo</button>
    </div>
    <div style="border: 2px solid var(--ui-frameGold, #c9a044); padding: 4px; background: #000; border-radius: 4px;">
      <canvas id="painting-edit-canvas" width="48" height="32" style="width: 384px; height: 256px; image-rendering: pixelated; display: block; cursor: crosshair;"></canvas>
    </div>
    <div class="painting-editor-palette" style="display: flex; flex-direction: column; gap: 8px; align-items: center; width: 100%;">
      <span style="font-size: 14px; opacity: 0.8;">Palette (max 16 colors)</span>
      <div id="painting-swatches" style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; min-height: 32px;"></div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <select id="painting-add-color-select" class="secondary" style="font-size: 14px; padding: 2px 8px;">
          <option value="">+ Add doctrine color...</option>
        </select>
        <button type="button" id="painting-add-color-btn" class="secondary" style="font-size: 14px; padding: 2px 8px;">Add</button>
      </div>
    </div>
    <p id="painting-editor-status" role="status" style="margin: 0; min-height: 20px; font-size: 14px;"></p>
    <div class="button-row" style="display: flex; gap: 12px;">
      <button type="button" id="painting-editor-save" class="secondary">Save touch-up</button>
      <button type="button" id="painting-editor-cancel" class="secondary">Cancel</button>
    </div>
  </div>
</dialog>
`;
    root.append(template.content);
    this.dialog = root.querySelector('#painting-editor-dialog')!;
    this.canvas = this.dialog.querySelector('#painting-edit-canvas')!;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.swatchesContainer = this.dialog.querySelector('#painting-swatches')!;
    this.undoBtn = this.dialog.querySelector('#tool-undo')!;
    this.redoBtn = this.dialog.querySelector('#tool-redo')!;
    this.saveBtn = this.dialog.querySelector('#painting-editor-save')!;
    this.statusEl = this.dialog.querySelector('#painting-editor-status')!;

    this.bindEvents();
    this.populateColorSelect();
  }

  private bindEvents(): void {
    this.dialog
      .querySelector('#painting-editor-close')!
      .addEventListener('click', () => this.close());
    this.dialog
      .querySelector('#painting-editor-cancel')!
      .addEventListener('click', () => this.close());
    this.dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.close();
    });

    this.dialog
      .querySelector('#tool-pencil')!
      .addEventListener('click', () => this.setTool('pencil'));
    this.dialog.querySelector('#tool-fill')!.addEventListener('click', () => this.setTool('fill'));
    this.dialog
      .querySelector('#tool-dropper')!
      .addEventListener('click', () => this.setTool('dropper'));

    this.undoBtn.addEventListener('click', () => this.undo());
    this.redoBtn.addEventListener('click', () => this.redo());

    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', () => {
      this.drawing = false;
    });

    this.dialog.querySelector('#painting-add-color-btn')!.addEventListener('click', () => {
      const select = this.dialog.querySelector<HTMLSelectElement>('#painting-add-color-select')!;
      const color = select.value;
      if (color) this.addColor(color);
    });

    this.saveBtn.addEventListener('click', () => {
      void this.save();
    });

    this.dialog.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
      }
    });
  }

  private populateColorSelect(): void {
    const select = this.dialog.querySelector<HTMLSelectElement>('#painting-add-color-select')!;
    for (const hex of PAINTING_COLORS) {
      const opt = document.createElement('option');
      opt.value = hex;
      opt.textContent = hex;
      opt.style.backgroundColor = hex;
      select.append(opt);
    }
  }

  open(painting: { pixels: string; palette: string[] }): void {
    this.indices = decodePaintingIndices(painting.pixels);
    this.palette = [...painting.palette];
    this.activeColor = 0;
    this.activeTool = 'pencil';
    this.undoStack = [];
    this.redoStack = [];
    this.statusEl.textContent = '';
    this.updateUndoRedoButtons();
    this.renderSwatches();
    this.renderCanvas();
    this.dialog.showModal();
  }

  close(): void {
    if (this.dialog.open) {
      this.dialog.close();
      this.options.onClose?.();
    }
  }

  dispose(): void {
    this.close();
    this.dialog.remove();
  }

  private setTool(tool: ToolType): void {
    this.activeTool = tool;
    for (const name of ['pencil', 'fill', 'dropper'] as const) {
      const btn = this.dialog.querySelector<HTMLButtonElement>(`#tool-${name}`)!;
      btn.dataset.active = name === tool ? 'true' : 'false';
      btn.style.outline = name === tool ? '2px solid var(--ui-frameGold, #c9a044)' : '';
    }
  }

  private renderSwatches(): void {
    this.swatchesContainer.innerHTML = '';
    this.palette.forEach((hex, idx) => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.style.width = '24px';
      swatch.style.height = '24px';
      swatch.style.backgroundColor = hex;
      swatch.style.border = idx === this.activeColor ? '2px solid #fff' : '1px solid #333';
      swatch.style.borderRadius = '3px';
      swatch.style.cursor = 'pointer';
      swatch.title = `Color ${idx}: ${hex}`;
      swatch.addEventListener('click', () => {
        this.activeColor = idx;
        this.renderSwatches();
      });
      this.swatchesContainer.append(swatch);
    });
  }

  private addColor(hex: string): void {
    if (this.palette.includes(hex)) {
      this.activeColor = this.palette.indexOf(hex);
      this.renderSwatches();
      return;
    }
    if (this.palette.length >= 16) {
      this.statusEl.textContent = 'Maximum of 16 palette colors reached.';
      return;
    }
    this.palette.push(hex);
    this.activeColor = this.palette.length - 1;
    this.renderSwatches();
    this.statusEl.textContent = `Added ${hex} to palette.`;
  }

  private getCoordinates(e: PointerEvent): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    if (clientX < 0 || clientY < 0 || clientX >= rect.width || clientY >= rect.height) return null;
    const x = Math.floor((clientX / rect.width) * 48);
    const y = Math.floor((clientY / rect.height) * 32);
    return { x: Math.max(0, Math.min(47, x)), y: Math.max(0, Math.min(31, y)) };
  }

  private pushUndo(): void {
    this.undoStack.push(new Uint8Array(this.indices));
    if (this.undoStack.length > PaintingEditor.MAX_UNDO) this.undoStack.shift();
    this.redoStack = [];
    this.updateUndoRedoButtons();
  }

  private undo(): void {
    if (!this.undoStack.length) return;
    this.redoStack.push(new Uint8Array(this.indices));
    this.indices = this.undoStack.pop()!;
    this.updateUndoRedoButtons();
    this.renderCanvas();
  }

  private redo(): void {
    if (!this.redoStack.length) return;
    this.undoStack.push(new Uint8Array(this.indices));
    this.indices = this.redoStack.pop()!;
    this.updateUndoRedoButtons();
    this.renderCanvas();
  }

  private updateUndoRedoButtons(): void {
    this.undoBtn.disabled = this.undoStack.length === 0;
    this.redoBtn.disabled = this.redoStack.length === 0;
  }

  private onPointerDown(e: PointerEvent): void {
    const coords = this.getCoordinates(e);
    if (!coords) return;
    if (this.activeTool === 'dropper') {
      const idx = this.indices[coords.y * 48 + coords.x]!;
      this.activeColor = idx;
      this.renderSwatches();
      this.setTool('pencil');
      return;
    }
    this.pushUndo();
    if (this.activeTool === 'fill') {
      this.floodFill(coords.x, coords.y, this.activeColor);
      this.renderCanvas();
    } else {
      this.drawing = true;
      this.setPixel(coords.x, coords.y, this.activeColor);
      this.renderCanvas();
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.drawing || this.activeTool !== 'pencil') return;
    const coords = this.getCoordinates(e);
    if (coords) {
      this.setPixel(coords.x, coords.y, this.activeColor);
      this.renderCanvas();
    }
  }

  private setPixel(x: number, y: number, colorIdx: number): void {
    this.indices[y * 48 + x] = colorIdx;
  }

  private floodFill(startX: number, startY: number, newColor: number): void {
    const targetColor = this.indices[startY * 48 + startX]!;
    if (targetColor === newColor) return;
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Uint8Array(48 * 32);
    visited[startY * 48 + startX] = 1;

    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      this.indices[y * 48 + x] = newColor;

      for (const [dx, dy] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < 48 && ny >= 0 && ny < 32) {
          const pos = ny * 48 + nx;
          if (!visited[pos] && this.indices[pos] === targetColor) {
            visited[pos] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }
  }

  private renderCanvas(): void {
    const imgData = this.ctx.createImageData(48, 32);
    const data = imgData.data;
    const colorCache = this.palette.map((hex) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ]);

    for (let i = 0; i < 48 * 32; i++) {
      const colorIdx = this.indices[i]!;
      const rgb = colorCache[colorIdx] ?? [0, 0, 0];
      const offset = i * 4;
      data[offset] = rgb[0]!;
      data[offset + 1] = rgb[1]!;
      data[offset + 2] = rgb[2]!;
      data[offset + 3] = 255;
    }
    this.ctx.putImageData(imgData, 0, 0);
  }

  private async save(): Promise<void> {
    this.saveBtn.disabled = true;
    this.statusEl.textContent = 'Saving pixel touch-up...';
    try {
      const pixels = encodePaintingIndices(this.indices);
      await this.options.onSave(pixels, this.palette);
      this.close();
    } catch (err) {
      this.statusEl.textContent = String(err);
    } finally {
      this.saveBtn.disabled = false;
    }
  }
}
