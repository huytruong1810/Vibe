import { z } from 'zod';

export const BuildStampSchema = z
  .object({
    sha: z.string().min(1).max(64),
    builtAt: z.string().max(40),
    branch: z.string().min(1).max(200),
  })
  .strict();
export type BuildStamp = z.infer<typeof BuildStampSchema>;
declare const __HEARTHWILD_BUILD__: BuildStamp;
export const BUILD: Readonly<BuildStamp> = Object.freeze(
  typeof __HEARTHWILD_BUILD__ === 'undefined'
    ? { sha: 'development', builtAt: '', branch: 'local' }
    : BuildStampSchema.parse(__HEARTHWILD_BUILD__),
);
