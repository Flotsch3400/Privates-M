// @ts-check
const {defineConfig, devices} = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests",
  timeout: 45_000,
  expect: {timeout: 8_000},
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", {open: "never"}]] : "list",
  use: {
    baseURL: "http://localhost:4173/",
    locale: "de-AT",
    timezoneId: "Europe/Vienna",
    trace: "off",
    serviceWorkers: "block",
  },
  webServer: {command: "node tests/server.mjs", url: "http://localhost:4173/", reuseExistingServer: !process.env.CI},
  projects: [
    {name: "desktop", use: {...devices["Desktop Chrome"], viewport: {width: 1400, height: 1000}}},
    {name: "iphone", use: {...devices["Desktop Chrome"], viewport: {width: 440, height: 956}, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1"}},
  ],
});
