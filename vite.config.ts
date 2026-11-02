import { defineConfig } from 'vitest/config';
import { execFileSync } from 'node:child_process';
const git = (...args: string[]): string => {
  try {
    return (
      execFileSync('git', args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() || 'unknown'
    );
  } catch {
    return 'unknown';
  }
};

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  define: {
    __HEARTHWILD_BUILD__: JSON.stringify({
      sha: process.env.BUILD_SHA ?? git('rev-parse', 'HEAD'),
      branch:
        process.env.BUILD_BRANCH ??
        (process.env.GITHUB_HEAD_REF ||
          process.env.GITHUB_REF_NAME ||
          git('branch', '--show-current')),
      builtAt: process.env.BUILD_DATE ?? new Date().toISOString(),
    }),
  },
  test: {
    testTimeout: 30_000,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/artifact-budget.test.ts'],
          sequence: { groupOrder: 0 },
        },
      },
      {
        extends: true,
        test: {
          name: 'artifact-budget',
          include: ['tests/artifact-budget.test.ts'],
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: { input: { game: 'index.html', gallery: 'gallery.html' } },
  },
});
