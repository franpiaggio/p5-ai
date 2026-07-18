import { defineConfig } from 'vitest/config';

// Unit tests target pure logic + the store. Node is the default environment;
// tests that need the DOM opt in per-file via `// @vitest-environment jsdom`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
