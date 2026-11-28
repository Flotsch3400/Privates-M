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

test("Neue Version online: lädt beim Öffnen automatisch neu (mit frischer Adresse), bis zu 3 Versuche, dann Knopf", async ({page, context}) => {
  await offline(context);
  await openWithDemo(page);
  await page.route("**/version.json*", r => r.fulfill({json: {v: "tracky-v999"}}));
  const urls = [];
  page.on("request", r => { if (r.resourceType() === "document") urls.push(r.url()); });
  await page.evaluate(() => Updater.check(true));
  // the page here stays "old" (same APP_VERSION) → it tries a few times, then offers the button
  await expect(page.locator(".update-bar")).toContainText("Neue Tracky-Version", {timeout: 20_000});
  expect(urls.length).toBe(3);
  expect(urls.every(u => u.includes("?v=tracky-v999"))).toBe(true);
  expect(page.url()).not.toContain("?v=");          // address is cleaned up again
  await expect(page.locator(".hero-total")).toBeVisible();  // data still there
  await page.goto("./#daten");
  await expect(page.locator("#ver-info")).toContainText("neu verfügbar: 999");
});

test("Beim Zurückkehren in die App wird geprüft – nur nicht, während getippt wird", async ({page, context}) => {
  await offline(context);
  await openWithDemo(page, "bewertung");
  await page.fill('#v-note', "halb getippt");
  await page.route("**/version.json*", r => r.fulfill({json: {v: "tracky-v999"}}));
  let docs = 0; page.on("request", r => { if (r.resourceType() === "document") docs++; });
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.locator(".update-bar")).toBeVisible();
  expect(docs).toBe(0);
  await expect(page.locator("#v-note")).toHaveValue("halb getippt");
});
