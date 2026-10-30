import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], testTimeout: 30_000 },
  build: { target: 'es2022', sourcemap: true },
});
