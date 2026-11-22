// Navigation, layout and the core valuation flow – runs on desktop and iPhone size.
const {test, expect} = require("@playwright/test");
const {offline, openWithDemo, noOverflow} = require("./helpers");

const ROUTES = ["uebersicht", "einkommen", "lieferando", "aktien", "krypto", "bewertung", "depot", "verlauf", "konten", "planung", "daten"];

test.beforeEach(async ({context}) => offline(context));

test("leerer Start ohne Fehler", async ({page}) => {
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("./");
  await expect(page.locator("#view")).not.toBeEmpty();
  expect(errors).toEqual([]);
});

test("alle Seiten laden ohne Fehler und ohne seitliches Scrollen", async ({page}) => {
  const errors = await openWithDemo(page);
  await expect(page.locator(".hero-total")).toContainText("77.490");
  for (const r of ROUTES) {
    await page.goto("./#" + r);
    await expect(page.locator("#view")).not.toBeEmpty();
    await page.waitForTimeout(150);
    expect(await noOverflow(page), r + ": seitliches Scrollen").toBe(true);
  }
  expect(errors).toEqual([]);
});

test("Daten bleiben nach dem Neuladen erhalten", async ({page}) => {
  await openWithDemo(page);
  await page.reload();
  await expect(page.locator(".hero-total")).toContainText("77.490");
  expect(await page.evaluate(() => DB.snapshots.length)).toBe(10);
});

test("neuer Stichtag wird gespeichert", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.evaluate(() => {
    const last = latest(), s = {id: "t1", date: todayISO(), values: {...last.values}, detail: {}};
    s.values.giro = (s.values.giro || 0) + 1000;
    DB.snapshots.push(s); save(true);
  });
  await page.goto("./#verlauf");
  await page.goto("./#uebersicht");
  await expect(page.locator(".hero-total")).toContainText("78.490");
  expect(errors).toEqual([]);
});
