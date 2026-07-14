import { defineConfig } from 'vitest/config';

// Unit tests target pure logic (parsing, file-edit planning, preview assembly),
// so a plain node environment is enough — no DOM/jsdom needed.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
