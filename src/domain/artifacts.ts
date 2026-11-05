import { z } from 'zod';
import type { NpcId } from './values';

export const ARTIFACT_CAPS = {
  maxArtifactsPerSave: 512,
  maxTitleChars: 60,
  maxNoteLines: 24,
  maxNoteLineChars: 96,
  maxNoteChars: 2400,
  maxBookPages: 32,
  maxBookLinesPerPage: 24,
  maxBookLineChars: 96,
  maxBookPageChars: 2400,
  maxPageHeadingChars: 48,
  paintingWidth: 48,
  paintingHeight: 32,
  paintingPixelsLen: 48 * 32,
  maxPaintingColors: 16,
  paletteSize: 64,
  maxCaptionChars: 240,
  maxSubjectChars: 120,
} as const;

export type ArtifactId = `art:${string}`;
export type ArtifactAuthor = 'player' | NpcId | 'world';
export type ArtifactKind = 'note' | 'book' | 'painting';

export interface NoteContent {
  readonly kind: 'note';
  readonly body: string;
}

export interface BookPage {
  readonly heading?: string;
  readonly body: string;
}

export interface BookContent {
  readonly kind: 'book';
  readonly pages: readonly BookPage[];
}

export interface PaintingContent {
  readonly kind: 'painting';
  readonly width: 48;
  readonly height: 32;
  readonly pixels: string;
  readonly paletteUsed: readonly number[];
  readonly caption: string;
  readonly subject: string;
  readonly seed: number;
  readonly model: string;
  readonly status: 'pending' | 'ready' | 'failed';
}

export type ArtifactContent = NoteContent | BookContent | PaintingContent;

export interface Artifact {
  readonly id: ArtifactId;
  readonly kind: ArtifactKind;
  readonly author: ArtifactAuthor;
  readonly createdAtDay: number;
  readonly title: string;
  readonly revision: number;
  readonly immutable: boolean;
  readonly content: ArtifactContent;
}

export interface ArtifactView {
  readonly id: ArtifactId;
  readonly kind: ArtifactKind;
  readonly author: ArtifactAuthor;
  readonly createdAtDay: number;
  readonly title: string;
  readonly revision: number;
  readonly immutable: boolean;
  readonly summary: string;
}

export interface ArtifactPlacement {
  readonly sceneId: number;
  readonly propId: string;
  readonly artifactId: ArtifactId;
}

const CONTROL_AND_BIDI_RE =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g;

export function sanitizeSingleLine(raw: string, maxChars: number): string {
  const normalized = raw
    .normalize('NFC')
    .replace(/\r\n?/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, '  ')
    .replace(CONTROL_AND_BIDI_RE, '')
    .trim();
  return Array.from(normalized).slice(0, maxChars).join('');
}

export function sanitizeTitle(raw: string): string {
  const clean = sanitizeSingleLine(raw, ARTIFACT_CAPS.maxTitleChars);
  return clean || 'Untitled';
}

export function sanitizeArtifactText(
  raw: string,
  maxLines: number = ARTIFACT_CAPS.maxNoteLines,
  maxLineChars: number = ARTIFACT_CAPS.maxNoteLineChars,
  maxTotalChars: number = ARTIFACT_CAPS.maxNoteChars,
): string {
  const normalized = raw
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '  ')
    .replace(CONTROL_AND_BIDI_RE, '');
  const cappedLines = normalized
    .split('\n')
    .slice(0, maxLines)
    .map((line) => Array.from(line).slice(0, maxLineChars).join(''));
  const joined = cappedLines.join('\n');
  return Array.from(joined).slice(0, maxTotalChars).join('');
}

export function encodePaintingPixels(pixels: Uint8Array): string {
  if (pixels.length !== ARTIFACT_CAPS.paintingPixelsLen) {
    throw new Error(
      `Painting pixels must be ${ARTIFACT_CAPS.paintingPixelsLen} bytes (48x32), got ${pixels.length}.`,
    );
  }
  let binary = '';
  for (let i = 0; i < pixels.length; i++) {
    const idx = pixels[i]!;
    if (idx >= ARTIFACT_CAPS.paletteSize) {
      throw new Error(`Palette index ${idx} at pixel ${i} exceeds 64-colour master palette.`);
    }
    binary += String.fromCharCode(idx);
  }
  return btoa(binary);
}

export function decodePaintingPixels(base64: string): Uint8Array {
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new Error('Invalid base64 painting pixel payload.');
  }
  if (binary.length !== ARTIFACT_CAPS.paintingPixelsLen) {
    throw new Error(
      `Decoded painting length ${binary.length} does not match 48x32 (${ARTIFACT_CAPS.paintingPixelsLen}).`,
    );
  }
  const out = new Uint8Array(binary.length);
  const unique = new Set<number>();
  for (let i = 0; i < binary.length; i++) {
    const code = binary.charCodeAt(i);
    if (code >= ARTIFACT_CAPS.paletteSize) {
      throw new Error(`Decoded palette index ${code} exceeds 64-colour master palette.`);
    }
    out[i] = code;
    unique.add(code);
  }
  if (unique.size > ARTIFACT_CAPS.maxPaintingColors) {
    throw new Error(
      `Painting uses ${unique.size} unique colours, exceeding the ${ARTIFACT_CAPS.maxPaintingColors}-colour cap.`,
    );
  }
  return out;
}

const BookPageSchema = z
  .object({
    heading: z
      .string()
      .max(ARTIFACT_CAPS.maxPageHeadingChars * 4)
      .optional(),
    body: z.string().max(ARTIFACT_CAPS.maxBookPageChars * 4),
  })
  .strict();

export const ArtifactContentSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('note'),
      body: z.string().max(ARTIFACT_CAPS.maxNoteChars * 4),
    })
    .strict(),
  z
    .object({
      kind: z.literal('book'),
      pages: z.array(BookPageSchema).min(1).max(ARTIFACT_CAPS.maxBookPages),
    })
    .strict(),
  z
    .object({
      kind: z.literal('painting'),
      width: z.literal(48),
      height: z.literal(32),
      pixels: z.string().min(1).max(2400),
      paletteUsed: z
        .array(
          z
            .number()
            .int()
            .min(0)
            .max(ARTIFACT_CAPS.paletteSize - 1),
        )
        .min(1)
        .max(ARTIFACT_CAPS.maxPaintingColors),
      caption: z.string().max(ARTIFACT_CAPS.maxCaptionChars * 4),
      subject: z.string().max(ARTIFACT_CAPS.maxSubjectChars * 4),
      seed: z.number().int(),
      model: z.string().min(1).max(80),
      status: z.enum(['pending', 'ready', 'failed']),
    })
    .strict(),
]);

export const ArtifactSchema = z
  .object({
    id: z.string().regex(/^art:[a-z0-9:_-]+$/i),
    kind: z.enum(['note', 'book', 'painting']),
    author: z.string().min(1).max(64),
    createdAtDay: z.number().int().min(0),
    title: z
      .string()
      .min(1)
      .max(ARTIFACT_CAPS.maxTitleChars * 4),
    revision: z.number().int().min(1),
    immutable: z.boolean(),
    content: ArtifactContentSchema,
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.kind !== val.content.kind) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Artifact kind ${val.kind} does not match content kind ${val.content.kind}.`,
      });
    }
    if (val.content.kind === 'painting') {
      try {
        decodePaintingPixels(val.content.pixels);
      } catch (err) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err instanceof Error ? err.message : 'Invalid painting pixels.',
        });
      }
    }
  });

export class ArtifactStore {
  private readonly items = new Map<ArtifactId, Artifact>();
  private serial = 0;

  get size(): number {
    return this.items.size;
  }

  private nextId(): ArtifactId {
    while (true) {
      const candidate: ArtifactId = `art:${++this.serial}`;
      if (!this.items.has(candidate)) return candidate;
    }
  }

  private assertCapacity(): void {
    if (this.items.size >= ARTIFACT_CAPS.maxArtifactsPerSave) {
      throw new Error(
        `Artifact store reached maximum cap of ${ARTIFACT_CAPS.maxArtifactsPerSave} artifacts per save.`,
      );
    }
  }

  get(id: ArtifactId): Artifact | undefined {
    return this.items.get(id);
  }

  createNote(input: {
    id?: ArtifactId;
    author: ArtifactAuthor;
    createdAtDay: number;
    title: string;
    body: string;
    immutable?: boolean;
  }): Artifact {
    this.assertCapacity();
    const id = input.id ?? this.nextId();
    const artifact: Artifact = {
      id,
      kind: 'note',
      author: input.author,
      createdAtDay: Math.max(0, Math.floor(input.createdAtDay)),
      title: sanitizeTitle(input.title),
      revision: 1,
      immutable: Boolean(input.immutable),
      content: {
        kind: 'note',
        body: sanitizeArtifactText(
          input.body,
          ARTIFACT_CAPS.maxNoteLines,
          ARTIFACT_CAPS.maxNoteLineChars,
          ARTIFACT_CAPS.maxNoteChars,
        ),
      },
    };
    this.items.set(id, artifact);
    return artifact;
  }

  updateNote(id: ArtifactId, title: string, body: string): Artifact {
    const existing = this.items.get(id);
    if (!existing || existing.content.kind !== 'note') {
      throw new Error(`Note artifact ${id} not found.`);
    }
    if (existing.immutable) {
      throw new Error(`Artifact ${id} is immutable (sealed) and cannot be modified.`);
    }
    const updated: Artifact = {
      ...existing,
      title: sanitizeTitle(title),
      revision: existing.revision + 1,
      content: {
        kind: 'note',
        body: sanitizeArtifactText(
          body,
          ARTIFACT_CAPS.maxNoteLines,
          ARTIFACT_CAPS.maxNoteLineChars,
          ARTIFACT_CAPS.maxNoteChars,
        ),
      },
    };
    this.items.set(id, updated);
    return updated;
  }

  createBook(input: {
    id?: ArtifactId;
    author: ArtifactAuthor;
    createdAtDay: number;
    title: string;
    pages: readonly BookPage[];
    immutable?: boolean;
  }): Artifact {
    this.assertCapacity();
    const id = input.id ?? this.nextId();
    const sanitizedPages = (input.pages.length ? input.pages : [{ body: '' }])
      .slice(0, ARTIFACT_CAPS.maxBookPages)
      .map((p) => ({
        ...(p.heading
          ? { heading: sanitizeSingleLine(p.heading, ARTIFACT_CAPS.maxPageHeadingChars) }
          : {}),
        body: sanitizeArtifactText(
          p.body,
          ARTIFACT_CAPS.maxBookLinesPerPage,
          ARTIFACT_CAPS.maxBookLineChars,
          ARTIFACT_CAPS.maxBookPageChars,
        ),
      }));
    const artifact: Artifact = {
      id,
      kind: 'book',
      author: input.author,
      createdAtDay: Math.max(0, Math.floor(input.createdAtDay)),
      title: sanitizeTitle(input.title),
      revision: 1,
      immutable: Boolean(input.immutable),
      content: {
        kind: 'book',
        pages: sanitizedPages,
      },
    };
    this.items.set(id, artifact);
    return artifact;
  }

  updateBook(id: ArtifactId, title: string, pageIndex: number, page: BookPage): Artifact {
    const existing = this.items.get(id);
    if (!existing || existing.content.kind !== 'book') {
      throw new Error(`Book artifact ${id} not found.`);
    }
    if (existing.immutable) {
      throw new Error(`Artifact ${id} is immutable (sealed) and cannot be modified.`);
    }
    if (pageIndex < 0 || pageIndex >= existing.content.pages.length) {
      throw new Error(`Book page index ${pageIndex} out of bounds.`);
    }
    const pages = existing.content.pages.map((p, idx) =>
      idx === pageIndex
        ? {
            ...(page.heading
              ? { heading: sanitizeSingleLine(page.heading, ARTIFACT_CAPS.maxPageHeadingChars) }
              : {}),
            body: sanitizeArtifactText(
              page.body,
              ARTIFACT_CAPS.maxBookLinesPerPage,
              ARTIFACT_CAPS.maxBookLineChars,
              ARTIFACT_CAPS.maxBookPageChars,
            ),
          }
        : p,
    );
    const updated: Artifact = {
      ...existing,
      title: sanitizeTitle(title),
      revision: existing.revision + 1,
      content: { kind: 'book', pages },
    };
    this.items.set(id, updated);
    return updated;
  }

  addBookPage(id: ArtifactId, page: BookPage = { body: '' }): Artifact {
    const existing = this.items.get(id);
    if (!existing || existing.content.kind !== 'book') {
      throw new Error(`Book artifact ${id} not found.`);
    }
    if (existing.immutable) {
      throw new Error(`Artifact ${id} is immutable (sealed) and cannot be modified.`);
    }
    if (existing.content.pages.length >= ARTIFACT_CAPS.maxBookPages) {
      throw new Error(`Book ${id} already has the maximum of ${ARTIFACT_CAPS.maxBookPages} pages.`);
    }
    const nextPage: BookPage = {
      ...(page.heading
        ? { heading: sanitizeSingleLine(page.heading, ARTIFACT_CAPS.maxPageHeadingChars) }
        : {}),
      body: sanitizeArtifactText(
        page.body,
        ARTIFACT_CAPS.maxBookLinesPerPage,
        ARTIFACT_CAPS.maxBookLineChars,
        ARTIFACT_CAPS.maxBookPageChars,
      ),
    };
    const updated: Artifact = {
      ...existing,
      revision: existing.revision + 1,
      content: {
        kind: 'book',
        pages: [...existing.content.pages, nextPage],
      },
    };
    this.items.set(id, updated);
    return updated;
  }

  removeBookPage(id: ArtifactId, pageIndex: number): Artifact {
    const existing = this.items.get(id);
    if (!existing || existing.content.kind !== 'book') {
      throw new Error(`Book artifact ${id} not found.`);
    }
    if (existing.immutable) {
      throw new Error(`Artifact ${id} is immutable (sealed) and cannot be modified.`);
    }
    if (existing.content.pages.length <= 1) {
      throw new Error(`Book ${id} must retain at least 1 page.`);
    }
    if (pageIndex < 0 || pageIndex >= existing.content.pages.length) {
      throw new Error(`Book page index ${pageIndex} out of bounds.`);
    }
    const updated: Artifact = {
      ...existing,
      revision: existing.revision + 1,
      content: {
        kind: 'book',
        pages: existing.content.pages.filter((_, idx) => idx !== pageIndex),
      },
    };
    this.items.set(id, updated);
    return updated;
  }

  createPainting(input: {
    id?: ArtifactId;
    author: ArtifactAuthor;
    createdAtDay: number;
    title: string;
    pixels: string;
    paletteUsed: readonly number[];
    caption: string;
    subject: string;
    seed: number;
    model: string;
    status: 'pending' | 'ready' | 'failed';
  }): Artifact {
    this.assertCapacity();
    const decoded = decodePaintingPixels(input.pixels);
    const uniqueColors = Array.from(new Set(decoded)).sort((a, b) => a - b);
    if (uniqueColors.length > ARTIFACT_CAPS.maxPaintingColors) {
      throw new Error(
        `Painting uses ${uniqueColors.length} colours, exceeding max ${ARTIFACT_CAPS.maxPaintingColors}.`,
      );
    }
    const id = input.id ?? this.nextId();
    const artifact: Artifact = {
      id,
      kind: 'painting',
      author: input.author,
      createdAtDay: Math.max(0, Math.floor(input.createdAtDay)),
      title: sanitizeTitle(input.title),
      revision: 1,
      immutable: input.status === 'ready',
      content: {
        kind: 'painting',
        width: 48,
        height: 32,
        pixels: input.pixels,
        paletteUsed: uniqueColors,
        caption: sanitizeSingleLine(input.caption, ARTIFACT_CAPS.maxCaptionChars),
        subject: sanitizeSingleLine(input.subject, ARTIFACT_CAPS.maxSubjectChars),
        seed: Math.floor(input.seed),
        model: sanitizeSingleLine(input.model, 80),
        status: input.status,
      },
    };
    this.items.set(id, artifact);
    return artifact;
  }

  seal(id: ArtifactId): Artifact {
    const existing = this.items.get(id);
    if (!existing) {
      throw new Error(`Artifact ${id} not found.`);
    }
    if (existing.immutable) return existing;
    const sealed: Artifact = {
      ...existing,
      immutable: true,
      revision: existing.revision + 1,
    };
    this.items.set(id, sealed);
    return sealed;
  }

  remove(id: ArtifactId): boolean {
    return this.items.delete(id);
  }

  view(id: ArtifactId): ArtifactView | undefined {
    const art = this.items.get(id);
    if (!art) return undefined;
    let summary = '';
    if (art.content.kind === 'note') {
      summary = art.content.body.split('\n')[0]?.slice(0, 96) ?? '';
    } else if (art.content.kind === 'book') {
      summary = `${art.content.pages.length} page(s)`;
    } else {
      summary = art.content.caption;
    }
    return {
      id: art.id,
      kind: art.kind,
      author: art.author,
      createdAtDay: art.createdAtDay,
      title: art.title,
      revision: art.revision,
      immutable: art.immutable,
      summary,
    };
  }

  toJSON(): Artifact[] {
    return Array.from(this.items.values());
  }

  static fromJSON(raw: readonly unknown[]): ArtifactStore {
    if (raw.length > ARTIFACT_CAPS.maxArtifactsPerSave) {
      throw new Error(
        `Save contains ${raw.length} artifacts, exceeding cap of ${ARTIFACT_CAPS.maxArtifactsPerSave}.`,
      );
    }
    const store = new ArtifactStore();
    for (const entry of raw) {
      const parsed = ArtifactSchema.parse(entry) as Artifact;
      if (store.items.has(parsed.id)) {
        throw new Error(`Duplicate artifact ID ${parsed.id} in save.`);
      }
      store.items.set(parsed.id, parsed);
      const numericSuffix = Number(parsed.id.slice(4));
      if (Number.isInteger(numericSuffix) && numericSuffix > store.serial) {
        store.serial = numericSuffix;
      }
    }
    return store;
  }
}

export function validateArtifactReferences(
  artifacts: readonly Artifact[],
  heldIds: readonly string[],
  droppedIds: readonly string[],
  placements: readonly ArtifactPlacement[],
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const byId = new Map<string, Artifact>();
  for (const a of artifacts) {
    if (byId.has(a.id)) {
      errors.push(`Duplicate artifact definition: ${a.id}`);
    }
    byId.set(a.id, a);
  }
  const claimed = new Set<string>();
  const checkRef = (id: string, location: string) => {
    if (!byId.has(id)) {
      errors.push(`Missing artifact ${id} referenced in ${location}.`);
      return;
    }
    if (claimed.has(id)) {
      errors.push(`Artifact ${id} is referenced in multiple locations (${location}).`);
      return;
    }
    claimed.add(id);
  };

  for (const id of heldIds) checkRef(id, 'inventory');
  for (const id of droppedIds) checkRef(id, 'ground-drop');
  const occupiedHooks = new Set<string>();
  for (const p of placements) {
    const hookKey = `${p.sceneId}:${p.propId}`;
    if (occupiedHooks.has(hookKey)) {
      errors.push(`Display hook ${hookKey} has multiple placements.`);
    }
    occupiedHooks.add(hookKey);
    checkRef(p.artifactId, `placement(${hookKey})`);
  }

  return { ok: errors.length === 0, errors };
}
