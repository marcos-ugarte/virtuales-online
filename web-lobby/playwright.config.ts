import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config — connects the lobby to /web-ds (mobile-vendor wire).
 * The Vite dev server reads VITE_WS_URL; tests assume there is a /web-ds
 * endpoint reachable at the configured URL. In CI / local dev, point this
 * to a running virtuales-tv-broadcaster (default port :4099).
 */
const WEB_DS_URL =
  process.env.VITE_WS_URL ?? 'ws://127.0.0.1:4099/web-ds';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5173',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npm run dev -- --port 5173',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_WS_URL: WEB_DS_URL,
      },
    },
  ],
});
