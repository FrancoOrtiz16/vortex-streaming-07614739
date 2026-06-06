// Vortex Streaming service-worker kill switch.
// Clears stale app caches silently and unregisters itself without navigating
// clients, so users never suffer automatic reload loops when returning to the app.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    await self.clients.claim();

    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'VORTEX_SW_DISABLED' });
    }

    await self.registration.unregister();
  })());
});

self.addEventListener('fetch', () => {
  return;
});