// Shared test helpers: block the internet, mock the services Tracky talks to, load demo data.
const path = require("path");
const {expect} = require("@playwright/test");

const DEMO = path.join(__dirname, "fixtures", "demo-data.json");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/D/PwAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64");

/** Every request leaves only to localhost; known services get deterministic answers. */
async function offline(context, {github} = {}) {
  await context.route(/^https?:\/\/(?!localhost)/, route => {
    const url = route.request().url();
    if (/google\.com\/s2\/favicons|img\.test/.test(url)) return route.fulfill({status: 200, contentType: "image/png", body: PNG});
    if (/api\.coingecko\.com\/api\/v3\/coins\/markets/.test(url)) {
      const ids = new URL(url).searchParams.get("ids").split(",");
      const px = {bitcoin: 80000, "pax-gold": 3000};
      return route.fulfill({json: ids.filter(i => px[i]).map(i => ({id: i, name: i, current_price: px[i], price_change_percentage_24h: 1, image: "https://img.test/" + i + ".png"}))});
    }
    if (/api\.coingecko\.com\/api\/v3\/search/.test(url)) return route.fulfill({json: {coins: [{id: "bitcoin", name: "Bitcoin", symbol: "btc", large: "https://img.test/btc.png"}]}});
    if (/api\.dexscreener\.com/.test(url)) return route.fulfill({json: {pairs: []}});
    if (/frankfurter/.test(url)) return route.fulfill({json: {rates: {EUR: 0.92}}});
    if (github && /api\.github\.com/.test(url)) return github(route);
    return route.abort();
  });
}

/** In-memory stand-in for the GitHub Gist API. */
function fakeGitHub() {
  const gists = {}; let n = 0;
  const handler = async route => {
    const req = route.request(), u = new URL(req.url()), method = req.method();
    if (!/^Bearer ghp_test/.test(req.headers()["authorization"] || "")) return route.fulfill({status: 401, json: {}});
    if (u.pathname === "/gists" && method === "POST") {
      const body = JSON.parse(req.postData()), id = "g" + (++n);
      gists[id] = {content: body.files["tracky.json"].content, updated_at: new Date(Date.now() + n).toISOString()};
      return route.fulfill({status: 201, json: {id, updated_at: gists[id].updated_at}});
    }
    const m = u.pathname.match(/^\/gists\/(\w+)$/);
    if (!m || !gists[m[1]]) return route.fulfill({status: 404, json: {}});
    if (method === "PATCH") { gists[m[1]].content = JSON.parse(req.postData()).files["tracky.json"].content; gists[m[1]].updated_at = new Date(Date.now() + (++n)).toISOString(); }
    return route.fulfill({json: {id: m[1], updated_at: gists[m[1]].updated_at, files: {"tracky.json": {content: gists[m[1]].content, truncated: false}}}});
  };
  return {gists, handler};
}

/** Opens Tracky with the demo data imported, collects page errors. */
async function openWithDemo(page, hash = "uebersicht") {
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("./");
  await page.locator("#file-in").setInputFiles(DEMO);
  await expect(page.locator(".hero-total")).toBeVisible();
  if (hash !== "uebersicht") await page.goto("./#" + hash);
  return errors;
}

const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

module.exports = {offline, fakeGitHub, openWithDemo, noOverflow, DEMO};
