// Entering positions per platform (e.g. a broker with stocks, gold and crypto): each position lands in the right category.
const {test, expect} = require("@playwright/test");
const {offline, openWithDemo, noOverflow} = require("./helpers");

test.beforeEach(async ({context}) => offline(context));

async function addBroker(page) {
  await page.evaluate(() => {
    DB.accounts.push({id: "tb-cash", name: "Testbroker", provider: "Testbroker", cat: "liquiditaet", holdings: [], archived: false},
                     {id: "tb-akt", name: "Testbroker", provider: "Testbroker", cat: "wertpapiere", holdings: [], archived: false});
    save(true);
  });
}

test("Plattform: Krypto und Gold landen automatisch im passenden Bereich", async ({page}) => {
  const errors = await openWithDemo(page);
  await addBroker(page);
  await page.goto("./#konten");
  await page.click('#k-mode [data-v="plat"]');
  await expect(page.locator("#k-list")).toContainText("Testbroker");
  await page.click('[data-tog="p:testbroker"]');
  await page.click('#k-list [data-plat="testbroker"]');
  await expect(page.locator("dialog h2")).toContainText("Testbroker");

  // crypto: area does not exist yet → created
  await page.click('.plat-cats [data-pcat="krypto"]');
  await expect(page.locator("#h-acc")).toHaveValue("__plat");
  await page.fill("#h-q", "bitcoin");
  await page.locator("#h-res button").first().click();
  await page.fill("#h-qty", "0,5");
  await page.click("#h-next");
  // next position: same platform, gold
  await expect(page.locator("dialog h2")).toContainText("Position bei Testbroker");
  await page.click('#h-type [data-v="metal"]');
  await page.fill("#h-qty", "2");
  await page.click("#hf button[type=submit]");
  // back in the platform overview
  await expect(page.locator("dialog h2")).toContainText("Testbroker");
  await expect(page.locator("dialog")).toContainText("Krypto");
  await expect(page.locator("dialog")).toContainText("Edelmetalle");

  const r = await page.evaluate(() => DB.accounts.filter(a => a.provider === "Testbroker").map(a => a.cat + ":" + a.holdings.map(h => h.type + "/" + h.symbol + "/" + h.qty).join(",")).sort());
  expect(r).toEqual(["edelmetalle:metal/XAU/2", "krypto:crypto/bitcoin/0.5", "liquiditaet:", "wertpapiere:"]);

  // a stock goes to the existing "Aktien & ETFs" area, no new account
  if (!(await page.locator('.plat-cats [data-pcat="wertpapiere"]').isVisible())) await page.click("#pl-addtog");
  await page.click('.plat-cats [data-pcat="wertpapiere"]');
  await expect(page.locator("#h-acc")).toHaveValue("tb-akt");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => DB.accounts.filter(a => a.provider === "Testbroker").length)).toBe(4);
  expect(await noOverflow(page)).toBe(true);
  expect(errors).toEqual([]);
});

test("Plattformen im Depot und in der Suche", async ({page}) => {
  await openWithDemo(page);
  await addBroker(page);
  await page.goto("./#depot");
  await expect(page.locator("#d-plats")).toContainText("Testbroker");
  await page.evaluate(() => openSearch());
  await page.locator("#q-in").fill("testbroker");
  await expect(page.locator(".q-group").first()).toHaveText("Plattformen");
  await page.keyboard.press("Enter");
  await expect(page.locator("dialog [data-pcat]").first()).toBeVisible();
});

test("Konto anklicken → Assets nach Kategorie erfassen (Betrag, Schuld)", async ({page}) => {
  const errors = await openWithDemo(page);
  await addBroker(page);
  await page.goto("./#konten");
  await page.click('#k-mode [data-v="cat"]');
  // click the broker's cash account
  await page.locator('.acc-row[data-id="tb-cash"] .acc-main').click();
  await expect(page.locator("dialog h2")).toContainText("Testbroker");
  await expect(page.locator('[data-sec="tb-cash"]')).toHaveClass(/focus/);
  // amount asset in "Konten & Tagesgeld" + next one
  await page.locator('[data-sec="tb-cash"] [data-pcat="liquiditaet"]').click();
  await page.fill("#c-n", "Verrechnungskonto");
  await page.press("#c-n", "Enter");
  await expect(page.locator("#c-a")).toBeFocused();
  await page.keyboard.type("1.250,50");
  await page.click("#c-next");
  await page.fill("#c-n", "USD-Guthaben");
  await page.fill("#c-a", "99,50");
  await page.click("#cf button[type=submit]");
  await expect(page.locator('[data-sec="tb-cash"]')).toContainText("1.350,00");
  // a debt in a new area "Kreditkarten & Kredite"
  if (!(await page.locator('.plat-cats [data-pcat="kredite"]').isVisible())) await page.click("#pl-addtog");
  await page.locator('.plat-cats [data-pcat="kredite"]').click();
  await page.fill("#c-n", "Kreditkarte");
  await page.fill("#c-a", "200");
  await page.click("#cf button[type=submit]");
  await expect(page.locator("dialog")).toContainText("Kreditkarten & Kredite");
  const r = await page.evaluate(() => DB.accounts.filter(a => a.provider === "Testbroker").map(a => [a.cat, accLive(a)?.value ?? null]).sort());
  expect(r).toEqual([["kredite", -200], ["liquiditaet", 1350], ["wertpapiere", null]]);
  // edit an amount
  await page.locator("dialog .plat-row", {hasText: "USD-Guthaben"}).click();
  await page.fill("#c-a", "100");
  await page.click("#cf button[type=submit]");
  await expect(page.locator('[data-sec="tb-cash"]')).toContainText("1.350,50");
  // a valuation picks the amounts up; typing a value updates a single amount
  await page.keyboard.press("Escape");
  await page.goto("./#bewertung");
  await expect(page.locator('input[data-acc="tb-cash"]')).toHaveValue("1.350,50");
  expect(errors).toEqual([]);
});
