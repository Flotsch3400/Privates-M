const {test, expect} = require("@playwright/test");
const {openWithDemo} = require("./helpers");

test("Lieferando: Wert des Gratis-Essens", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.evaluate(() => {
    const d = todayISO();
    DB.income.orders = [
      // 60 € order, 20 % voucher discount → costs 48 €, colleagues pay 48 € → own 12 € meal is free
      {id: "o1", date: d, restaurant: "Testpizza", own: 12, fee: 0, serviceRate: 0, discount: 0.2, participants: [{code: "AA", food: 20}, {code: "BB", food: 28}]},
      // 30 € order → costs 24 €, colleague pays 10 € → you pay 14 € of your 20 € meal, 6 € free
      {id: "o2", date: d, restaurant: "Testburger", own: 20, fee: 0, serviceRate: 0, discount: 0.2, participants: [{code: "AA", food: 10}]},
    ];
    save(true);
  });
  await page.goto("./#lieferando");
  await page.click('#lf-period [data-v="all"]');
  const card = page.locator("#lf-free");
  await expect(card.locator("[data-free]")).toHaveText("€ 18,00");
  await expect(card.locator("[data-paid]")).toHaveText("€ 14,00");
  await expect(card).toContainText("1 von 2 Bestellungen komplett gratis");
  await expect(card).toContainText("€ 32,00");
  // never part of the statistics text shared with colleagues
  expect(await page.evaluate(() => statsText(lfStats(DB.income.orders), "x"))).not.toContain("gratis");
  expect(errors).toEqual([]);
});
