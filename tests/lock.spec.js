// App lock with Face ID (on the web: via a passkey; here a simulated platform authenticator) and PIN fallback.
const {test, expect} = require("@playwright/test");
const {offline} = require("./helpers");

async function setup(page, context) {
  await offline(context);
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const {authenticatorId} = await cdp.send("WebAuthn.addVirtualAuthenticator", {options: {protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true}});
  const locked = () => page.evaluate(() => !document.getElementById("lock").hidden);
  const background = () => page.evaluate(async () => {
    const c = Lock.cfg; c.after = 0; Lock.cfg = c;
    Object.defineProperty(document, "visibilityState", {configurable: true, get: () => "hidden"});
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise(r => setTimeout(r, 30));
    Object.defineProperty(document, "visibilityState", {configurable: true, get: () => "visible"});
    document.dispatchEvent(new Event("visibilitychange"));
  });
  return {errors, cdp, authenticatorId, locked, background};
}

test("App-Sperre mit Face ID: startet von selbst, PIN als Ersatz, Ausschalten", async ({page, context}, info) => {
  test.skip(info.project.name !== "iphone", "läuft im iPhone-Profil");
  const {errors, cdp, authenticatorId, locked, background} = await setup(page, context);

  await page.goto("./#daten");
  await page.click("#lock-on");
  await expect(page.locator("#l-info")).toContainText("Passkey");
  await page.fill("#lp1", "12"); await page.fill("#lp2", "12");
  await page.click("#lf button[type=submit]");
  await expect(page.locator("#l-msg")).not.toBeEmpty();
  await page.fill("#lp1", "2468"); await page.fill("#lp2", "2468");
  await page.click("#lf button[type=submit]");
  await expect.poll(() => page.evaluate(() => !!Lock.cfg?.credId)).toBe(true);

  // opening the app starts Face ID by itself
  await page.reload();
  await expect.poll(locked).toBe(false);

  // manual lock: no automatic prompt, button works
  await page.evaluate(() => Lock.show());
  expect(await locked()).toBe(true);
  await page.click("#lock-bio");
  await expect.poll(locked).toBe(false);

  // wrong / right PIN
  await page.evaluate(() => Lock.show());
  await page.click("#lock-usepin");
  await page.fill("#lock-pin", "0000"); await page.press("#lock-pin", "Enter");
  await expect(page.locator("#lock-msg")).not.toBeEmpty();
  expect(await locked()).toBe(true);
  await page.fill("#lock-pin", "2468"); await page.press("#lock-pin", "Enter");
  await expect.poll(locked).toBe(false);

  // Face ID fails → app stays locked without error message from the automatic attempt, PIN works
  await cdp.send("WebAuthn.setUserVerified", {authenticatorId, isUserVerified: false});
  await background();
  await page.waitForTimeout(500);
  expect(await locked()).toBe(true);
  await page.click("#lock-bio");
  await expect(page.locator("#lock-msg")).not.toBeEmpty();
  await page.click("#lock-usepin");
  await page.fill("#lock-pin", "2468"); await page.press("#lock-pin", "Enter");
  await expect.poll(locked).toBe(false);

  // switch to PIN only
  await page.evaluate(() => { const c = Lock.cfg; c.after = 300; Lock.cfg = c; });
  await page.goto("./#daten");
  await page.click("#lock-pinonly");
  await expect.poll(() => page.evaluate(() => Lock.cfg.credId)).toBe(null);
  await expect(page.locator("#lock-addbio")).toBeVisible();

  await page.click("#lock-off");
  await page.fill("#lo-p", "2468");
  await page.click("#lo button[type=submit]");
  await expect.poll(() => page.evaluate(() => !Lock.on())).toBe(true);
  expect(errors).toEqual([]);
});

test("App-Sperre nur mit PIN – ohne Passkey", async ({page, context}, info) => {
  test.skip(info.project.name !== "iphone", "läuft im iPhone-Profil");
  const {errors, locked} = await setup(page, context);
  await page.goto("./#daten");
  await page.click("#lock-on");
  await page.click('#l-mode [data-v="pin"]');
  await expect(page.locator("#l-info")).toContainText("Kein Passkey");
  await page.fill("#lp1", "1357"); await page.fill("#lp2", "1357");
  await page.click("#lf button[type=submit]");
  await expect.poll(() => page.evaluate(() => Lock.on() && Lock.cfg.credId === null)).toBe(true);
  await page.reload();
  expect(await locked()).toBe(true);
  await expect(page.locator("#lock-bio")).toBeHidden();
  await expect(page.locator("#lock-pin")).toBeFocused();
  await page.keyboard.type("1357"); await page.keyboard.press("Enter");
  await expect.poll(locked).toBe(false);
  expect(errors).toEqual([]);
});
