// Device sync via an encrypted GitHub Gist (mocked) – laptop + iPhone.
const {test, expect} = require("@playwright/test");
const {offline, fakeGitHub, openWithDemo} = require("./helpers");

test("zwei Geräte synchronisieren verschlüsselt", async ({browser, baseURL}, info) => {
  test.skip(info.project.name !== "desktop", "nutzt selbst einen Laptop- und einen iPhone-Kontext");
  test.setTimeout(90_000);
  const gh = fakeGitHub();
  const mk = async opts => { const ctx = await browser.newContext({baseURL, serviceWorkers: "block", ...opts}); await offline(ctx, {github: gh.handler}); return ctx.newPage(); };
  const A = await mk({viewport: {width: 1300, height: 900}});
  const errors = await openWithDemo(A, "daten");
  await A.click("#sync-new");
  await A.fill("#s-t", "ghp_testtoken");
  await A.fill("#s-p", "geheim123");
  await A.fill("#s-p2", "geheim123");
  await A.click("#sf button[type=submit]");
  await expect(A.locator("#pc")).toHaveValue(/^TRACKY1:/, {timeout: 15_000});
  const code = await A.inputValue("#pc");
  const stored = gh.gists.g1.content;
  expect(stored).not.toContain("Girokonto");
  expect(stored).not.toContain("77490");
  await A.click("dialog .dlg-f [data-x]");

  const B = await mk({viewport: {width: 440, height: 956}, isMobile: true, hasTouch: true});
  B.on("pageerror", e => errors.push(e.message));
  await B.goto("./#daten");
  await B.click("#sync-join");
  await B.fill("#j-c", code.slice(0, 25) + "\n " + code.slice(25)); // pasted with line break
  await B.fill("#j-p", "falsch!!");
  await B.click("#jf button[type=submit]");
  await expect(B.locator("#j-msg")).not.toBeEmpty({timeout: 15_000});
  await B.fill("#j-p", "geheim123");
  await B.click("#jf button[type=submit]");
  await expect.poll(() => B.evaluate(() => DB.snapshots.length), {timeout: 15_000}).toBe(10);

  await B.evaluate(() => { DB.income.entries.push({id: "x1", type: "gehalt", date: todayISO(), amount: 3250, source: "Demo GmbH"}); save(true); });
  await expect.poll(() => B.evaluate(() => Sync.state.dirty), {timeout: 15_000}).toBe(false);
  await A.evaluate(() => Sync.pull());
  await expect.poll(() => A.evaluate(() => DB.income.entries.some(e => e.id === "x1")), {timeout: 15_000}).toBe(true);

  // price refreshes are quiet and never mark data as changed
  await A.evaluate(() => { Sync.state.dirty = false; save(false, true); });
  await A.waitForTimeout(500);
  expect(await A.evaluate(() => Sync.state.dirty)).toBe(false);
  expect(errors).toEqual([]);
});
