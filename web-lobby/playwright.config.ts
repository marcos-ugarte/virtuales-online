import { defineConfig, devices } from '@playwright/test';

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
      // Relay WebSocket server (WS-only, no HTTP — use port for TCP readiness check)
      command: 'node relay/index.js',
      port: 8765,
      reuseExistingServer: !process.env.CI,
      cwd: '..',
    },
    {
      // Vite dev server
      command: 'npm run dev -- --port 5173',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
