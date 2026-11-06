import { z } from 'zod';
import { ArtifactIdSchema, type ArtifactView } from './artifacts';
import { DialogueEmotionSchema } from './dialogue';
const range = z.tuple([
  z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
]);
export const ReadTextSchema = z
  .object({
    type: z.literal('READ_TEXT'),
    artifactId: ArtifactIdSchema,
    pages: range.optional(),
    lines: range.optional(),
  })
  .strict()
  .refine((a) => !!a.pages !== !!a.lines, 'Choose exactly one range');
export const WriteNoteSchema = z
  .object({
    type: z.literal('WRITE_NOTE'),
    title: z.string().min(1).max(48),
    lines: z.array(z.string().max(96)).min(1).max(12),
    giveToPlayer: z.boolean(),
  })
  .strict();
export const WritePageSchema = z
  .object({
    type: z.literal('WRITE_PAGE'),
    artifactId: ArtifactIdSchema,
    lines: z.array(z.string().max(96)).min(1).max(24),
  })
  .strict();
export const LiteracyActionSchema = z.discriminatedUnion('type', [
  ReadTextSchema,
  WriteNoteSchema,
  WritePageSchema,
]);
export type LiteracyAction = z.infer<typeof LiteracyActionSchema>;
export const ReadingResponseSchema = z
  .object({
    dialogue: z.string().trim().min(1).max(400),
    emotion: DialogueEmotionSchema,
    summary: z
      .string()
      .trim()
      .min(1)
      .max(4000)
      .refine((s) => s.trim().split(/\s+/).length <= 40, 'Use at most 40 words'),
    wantsMore: z.boolean(),
  })
  .strict();
export const ReadingProvenanceSchema = z
  .object({
    artifactId: ArtifactIdSchema,
    revision: z.number().int().min(1),
    pages: range.optional(),
    lines: range.optional(),
    pageLines: z
      .array(
        z
          .object({
            page: z.number().int().min(1).max(48),
            from: z.number().int().min(1).max(24),
            to: z.number().int().min(1).max(24),
          })
          .strict(),
      )
      .max(2)
      .optional(),
  })
  .strict()
  .refine((p) => !!p.pages !== !!p.lines, 'Choose exactly one source range')
  .refine((p) => {
    const selected = p.pages ?? p.lines!;
    return (
      selected[0] <= selected[1] &&
      selected[1] <= (p.pages ? 48 : 24) &&
      (!p.pageLines ||
        (!!p.pages &&
          p.pageLines.every(
            (r) => r.from <= r.to && r.page >= selected[0] && r.page <= selected[1],
          )))
    );
  }, 'Invalid reading provenance range');
export type ReadingProvenance = z.infer<typeof ReadingProvenanceSchema>;
export interface ReadingTarget {
  readonly metadata: ArtifactView;
  readonly source: ReadingProvenance;
  readonly requested: z.infer<typeof ReadTextSchema>;
  readonly excerpt: string;
  readonly conversationId?: string;
  readonly continuation?: {
    artifactId: string;
    revision: number;
    next: [number, number];
    kind: 'pages' | 'lines';
    offset: number;
  };
}
export const isLiteracyAction = (action: { type: string }): action is LiteracyAction =>
  ['READ_TEXT', 'WRITE_NOTE', 'WRITE_PAGE'].includes(action.type);
