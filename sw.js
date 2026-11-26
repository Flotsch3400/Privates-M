/* Tracky service worker: makes the app installable and lets it start offline.
   The page itself is loaded network-first so updates arrive immediately; the cached copy is only a fallback.
   Requests to other sites (prices, logos, fonts) are not touched. */
const CACHE = "tracky-v28";
const SHELL = ["./", "index.html", "manifest.webmanifest", "branding/favicon.svg", "branding/icon-192.png", "branding/icon-512.png", "branding/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/version.json")) return; // always straight from the network
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/")) {
    e.respondWith(fetch(new Request(url.href, {cache: "no-store", credentials: "same-origin"})).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); return res; })
      .catch(() => caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
