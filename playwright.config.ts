import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const FRONTEND_PORT = 5273;
const BACKEND_PORT = 3211;

/**
 * E2E smoke suite. Boots a dedicated backend (own port + own SQLite file) and
 * a dedicated Vite dev server, so runs never touch the regular dev environment
 * or database. The LLM is mocked at the network level inside the tests.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Single worker: tests share one backend DB and one admin account.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: `mkdir -p e2e/.data && rm -f e2e/.data/e2e.sqlite* && pnpm --dir backend start`,
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PORT: String(BACKEND_PORT),
        DATABASE_PATH: path.join(__dirname, 'e2e/.data/e2e.sqlite'),
        JWT_SECRET: 'e2e-jwt-secret',
        ADMIN_PASSWORD: 'e2e-admin-password',
        CORS_ORIGIN: `http://localhost:${FRONTEND_PORT}`,
      },
    },
    {
      command: `pnpm --dir frontend dev --port ${FRONTEND_PORT} --strictPort`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        BACKEND_PROXY_TARGET: `http://localhost:${BACKEND_PORT}`,
      },
    },
  ],
});
