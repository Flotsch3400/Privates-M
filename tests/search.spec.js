// Quick search (Ctrl/⌘ K, "/", search buttons).
const {test, expect} = require("@playwright/test");
const {offline, openWithDemo} = require("./helpers");

test.beforeEach(async ({context}) => offline(context));

test("Suche findet Konten und springt hin", async ({page}, info) => {
  const errors = await openWithDemo(page);
  if (info.project.name === "desktop") await page.keyboard.press("Control+k");
  else await page.locator(".mobile-top [data-search]").click();
  await expect(page.locator("#q-in")).toBeFocused();
  await page.keyboard.type("tagesgeld");
  await expect(page.locator(".q-item").first()).toContainText("Tagesgeld Demo");
  await page.keyboard.press("Enter");
  await expect(page.locator("dialog.palette")).toBeHidden();
  expect(errors).toEqual([]);
});

test("Schrägstrich öffnet die Suche, Seiten sind direkt erreichbar", async ({page}, info) => {
  test.skip(info.project.name !== "desktop", "Tastaturkürzel nur am Desktop");
  await openWithDemo(page);
  await page.keyboard.press("/");
  await expect(page.locator("#q-in")).toBeFocused();
  await page.locator("#q-in").fill("verlauf");
  await expect(page.locator('.q-item[aria-selected="true"]')).toContainText("Verlauf");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#verlauf/);
});

test("Archivierte Konten landen hinten", async ({page}) => {
  await openWithDemo(page);
  await page.evaluate(() => openSearch());
  await page.locator("#q-in").fill("demo");
  const first = await page.locator(".q-item b").allTextContents();
  const archived = await page.evaluate(() => DB.accounts.filter(a => a.archived).map(a => a.name));
  for (const name of archived) expect(first.indexOf(name)).not.toBe(0);
});
