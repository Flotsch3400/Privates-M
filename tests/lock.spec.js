// App lock with Face ID (WebAuthn platform authenticator, simulated) and PIN fallback.
const {test, expect} = require("@playwright/test");
const {offline} = require("./helpers");

test("App-Sperre: Face ID, PIN, Sperren im Hintergrund, Ausschalten", async ({page, context}, info) => {
  test.skip(info.project.name !== "iphone", "läuft im iPhone-Profil");
  await offline(context);
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const {authenticatorId} = await cdp.send("WebAuthn.addVirtualAuthenticator", {options: {protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true}});
  const locked = () => page.evaluate(() => !document.getElementById("lock").hidden);

  await page.goto("./#daten");
  await page.click("#lock-on");
  await page.fill("#lp1", "12"); await page.fill("#lp2", "12");
  await page.click("#lf button[type=submit]");
  await expect(page.locator("#l-msg")).not.toBeEmpty();
  await page.fill("#lp1", "2468"); await page.fill("#lp2", "2468");
  await page.click("#lf button[type=submit]");
  await expect.poll(() => page.evaluate(() => !!Lock.cfg?.credId)).toBe(true);

  await page.reload();
  expect(await locked()).toBe(true);
  await page.click("#lock-bio");
  await expect.poll(locked).toBe(false);

  await page.evaluate(() => Lock.show());
  await page.click("#lock-usepin");
  await page.fill("#lock-pin", "0000"); await page.press("#lock-pin", "Enter");
  await expect(page.locator("#lock-msg")).not.toBeEmpty();
  expect(await locked()).toBe(true);
  await page.fill("#lock-pin", "2468"); await page.press("#lock-pin", "Enter");
  await expect.poll(locked).toBe(false);

  // goes to background and comes back → locked
  await page.evaluate(() => {
    const c = Lock.cfg; c.after = 0; Lock.cfg = c;
    Object.defineProperty(document, "visibilityState", {configurable: true, get: () => "hidden"});
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", {configurable: true, get: () => "visible"});
  });
  await page.waitForTimeout(50);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(locked).toBe(true);

  // Face ID fails → PIN still works
  await cdp.send("WebAuthn.setUserVerified", {authenticatorId, isUserVerified: false});
  await page.click("#lock-bio");
  await expect(page.locator("#lock-msg")).not.toBeEmpty();
  expect(await locked()).toBe(true);
  await page.click("#lock-usepin");
  await page.fill("#lock-pin", "2468"); await page.press("#lock-pin", "Enter");
  await expect.poll(locked).toBe(false);

  await page.evaluate(() => { const c = Lock.cfg; c.after = 300; Lock.cfg = c; });
  await page.goto("./#daten");
  await page.click("#lock-off");
  await page.fill("#lo-p", "2468");
  await page.click("#lo button[type=submit]");
  await expect.poll(() => page.evaluate(() => !Lock.on())).toBe(true);
  expect(errors).toEqual([]);
});
