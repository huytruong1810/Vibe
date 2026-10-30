import { z } from 'zod';
import { AnimationClipSchema, AssetAppearanceSchema } from './catalog';

/** Artist-owned manifest: image paths are relative to art/source, never runtime URLs. */
export const SourceManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    frames: z.array(
      z
        .object({
          id: z.string().regex(/^[A-Za-z0-9_-]+$/),
          path: z
            .string()
            .regex(/^[A-Za-z0-9_./ -]+\.png$/)
            .refine(
              (p) => !p.startsWith('/') && !p.split('/').includes('..'),
              'Source path must stay within art/source',
            ),
          anchor: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict(),
        })
        .strict(),
    ),
    appearances: z.array(AssetAppearanceSchema),
    clips: z.array(AnimationClipSchema),
    portraits: z
      .array(
        z
          .object({
            kind: z.enum(['species', 'npc', 'origin']),
            contentId: z.string().min(1),
            hud96: z.string().min(1),
            hud128: z.string().min(1),
          })
          .strict(),
      )
      .optional(),
  })
  .strict()
  .superRefine((source, ctx) => {
    for (const [kind, rows] of [
      ['frame', source.frames],
      ['clip', source.clips],
      ['appearance', source.appearances],
    ] as const) {
      const seen = new Set<string>();
      for (const row of rows) {
        if (seen.has(row.id))
          ctx.addIssue({ code: 'custom', message: `Duplicate source ${kind} ID: ${row.id}` });
        seen.add(row.id);
      }
    }
    const bindings = new Set<string>();
    for (const appearance of source.appearances) {
      const id = `${appearance.kind}:${appearance.contentId}`;
      if (bindings.has(id))
        ctx.addIssue({ code: 'custom', message: `Duplicate source identity: ${id}` });
      bindings.add(id);
    }
  });
export type SourceManifest = z.infer<typeof SourceManifestSchema>;
