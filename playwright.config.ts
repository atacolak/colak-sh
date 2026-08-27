import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    channel: "chrome",
  },
  webServer: [
    {
      command: "pnpm exec tsx server/index.ts",
      url: "http://127.0.0.1:8790/healthz",
      reuseExistingServer: true,
      env: {
        FAKE_AGENT: process.env.FAKE_AGENT ?? "1",
        PORT: "8790",
        HOST: "127.0.0.1",
      },
    },
    {
      command: "pnpm dev:client --host 127.0.0.1 --port 5173",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
    },
  ],
});
