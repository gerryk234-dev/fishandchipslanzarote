/* One Life Club Manager — service worker.
   Goal: the app opens and runs with no internet, BUT it must also pick up new
   deploys (never get stuck on an old cached version).
   Strategy:
     - navigations (the HTML page): network-first, fall back to cache when offline
       → online users always get the latest app; offline users still get in.
     - other GETs (JS/CSS/icons): cache-first with background refresh.
     - /api/... is never intercepted; the app handles offline queueing itself. */
const CACHE = "olc-shell-v2";
const SHELL = ["/", "/index.html", "/icon.svg", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isNavigation = (req) =>
  req.mode === "navigate" || (req.method === "GET" && req.headers.get("accept")?.includes("text/html"));

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return; // app manages these

  if (isNavigation(e.request)) {
    // network-first so a new deploy is picked up as soon as there's internet
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("/index.html").then((r) => r || caches.match("/")))
    );
    return;
  }

  // static assets: cache-first, refresh in the background
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
