// Cost basis and profit/loss in the depot.
const {test, expect} = require("@playwright/test");
const {offline, openWithDemo} = require("./helpers");

test.beforeEach(async ({context}) => offline(context));

test("Einstand pro Stück und gesamt ergibt Gewinn/Verlust", async ({page}) => {
  const errors = await openWithDemo(page);
  const r = await page.evaluate(() => {
    const a = DB.accounts.find(x => x.id === "depot");
    a.holdings.push({id: "hw", type: "stock", symbol: "WIN.DE", name: "Gewinner AG", qty: 10, lastPrice: 50, lastAt: new Date().toISOString(), cost: {per: 40}},
                    {id: "hl", type: "stock", symbol: "LOS.DE", name: "Verlierer AG", qty: 20, lastPrice: 21, lastAt: new Date().toISOString(), cost: {total: 500}});
    save(true);
    const w = hVal(a.holdings[0]), l = hVal(a.holdings[1]);
    return {w: [w.pl, w.plPct], l: [l.pl, l.plPct]};
  });
  expect(r.w[0]).toBeCloseTo(100); expect(r.w[1]).toBeCloseTo(0.25);
  expect(r.l[0]).toBeCloseTo(-80); expect(r.l[1]).toBeCloseTo(-0.16);
  await page.goto("./#depot");
  await expect(page.locator("#view")).toContainText("Kursgewinn");
  await expect(page.locator("#view")).toContainText("Gewinner AG");
  expect(errors).toEqual([]);
});

test("Einstand im Dialog eintragen", async ({page}) => {
  await openWithDemo(page);
  await page.evaluate(() => {
    DB.accounts.find(x => x.id === "depot").holdings.push({id: "hd", type: "stock", symbol: "DLG.DE", name: "Dialog AG", qty: 4, lastPrice: 30, lastAt: new Date().toISOString()});
    save(true);
  });
  await page.goto("./#depot");
  await page.locator('.h-row[data-h="hd"]').first().click();
  await page.click('#h-cmode [data-v="total"]');
  await page.fill("#h-cost", "100");
  await page.click("#hf button[type=submit]");
  await expect.poll(() => page.evaluate(() => { const h = DB.accounts.find(x => x.id === "depot").holdings[0]; return hVal(h).pl; })).toBeCloseTo(20);
});

test("Depot einfügen übernimmt Stückzahl und Einstand", async ({page}) => {
  await openWithDemo(page);
  const rows = await page.evaluate(() => parseDepotText("Apple | US0378331005 | 1,25 Stk | Einstand 150,10\nSAP | DE0007164600 | 3 Stk | Einstand 1.234,50\niShares Core MSCI World   IE00B4L5Y983   125 Stk."));
  expect(rows).toEqual([
    {isin: "US0378331005", name: "Apple", qty: 1.25, costPer: 150.1},
    {isin: "DE0007164600", name: "SAP", qty: 3, costPer: 1234.5},
    {isin: "IE00B4L5Y983", name: "iShares Core MSCI World", qty: 125},
  ]);
  // full flow with the mocked onvista ETF
  await page.goto("./#depot");
  await page.click("#d-imp");
  await page.selectOption("#dp-acc", "depot");
  await page.fill("#dp-txt", "iShares Core MSCI World | IE00B4L5Y983 | 10 Stk | Einstand 100,00");
  await expect(page.locator("#dp-ok")).toBeEnabled();
  await page.click("#dp-ok");
  const h = await page.evaluate(() => { const h = DB.accounts.find(a => a.id === "depot").holdings[0]; return {symbol: h.symbol, qty: h.qty, cost: h.cost, ov: h.ov}; });
  expect(h).toEqual({symbol: "IE00B4L5Y983", qty: 10, cost: {per: 100}, ov: {type: "FUND", id: "25096683"}});
  await expect.poll(() => page.evaluate(() => Math.round(hVal(DB.accounts.find(a => a.id === "depot").holdings[0]).pl))).toBe(240);
});
