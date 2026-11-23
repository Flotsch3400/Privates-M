// Update check: version numbers agree, a newer online version triggers a reload (once) or a button.
const {test, expect} = require("@playwright/test");
const fs = require("fs"), path = require("path");
const {offline, openWithDemo} = require("./helpers");

test("Versionsnummer ist in index.html, sw.js und version.json gleich", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "index.html"), "utf8").match(/const APP_VERSION = "([^"]+)"/)[1];
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8").match(/const CACHE = "([^"]+)"/)[1];
  const vj = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8")).v;
  expect([sw, vj]).toEqual([app, app]);
});

test("Neue Version online: lädt einmal automatisch neu, sonst Hinweis mit Knopf", async ({page, context}) => {
  await offline(context);
  await page.route("**/version.json*", r => r.fulfill({json: {v: "tracky-v999"}}));
  await openWithDemo(page);
  // first check reloads automatically (nothing is being edited)
  const nav = page.waitForEvent("framenavigated");
  await page.evaluate(() => Updater.check(true));
  await nav;
  await page.waitForLoadState();
  // page is still "old" (same APP_VERSION) → no second automatic reload, a button instead
  await page.evaluate(() => Updater.check(true));
  await expect(page.locator(".update-bar")).toContainText("Neue Tracky-Version");
  // settings show the state
  await page.goto("./#daten");
  await expect(page.locator("#ver-info")).toContainText("neu verfügbar: 999");
});
