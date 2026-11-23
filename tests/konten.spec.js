// Konten: platforms/categories collapsible and sorted by value, automatic vs. manual with a switch.
const {test, expect} = require("@playwright/test");
const {offline, openWithDemo, noOverflow} = require("./helpers");

test.beforeEach(async ({context}) => offline(context));

test("Plattformen auf-/zuklappen, nach Bestand sortiert, Schalter automatisch/händisch", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.evaluate(() => {
    DB.accounts.push({id: "tb-akt", name: "Testbroker", provider: "Testbroker", cat: "wertpapiere", holdings: [{id: "h1", type: "stock", symbol: "X1", name: "Testaktie", qty: 10, lastPrice: 5}], archived: false},
                     {id: "tb-cash", name: "Testbroker", provider: "Testbroker", cat: "liquiditaet", holdings: [], archived: false});
    save(true);
  });
  await page.goto("./#konten");
  await page.click('#k-mode [data-v="plat"]');
  // sorted by value, descending
  const sums = await page.$$eval("#k-list .plat-head .sum", els => els.map(e => parseFloat(e.textContent.replace(/[^\d,-]/g, "").replace(",", "."))));
  expect(sums).toEqual([...sums].sort((a, b) => b - a));
  // collapsed by default, opens on click
  await expect(page.locator('.acc-row[data-id="tb-akt"]')).toHaveCount(0);
  await page.click('[data-tog="p:testbroker"]');
  const row = page.locator('.acc-row[data-id="tb-akt"]');
  await expect(row).toContainText("Automatisch");
  await expect(row.locator("[data-auto]")).toBeChecked();
  // positions fold out
  await row.locator(".acc-main").click();
  await expect(page.locator(".acc-pos")).toContainText("Testaktie");
  // switch to manual: positions no longer count
  await row.locator("[data-auto]").click();
  await expect(page.locator('.acc-row[data-id="tb-akt"]')).toContainText("Händisch");
  expect(await page.evaluate(() => [accById("tb-akt").manual, isLive(accById("tb-akt"))])).toEqual([true, false]);
  // and back
  await page.locator('.acc-row[data-id="tb-akt"] [data-auto]').click();
  expect(await page.evaluate(() => isLive(accById("tb-akt")))).toBe(true);
  // a manual account without positions → switching on opens the account page to add positions
  await page.locator('.acc-row[data-id="tb-cash"] [data-auto]').click();
  await expect(page.locator("dialog h2")).toContainText("Testbroker");
  await page.keyboard.press("Escape");
  // state persists after reload; "Alle zuklappen"
  await page.reload();
  await expect(page.locator('.acc-row[data-id="tb-akt"]')).toBeVisible();
  await page.click("#k-all");
  await page.click("#k-all");
  await expect(page.locator(".plat-card.open")).toHaveCount(0);
  expect(await noOverflow(page)).toBe(true);
  expect(errors).toEqual([]);
});

test("Kategorien auf-/zuklappen", async ({page}) => {
  await openWithDemo(page);
  await page.goto("./#konten");
  await page.click('#k-mode [data-v="cat"]');
  await expect(page.locator('.acc-row[data-id="giro"]')).toBeVisible();
  await page.click('[data-tog="c:liquiditaet"]');
  await expect(page.locator('.acc-row[data-id="giro"]')).toHaveCount(0);
  await expect(page.locator('[data-tog="c:liquiditaet"]')).toContainText("Konten & Tagesgeld");
});
