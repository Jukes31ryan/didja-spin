/* Didja Spin 107 service worker. The build stamps the cache name from a hash of the files. */
const PREFIX = 'didja107-';
const CACHE = PREFIX + 'v3-46db0965d0';
const SHELL = ['./', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

/* Only delete our own caches: every app on this origin shares one cache store. */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function tell(type) {
  const list = await self.clients.matchAll({ type: 'window' });
  list.forEach((c) => c.postMessage({ type }));
}

/* Stale-while-revalidate: open instantly from cache, refresh in the background.
   If the page itself changed (new questions), tell the page so it can offer a reload. */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    const key = new URL('./', self.registration.scope).href;
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(key);
      const net = fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }).then(async (res) => {
        if (res.ok) {
          let changed = false;
          if (cached) {
            const [a, b] = await Promise.all([cached.clone().text(), res.clone().text()]);
            changed = a !== b;
          }
          await cache.put(key, res.clone());
          if (changed) await tell('content-updated');
        }
        return res;
      });
      if (cached) { e.waitUntil(net.catch(() => {})); return cached; }
      try { return await net; } catch (err) { return (await cache.match(key)) || Response.error(); }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
      return res;
    });
    if (cached) { e.waitUntil(net.catch(() => {})); return cached; }
    return net;
  })());
});
