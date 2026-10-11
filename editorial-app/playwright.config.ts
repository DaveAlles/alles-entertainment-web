import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "website.e2e.spec.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 90000,
  expect: { timeout: 15000 },
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4174",
    headless: true,
    viewport: { width: 1280, height: 960 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node ../scripts/preview.mjs local",
    url: "http://127.0.0.1:4174/misattribution/editorial/",
    reuseExistingServer: false,
    timeout: 30000,
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "../.operations/step-c/browser-results.json" }],
  ],
});
