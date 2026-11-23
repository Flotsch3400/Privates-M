// Price sources (onvista for securities/metals, CoinGecko with Binance fallback) and the central list of missing prices.
const {test, expect} = require("@playwright/test");
const {offline, openWithDemo} = require("./helpers");

test.beforeEach(async ({context}) => offline(context));

test("Kurse: ETF über onvista, Gold in Euro, ETH per Kürzel", async ({page}) => {
  const errors = await openWithDemo(page);
  const r = await page.evaluate(async () => {
    const j = await MARKET.quotes([
      {type: "stock", symbol: "EUNL.DE", name: "iShares Core MSCI World"},
      {type: "metal", symbol: "XAU"},
      {type: "crypto", symbol: "ETH", name: "ETH"},
      {type: "crypto", symbol: "bitcoin", name: "Bitcoin"},
    ]);
    return {q: Object.fromEntries(Object.entries(j.quotes).map(([k, q]) => [k, [+q.priceEur.toFixed(2), q.source]])), e: j.errors, res: j.resolved};
  });
  expect(r.q["stock:EUNL.DE"]).toEqual([124, "onvista · Tradegate"]);
  expect(r.q["metal:XAU"][0]).toBeCloseTo(3261 / 1.087, 1);
  expect(r.q["crypto:ETH"]).toEqual([1500, "Binance"]);
  expect(r.q["crypto:bitcoin"]).toEqual([80000, "CoinGecko"]);
  expect(r.res["stock:EUNL.DE"]).toEqual({ov: {type: "FUND", id: "25096683"}, isin: "IE00B4L5Y983"});
  expect(errors).toEqual([]);
});

test("Fehlende Kurse werden zentral angezeigt und lassen sich beheben", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.evaluate(() => {
    DB.accounts.find(a => a.id === "depot").holdings.push(
      {id: "ok", type: "stock", symbol: "EUNL.DE", name: "MSCI World ETF", qty: 10},
      {id: "bad", type: "stock", symbol: "XYZ.DE", name: "Unbekannte AG", qty: 5, lastPrice: 10});
    save(true);
  });
  await page.evaluate(() => refreshQuotes(true));
  await page.goto("./#uebersicht");
  const bar = page.locator("#pi-bar");
  await expect(bar).toBeVisible();
  await expect(bar).toContainText("1 Position ohne aktuellen Kurs");
  await expect(bar).toContainText("Unbekannte AG");
  // the resolved ETF keeps its onvista reference
  expect(await page.evaluate(() => DB.accounts.find(a => a.id === "depot").holdings[0].isin)).toBe("IE00B4L5Y983");

  await bar.locator("[data-issues]").click();
  await expect(page.locator("dialog h2")).toHaveText("Fehlende Kurse");
  await expect(page.locator("dialog")).toContainText("Wertpapier nicht gefunden");
  // fix: open it, search by WKN, pick the result, save
  await page.locator('[data-ih="bad"]').click();
  await page.fill("#h-q", "A0RPWH");
  await page.locator("#h-res button").first().click();
  await page.click("#hf button[type=submit]");
  await expect(page.locator("dialog h2")).toHaveText("Fehlende Kurse");
  await expect(page.locator("dialog")).toContainText("Alle Positionen haben einen aktuellen Kurs");
  await page.keyboard.press("Escape");
  await expect(bar).toBeHidden();
  expect(await page.evaluate(() => { const h = DB.accounts.find(a => a.id === "depot").holdings[1]; return [h.symbol, h.isin, h.ov?.id]; })).toEqual(["IE00B4L5Y983", "IE00B4L5Y983", "25096683"]);
  expect(errors).toEqual([]);
});
