const {test, expect} = require("@playwright/test");
const {openWithDemo} = require("./helpers");

test("Neues Konto mit überwiesenem Geld: Umbuchung erfassen, zählt nicht doppelt", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.evaluate(() => { DB.accounts.push({id: "wirex", name: "Wirex One", provider: "Wirex", cat: "konten", archived: false, holdings: [{id: "hw", type: "cash", name: "Bargeld", qty: 1000, ccy: "EUR"}]}); save(true); go(true); });
  const giro0 = await page.evaluate(() => latest().values.giro);
  const banner = page.locator('[data-nm="wirex"]');
  await expect(banner).toContainText("neu dazugekommen");
  await banner.locator("[data-nmt]").click();
  await expect(page.locator("#t-amt")).toHaveValue("1.000,00");
  await page.selectOption("#t-from", "giro");
  await page.click('#tf button[type="submit"]');
  await expect(page.locator(".toast")).toContainText("Umbuchung");
  await expect(banner).toHaveCount(0);
  expect(await page.evaluate(() => accNow(accById("giro")))).toBe(giro0 - 1000);
  // the next valuation starts with the reduced giro account
  await page.goto("./#bewertung");
  await page.click('#v-mode [data-v="plat"]');
  await expect(page.locator('input[data-acc="giro"]')).toHaveValue(new Intl.NumberFormat("de-DE", {minimumFractionDigits: 2}).format(giro0 - 1000));
  await expect(page.locator("#v-tr")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Ist neues Geld: Hinweis verschwindet", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.evaluate(() => { DB.accounts.push({id: "wirex", name: "Wirex One", provider: "Wirex", cat: "konten", archived: false, holdings: [{id: "hw", type: "cash", name: "Bargeld", qty: 300, ccy: "EUR"}]}); save(true); go(true); });
  await page.click('[data-nmok="wirex"]');
  await expect(page.locator('[data-nm="wirex"]')).toHaveCount(0);
  await page.goto("./#konten");
  await expect(page.locator("#k-nm [data-nm]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Bewertung: neuer Betrag – von anderem Konto überwiesen", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.goto("./#bewertung");
  await page.click('#v-mode [data-v="plat"]');
  const giro0 = await page.evaluate(() => latest().values.giro);
  const bank = page.locator('.val-group[data-g="p:demobank"]');
  await bank.locator("[data-addcat]").click();
  await bank.locator('[data-newcat="krypto"]').click();
  await page.keyboard.type("500");
  const id = await page.evaluate(() => DB.accounts.find(a => a.provider === "Demobank" && a.cat === "krypto").id);
  await page.click(`[data-vtr="${id}"]`);
  await page.selectOption("#t-from", "giro");
  await page.click('#tf button[type="submit"]');
  await expect(page.locator('input[data-acc="giro"]')).toHaveValue(new Intl.NumberFormat("de-DE", {minimumFractionDigits: 2}).format(giro0 - 500));
  await expect(page.locator(`[data-vtr="${id}"]`)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Edelmetall live: Liste mit kleinen Bildern, nicht abgeschnitten", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.goto("./#bewertung");
  await page.click('#v-mode [data-v="plat"]');
  await page.click('[data-vm="gold"][data-m="amount"]');
  await page.evaluate(() => { accById("gold").holdings = []; });
  await page.click('[data-vm="gold"][data-m="live"]');
  await page.click('[data-ih="gold"] [data-ihs]');
  const btn = page.locator('[data-ih="gold"] [data-ihr] button').first();
  await expect(btn).toBeVisible();
  const h = await btn.evaluate(b => b.getBoundingClientRect().height);
  expect(h).toBeLessThan(80);
  await btn.click();
  await expect(page.locator('[data-ih="gold"] [data-ihq]')).toBeFocused();
  expect(errors).toEqual([]);
});
