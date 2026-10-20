/* One Life Club Manager — service worker (v3).
   v3 forces a clean break from the old cached app:
     - on activate it deletes EVERY old cache and reloads any open window,
       so a device stuck on the previous version flips to the new one by itself.
   After that it behaves normally:
     - navigations (the HTML page): network-first, fall back to cache offline.
     - other GETs (JS/CSS/icons): cache-first, refreshed in the background.
     - /api/... is never intercepted; the app handles offline queueing itself. */
const CACHE = "olc-shell-v3";
const SHELL = ["/", "/index.html", "/icon.svg", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    // reload open windows once so a device on the old version jumps to the new one
    const wins = await self.clients.matchAll({ type: "window" });
    for (const w of wins) { try { w.navigate(w.url); } catch { /* ignore */ } }
  })());
});

const isNavigation = (req) =>
  req.mode === "navigate" || (req.method === "GET" && req.headers.get("accept")?.includes("text/html"));

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return; // app manages these

  if (isNavigation(e.request)) {
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
