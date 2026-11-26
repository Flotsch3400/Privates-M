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

test("Pro Bereich wählen: Betrag eintragen oder Live aus Positionen", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.goto("./#bewertung");
  await page.click('#v-mode [data-v="plat"]');
  // gold coins: live from the position → switch to a typed amount
  await page.click('[data-vm="gold"][data-m="amount"]');
  expect(await page.evaluate(() => [accById("gold").manual, isLive(accById("gold"))])).toEqual([true, false]);
  await expect(page.locator('input[data-acc="gold"]')).toBeFocused();
  await page.keyboard.type("2.500");
  await expect(page.locator('[data-vm="gold"][data-m="live"]')).toContainText("Live · 1");
  // and back to live
  await page.click('[data-vm="gold"][data-m="live"]');
  expect(await page.evaluate(() => isLive(accById("gold")))).toBe(true);
  // a category without positions: "Live" opens the search right in the row – no extra window
  await page.click('[data-vm="depot"][data-m="live"]');
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator('[data-ih="depot"] [data-ihs]')).toBeFocused();
  expect(errors).toEqual([]);
});

test("Betrag → Live direkt in der Zeile: suchen, wählen, Menge tippen", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.goto("./#bewertung");
  await page.click('#v-mode [data-v="plat"]');
  const old = await page.evaluate(() => latest().values.boerse);
  expect(old).toBeGreaterThan(0);
  await page.click('[data-vm="boerse"][data-m="live"]');
  const ed = page.locator('[data-ih="boerse"]');
  await expect(ed).toContainText("Bisher als Betrag");
  await expect(ed.locator("[data-ihs]")).toBeFocused();
  await page.keyboard.type("bitcoin");
  await ed.locator("[data-ihr] button").first().click();
  // the new position waits for its quantity, the cursor is already there
  const q = ed.locator("[data-ihq]");
  await expect(q).toBeFocused();
  await page.keyboard.type("0,5");
  await expect(ed.locator("[data-ihv]")).toContainText("40.000");
  await expect(page.locator('input[data-acc="boerse"]')).toHaveValue("40.000,00");
  expect(await page.evaluate(() => [isLive(accById("boerse")), accById("boerse").holdings[0].qty])).toEqual([true, 0.5]);
  // back to amount: one click, the field is ready for typing
  await page.click('[data-vm="boerse"][data-m="amount"]');
  await expect(page.locator('[data-ih="boerse"]')).toHaveCount(0);
  await expect(page.locator('input[data-acc="boerse"]')).toBeFocused();
  expect(errors).toEqual([]);
});

test("Auf der Plattform-Seite: Live einschalten und Position direkt erfassen", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.goto("./#konten");
  await page.evaluate(() => platformDialog(platKey(accById("boerse"))));
  await page.click('dialog [data-pm="boerse"][data-m="live"]');
  const ed = page.locator('dialog [data-ih="boerse"]');
  await expect(ed.locator("[data-ihs]")).toBeFocused();
  await page.keyboard.type("bitcoin");
  await ed.locator("[data-ihr] button").first().click();
  await expect(page.locator('dialog [data-ih="boerse"] [data-ihq]')).toBeFocused();
  await page.keyboard.type("0,25");
  await expect(page.locator('dialog [data-ih="boerse"] [data-ihv]')).toContainText("20.000");
  expect(await page.evaluate(() => accById("boerse").holdings[0].qty)).toBe(0.25);
  expect(errors).toEqual([]);
});

test("Kategorien wieder entfernen: neu angelegte löschen, mit Verlauf archivieren", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.goto("./#bewertung");
  await page.click('#v-mode [data-v="plat"]');
  const bank = page.locator('.val-group[data-g="p:demobank"]');
  // add a category and remove it again → deleted completely
  await bank.locator("[data-addcat]").click();
  await bank.locator('[data-newcat="krypto"]').click();
  const id = await page.evaluate(() => DB.accounts.find(a => a.provider === "Demobank" && a.cat === "krypto").id);
  await page.click(`[data-vrm="${id}"]`);
  await expect(page.locator(".toast")).toContainText("entfernt");
  await expect(page.locator(`input[data-acc="${id}"]`)).toHaveCount(0);
  expect(await page.evaluate(id => !!accById(id), id)).toBe(false);
  // an area with history → archived, history stays
  // undo brings it back with the typed value, then remove for real
  await page.fill('input[data-acc="tagesgeld"]', "28.000");
  await page.click('[data-vrm="tagesgeld"]');
  await expect(page.locator(".toast")).toContainText("archiviert");
  await page.click(".toast-undo");
  await expect(page.locator('input[data-acc="tagesgeld"]')).toHaveValue("28.000,00");
  expect(await page.evaluate(() => accById("tagesgeld").archived)).toBe(false);
  await page.click('[data-vrm="tagesgeld"]');
  await expect(page.locator('input[data-acc="tagesgeld"]')).toHaveCount(0);
  expect(await page.evaluate(() => [accById("tagesgeld").archived, DB.snapshots.at(-1).values.tagesgeld])).toEqual([true, 27200]);
  // the sum of the new valuation no longer contains it
  await page.click("#v-save");
  expect(await page.evaluate(() => latest().values.tagesgeld)).toBeUndefined();
  expect(errors).toEqual([]);
});

test("Kontoseite: Bereich entfernen", async ({page}) => {
  await openWithDemo(page);
  await page.evaluate(() => { DB.accounts.push({id: "tb-a", name: "Testbroker", provider: "Testbroker", cat: "wertpapiere", holdings: [], archived: false}, {id: "tb-b", name: "Testbroker", provider: "Testbroker", cat: "bargeld", holdings: [], archived: false}); save(true); platformDialog("testbroker"); });
  await page.click('[data-pdel="tb-b"]');
  await expect(page.locator(".toast")).toContainText("entfernt");
  await expect(page.locator("dialog h2")).toContainText("Testbroker");
  await expect(page.locator('[data-sec="tb-b"]')).toHaveCount(0);
  await expect(page.locator('[data-sec="tb-a"]')).toBeVisible();
});

test("Geführter Monatsabschluss: nur Händisches, Schritt für Schritt, Zusammenfassung", async ({page}) => {
  const errors = await openWithDemo(page);
  await page.goto("./#bewertung");
  await page.click('#v-mode [data-v="guided"]');
  // gold coins are live → not a step; all other demo platforms are manual
  await expect(page.locator(".g-prog")).toContainText("Schritt 1 von");
  await expect(page.locator(".g-prog")).toContainText("automatisch ✓");
  const steps = await page.evaluate(() => +document.querySelector(".g-prog").textContent.match(/von (\d+)/)[1]);
  // step 1 = largest platform (Demobroker); a calculation shows its result
  await expect(page.locator(".g-step")).toContainText("Demobroker");
  await page.fill('input[data-acc="depot"]', "38000+250");
  await expect(page.locator('[data-hint="depot"]')).toContainText("= 38.250,00");
  // Enter on the last field goes to the next step
  await page.locator('input[data-acc="depot"]').press("Enter");
  await expect(page.locator(".g-prog")).toContainText("Schritt 2 von");
  await expect(page.locator(".g-step")).toContainText("Demobank");
  // back keeps the typed value
  await page.click("#g-back");
  await expect(page.locator('input[data-acc="depot"]')).toHaveValue("38.250,00");
  for (let i = 0; i < steps; i++) await page.click("#g-next");
  await expect(page.locator(".g-sum")).toContainText("Größte Veränderungen");
  await expect(page.locator(".g-sum")).toContainText("+€ 150");
  await expect(page.locator(".g-sum")).toContainText("Automatisch bewertet");
  await page.click("#g-save");
  expect(await page.evaluate(() => latest().values.depot)).toBe(38250);
  expect(errors).toEqual([]);
});
