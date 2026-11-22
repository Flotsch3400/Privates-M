// Privacy mode: one click hides every amount on every page.
const {test, expect} = require("@playwright/test");
const {offline, openWithDemo} = require("./helpers");

const ROUTES = ["uebersicht", "aktien", "krypto", "einkommen", "lieferando", "planung", "depot", "verlauf", "konten", "bewertung", "daten"];

test.beforeEach(async ({context}) => offline(context));

test("Beträge ausblenden – keine Euro-Beträge mehr sichtbar", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.evaluate(() => {
    const t = todayISO();
    DB.income.entries.push({id: "g", type: "gehalt", date: t, amount: 3250, source: "Demo GmbH"});
    DB.income.orders.push({id: "o1", date: t, restaurant: "Pizzeria", own: 9.9, serviceRate: .025, serviceCap: .89, discount: .1, participants: [{code: "ABC", food: 12.4}]});
    DB.income.deals.push({id: "d", item: "Konsole", platform: "willhaben", buyDate: t, buyPrice: 180, sellDate: t, sellPrice: 260, fees: 6.5});
    save(true);
  });
  await page.goto("./#uebersicht");
  await page.reload();
  await expect(page.locator(".hero-total")).toContainText("77.490");
  await page.click(".priv-hero");
  await expect(page.locator(".hero-total")).not.toContainText("77");
  // market prices per unit (column "Kurs", class .px) are public and stay visible
  const leaks = {};
  for (const r of ROUTES) {
    await page.goto("./#" + r);
    await page.waitForTimeout(250);
    const txt = await page.evaluate(() => {
      const px = [...document.querySelectorAll("#view .px")];
      px.forEach(e => e.style.display = "none");
      const t = document.querySelector("#view").innerText;
      px.forEach(e => e.style.display = "");
      return t;
    });
    const m = txt.match(/€\s?\d[\d.,]*|\d[\d.]*,\d{2}\s?€/g);
    if (m) leaks[r] = [...new Set(m)];
  }
  expect(leaks).toEqual({});
  await page.goto("./#uebersicht");
  await page.reload();
  await expect(page.locator(".hero-total")).not.toContainText("77");
  await page.click(".priv-hero");
  await expect(page.locator(".hero-total")).toContainText("77.490");
  expect(errors).toEqual([]);
});
