// New valuation grouped by platform: add a category to a platform, walk through with Enter, nothing typed gets lost.
const {test, expect} = require("@playwright/test");
const {offline, openWithDemo, noOverflow} = require("./helpers");

test.beforeEach(async ({context}) => offline(context));

test("Bewertung nach Plattform, Kategorie hinzufügen, Enter springt weiter", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.goto("./#bewertung");
  await page.click('#v-mode [data-v="plat"]');
  // platforms as groups, sorted by value (Demobroker 38.100 € first)
  await expect(page.locator(".val-group").first()).toContainText("Demobroker");
  const bank = page.locator('.val-group[data-g="p:demobank"]');
  await expect(bank).toContainText("Konten & Tagesgeld");
  await expect(bank).toContainText("Kreditkarten & Kredite");
  // type a value, then add a new category to the platform – the typed value stays
  await page.fill('input[data-acc="giro"]', "4.000");
  await bank.locator("[data-addcat]").click();
  await bank.locator('[data-newcat="krypto"]').click();
  const newInp = bank.locator('input[aria-label^="Wert Demobank Krypto"]');
  await expect(newInp).toBeFocused();
  await page.keyboard.type("250");
  await expect(page.locator('input[data-acc="giro"]')).toHaveValue("4.000,00");
  // Enter moves to the next field
  await page.locator('input[data-acc="giro"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('input[data-acc="tagesgeld"]')).toBeFocused();
  // "Konto hinzufügen" keeps the draft too
  await page.click("#v-add");
  await page.fill("#a-name", "Neue Bank");
  await page.click("#af button[type=submit]");
  await expect(page.locator('input[data-acc="giro"]')).toHaveValue("4.000,00");
  expect(await noOverflow(page)).toBe(true);
  await page.click("#v-save");
  const r = await page.evaluate(() => { const s = latest(), k = DB.accounts.find(a => a.provider === "Demobank" && a.cat === "krypto"); return [s.values.giro, s.values[k.id], DB.accounts.some(a => a.name === "Neue Bank")]; });
  expect(r).toEqual([4000, 250, true]);
  expect(errors).toEqual([]);
});

test("Bewertung nach Kategorie bleibt möglich, Gruppen klappen", async ({page}) => {
  await openWithDemo(page);
  await page.goto("./#bewertung");
  await page.click('#v-mode [data-v="cat"]');
  const g = page.locator('.val-group[data-g="c:liquiditaet"]');
  await expect(g).toContainText("Girokonto Demo");
  await g.locator(".gh").click();
  await expect(page.locator('input[data-acc="giro"]')).toBeHidden();
  await page.reload();
  await expect(page.locator('input[data-acc="giro"]')).toBeHidden();
  await page.click("#v-all");
  await expect(page.locator('input[data-acc="giro"]')).toBeVisible();
});
