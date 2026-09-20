import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 40000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3229",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: "http://127.0.0.1:3229/api/health",
    reuseExistingServer: false,
    timeout: 30000,
  },
  reporter: "list",
});
