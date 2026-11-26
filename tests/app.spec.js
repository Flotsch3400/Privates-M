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

test("Plus-Knopf am iPhone: Schnellaktionen", async ({page}, info) => {
  test.skip(info.project.name !== "iphone", "nur am Handy sichtbar");
  const errors = await openWithDemo(page);
  await page.click("#fab");
  await expect(page.locator("dialog h2")).toHaveText("Schnell erfassen");
  await page.click('[data-qa="gehalt"]');
  await expect(page.locator("#e-emp")).toContainText("Demo GmbH");
  await page.keyboard.press("Escape");
  await page.click("#fab");
  await page.click('[data-qa="bewertung"]');
  await expect(page).toHaveURL(/#bewertung/);
  await expect(page.locator("#fab")).toBeHidden();
  expect(errors).toEqual([]);
});

test("Übersicht anpassen: Blöcke ausblenden und sortieren, bleibt gespeichert", async ({page}) => {
  const errors = await openWithDemo(page);
  const order = () => page.$$eval("#view > section[data-ov]", els => els.filter(e => !e.hidden).map(e => e.dataset.ov));
  expect(await order()).toEqual(["kpis", "month", "chart", "periods", "providers"]);
  await page.click("#ov-custom");
  await page.click('[data-on="0"]');            // hide key figures
  await page.click('[data-up="2"]');            // move chart above "month" (index 2 → 1)
  await page.click("dialog [data-x]");
  expect(await order()).toEqual(["chart", "month", "periods", "providers"]);
  await page.reload();
  await expect(page.locator(".hero-total")).toBeVisible();
  expect(await order()).toEqual(["chart", "month", "periods", "providers"]);
  expect(await page.evaluate(() => DB.ui.ov.map(x => x.k + (x.on ? "" : "-")))).toEqual(["kpis-", "chart", "month", "periods", "providers"]);
  expect(errors).toEqual([]);
});
