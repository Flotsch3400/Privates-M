// Lieferando group orders: service fee (2,5 %, max. 0,89 €) split across everyone, voucher maths, Teams texts, paid ticks.
const {test, expect} = require("@playwright/test");
const {offline, openWithDemo} = require("./helpers");

test.beforeEach(async ({context}) => offline(context));

test("Servicegebühr und Gutschein werden richtig gerechnet", async ({page}) => {
  await openWithDemo(page);
  const r = await page.evaluate(() => {
    const small = orderCalc({own: 10, serviceRate: .025, serviceCap: .89, discount: .1, participants: [{code: "AAA", food: 10}]});
    const big = orderCalc({own: 20, serviceRate: .025, serviceCap: .89, discount: .1, participants: [{code: "AAA", food: 20}, {code: "BBB", food: 20}]});
    const voucher = orderCalc({own: 10, serviceRate: .025, serviceCap: .89, discount: .2, voucher: 10, participants: [{code: "AAA", food: 10}]});
    return {small, big, voucher};
  });
  // 20 € Essen → 0,50 € Servicegebühr, 0,25 € pro Person
  expect(r.small.service).toBeCloseTo(0.5);
  expect(r.small.owes[0]).toBeCloseTo(10.25);
  // 60 € Essen → 1,50 € wäre zu viel, gedeckelt auf 0,89 €
  expect(r.big.service).toBeCloseTo(0.89);
  expect(r.big.owes[0]).toBeCloseTo(20 + 0.89 / 3, 2);
  // 10 € Gutschein mit 20 % Rabatt auf 20,50 € Bestellung → 8 € + 10,50 €
  expect(r.voucher.cost).toBeCloseTo(18.5);
  expect(r.voucher.rest).toBeCloseTo(10.5);
});

test("Bestellung erfassen, Teams-Text kopieren, Zahlung abhaken", async ({page, context}, info) => {
  test.skip(info.project.name !== "desktop", "Zwischenablage nur am Desktop geprüft");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors = await openWithDemo(page, "lieferando");
  await page.click("#lf-new");
  await page.fill("#o-r", "Pizzeria Test");
  await page.fill("#o-e", "9,90");
  await page.fill('.p-row[data-i="0"] [data-f="code"]', "abc");
  await page.press('.p-row[data-i="0"] [data-f="code"]', "Enter");
  await page.keyboard.type("12,40");
  await page.keyboard.press("Enter");
  await page.keyboard.type("def");
  await page.keyboard.press("Enter");
  await page.keyboard.type("8,50");
  // Essen 30,80 € → Servicegebühr 0,77 € → je 0,2567 €
  await expect(page.locator(".p-owes").first()).toContainText("12,66");
  await page.click("#of button[type=submit]");
  const texts = await page.locator(".msg-text").allTextContents();
  expect(texts.join(" | ")).toContain("Bitte 12,66 € überweisen (Pizzeria Test)");
  expect(texts.join(" | ")).toContain("Bitte 8,76 € überweisen (Pizzeria Test)");
  await page.click('[data-copy="0"]');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("überweisen");
  await page.check('[data-paid="1"]');
  await page.click("dialog .dlg-f [data-x]");
  const open = await page.evaluate(() => openDebts().map(d => d.code + ":" + d.sum.toFixed(2)));
  expect(open).toEqual(["ABC:12.66"]);
  expect(errors).toEqual([]);
});

test("alte Bestellungen mit Liefergebühr rechnen weiter wie früher", async ({page}) => {
  await openWithDemo(page);
  const c = await page.evaluate(() => orderCalc({total: 50, own: 10, discount: .1, participants: [{code: "ABC"}, {code: "XYZ"}]}));
  expect(c.owes).toEqual([20, 20]);
  expect(c.cost).toBeCloseTo(45);
});

test("Restaurant-Logos: Ketten automatisch, eigenes Bild und Webseite", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.evaluate(() => {
    const t = todayISO();
    DB.income.orders.push({id: "r1", date: t, restaurant: "Burger King Teststraße", own: 10, serviceRate: .025, serviceCap: .89, discount: .1, participants: []},
                          {id: "r2", date: t, restaurant: "Testnudeln", own: 10, serviceRate: .025, serviceCap: .89, discount: .1, participants: []},
                          {id: "r3", date: t, restaurant: "Pizzeria Test", own: 10, serviceRate: .025, serviceCap: .89, discount: .1, participants: []});
    save(true);
  });
  expect(await page.evaluate(() => /burgerking\.at/.test(restLogo("Burger King Teststraße")))).toBe(true);
  await page.goto("./#lieferando");
  await page.click("#lf-rest");
  await expect(page.locator("dialog h2")).toHaveText("Restaurants & Logos");
  // own picture (a 2×1 PNG, centre-cropped to a square)
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR42mP8z8DwnwEIGAEAD/4C/0y3pVYAAAAASUVORK5CYII=", "base64");
  await page.locator('[data-rimg="testnudeln"]').click();
  await page.locator("#r-file").setInputFiles({name: "logo.png", mimeType: "image/png", buffer: png});
  await expect(page.locator('[data-rk="testnudeln"]')).toContainText("eigenes Bild");
  // website
  await page.locator('[data-rweb="pizzeria test"]').click();
  await page.locator(".r-web input").fill("https://www.pizzeria-test.at/menu");
  await page.locator(".r-web button").click();
  await expect(page.locator('[data-rk="pizzeria test"]')).toContainText("pizzeria-test.at");
  const r = await page.evaluate(() => { const s = DB.income.settings.restLogos; return [s.testnudeln.img.startsWith("data:image/jpeg"), s["pizzeria test"].domain]; });
  expect(r).toEqual([true, "pizzeria-test.at"]);
  await page.keyboard.press("Escape");
  await expect(page.locator("#lf-orders")).toContainText("Testnudeln");
  expect(errors).toEqual([]);
});
