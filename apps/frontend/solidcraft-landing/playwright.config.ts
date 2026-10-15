import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testIgnore: '**/*.dev.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4322', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'python3 scripts/serve-review.py', url: 'http://127.0.0.1:4322', reuseExistingServer: !process.env.CI, timeout: 20_000 },
});
