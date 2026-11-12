import { defineConfig } from "@playwright/test";
const port = process.env.Q1_TEST_PORT || "3000";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}`, headless: true },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/demo`,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [
    { name: "contracts", testMatch: "contracts.spec.ts" },
    ...(["chromium", "firefox", "webkit"] as const).map((browserName) => ({
      name: browserName,
      testMatch: "interface.spec.ts",
      use: { browserName },
    })),
  ],
});
