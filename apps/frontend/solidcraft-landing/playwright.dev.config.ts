import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', testMatch: '**/*.dev.spec.ts', workers: 1,
  reporter: 'list', timeout: 60_000,
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4348' },
  webServer: { command: 'pnpm exec astro dev --ignore-lock --host 127.0.0.1 --port 4348', url: 'http://127.0.0.1:4348', timeout:30_000, reuseExistingServer:false },
});
