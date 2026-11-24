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
  await expect(page.locator('.acc-row[data-id="tb-akt"]')).toBeHidden();
  await page.click('[data-tog="p:testbroker"]');
  const row = page.locator('.acc-row[data-id="tb-akt"]');
  await expect(row).toContainText("Automatisch");
  await expect(row.locator("[data-auto]")).toBeChecked();
  // positions fold out
  await row.locator(".acc-main").click();
  await expect(page.locator(".acc-pos", {hasText: "Testaktie"})).toBeVisible();
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
  await expect(page.locator('.acc-row[data-id="giro"]')).toBeHidden();
  await expect(page.locator('[data-tog="c:liquiditaet"]')).toContainText("Konten & Tagesgeld");
});

test("Kontoseite: große Bereiche starten zugeklappt, Fenster schließt animiert", async ({page}) => {
  await openWithDemo(page);
  await page.evaluate(() => {
    DB.accounts.push({id: "tb-akt", name: "Testbroker", provider: "Testbroker", cat: "wertpapiere", holdings: Array.from({length: 9}, (_, i) => ({id: "x" + i, type: "stock", symbol: "X" + i, name: "Aktie " + i, qty: 1, lastPrice: 10})), archived: false},
                     {id: "tb-k", name: "Testbroker", provider: "Testbroker", cat: "krypto", holdings: [{id: "c1", type: "crypto", symbol: "bitcoin", name: "Bitcoin", qty: .1}], archived: false});
    save(true); platformDialog("testbroker");
  });
  // 9 positions → folded; 1 position → open
  await expect(page.locator('dialog .plat-row[data-ph="x0"]')).toBeHidden();
  await expect(page.locator('dialog .plat-row[data-ph="c1"]')).toBeVisible();
  await expect(page.locator(":focus")).not.toHaveAttribute("data-x", "");
  await page.click('[data-stog="tb-akt"]');
  await expect(page.locator('dialog .plat-row[data-ph="x0"]')).toBeVisible();
  // Esc closes with the short animation
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).toHaveClass(/closing/);
  await expect(page.locator("dialog")).toBeHidden();
  expect(await page.evaluate(() => dlg.open)).toBe(false);
});
