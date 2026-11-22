// Income entry (salary, cashback) and the savings rate.
const {test, expect} = require("@playwright/test");
const {offline, openWithDemo} = require("./helpers");

test.beforeEach(async ({context}) => offline(context));

test("Gehalt schnell erfassen – Arbeitgeber ist fix", async ({page}) => {
  const errors = await openWithDemo(page, "einkommen");
  await page.click('[data-new="gehalt"]');
  await expect(page.locator("#e-emp")).toContainText("Demo GmbH");
  await page.keyboard.type("3.250");
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => DB.income.entries.map(e => e.type + ":" + e.source + ":" + e.amount))).toEqual(["gehalt:Demo GmbH:3250"]);
  // second salary is prefilled
  await page.click('[data-new="gehalt"]');
  await expect(page.locator("#e-a")).not.toHaveValue("");
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});

test("Cashback über Chips, mehrere hintereinander", async ({page}) => {
  await openWithDemo(page, "einkommen");
  await page.click('[data-new="cashback"]');
  await page.click('.src-chip[data-src="Demo Cashback"]');
  await page.keyboard.type("4,20");
  await page.click("#e-next");
  await page.click('.src-chip[data-src="Demo Cashback"]');
  await page.keyboard.type("1,15");
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => DB.income.entries.map(e => e.amount).sort())).toEqual([1.15, 4.2]);
});

test("Sparquote = Vermögenszuwachs / Einkommen", async ({page}) => {
  await openWithDemo(page);
  await page.evaluate(() => {
    DB.income.entries.push({id: "s9", type: "gehalt", date: "2026-09-15", amount: 3000, source: "Demo GmbH"},
                           {id: "s10", type: "gehalt", date: "2026-10-15", amount: 2800, source: "Demo GmbH"});
    save(true); incMonth = "2026-10";
  });
  await page.goto("./#einkommen");
  // Oktober: 77.490 − 75.530 = 1.960 € Zuwachs bei 2.800 € Einkommen → 70 %
  const card = page.locator("#inc-save");
  await expect(card).toContainText("70");
  await expect(card).toContainText("840"); // rechnerisch ausgegeben
  // Ø über Sep + Okt: (60 + 1.960) / 5.800 = 34,8 %
  await expect(card).toContainText("34,8");
});
