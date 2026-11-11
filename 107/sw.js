// Didja Spin 107 — cache reset worker (launch build, Nov 10 2026).
// The previous /107/ app registered a service worker that cached its page.
// This worker replaces it: on install it deletes every cache for this origin
// and takes over immediately; it caches nothing itself, so every load comes
// fresh from the network and no stale copy of the old app can be served.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
