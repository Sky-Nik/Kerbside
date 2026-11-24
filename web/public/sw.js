// Kerbside service worker: keeps the app opening with no signal (last-seen pages + app code) and shows reminder notifications.
const PAGES = "kerbside-pages-v1", STATIC = "kerbside-static-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (![PAGES, STATIC].includes(k)) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/share")) return;
  // Signing out or in: forget cached pages so the next person on this phone doesn't see them.
  if (url.pathname.startsWith("/login") || url.pathname.startsWith("/auth")) { e.waitUntil(caches.delete(PAGES)); return; }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/landing/") || url.pathname.startsWith("/pwa-icon")) {
    e.respondWith(caches.open(STATIC).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => {
      if (r.ok && r.type === "basic") caches.open(PAGES).then((c) => c.put(req, r.clone()));
      return r;
    }).catch(async () => (await caches.match(req, { cacheName: PAGES })) || (await caches.match("/", { cacheName: PAGES })) || Response.error()));
  }
});

self.addEventListener("push", (e) => {
  const m = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(m.title || "Kerbside", { body: m.body, tag: m.tag, icon: "/pwa-icon/192", data: { url: m.url || "/" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(e.notification.data.url));
});
