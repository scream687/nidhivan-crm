// Nidhivan CRM — service worker kill switch.
//
// The previous worker cached scripts and /_next/static cache-first with no
// revalidation and no expiry, so once a browser cached a chunk it kept serving
// those exact bytes forever. After a deploy that produced a fresh app shell on
// top of stale JS: hydration never completed, every button went inert, and
// forms fell back to a native GET submit that just reloaded the page.
//
// Nothing in the app registers a worker any more, but browsers that registered
// the old one still have it installed and controlling. This replacement takes
// over, purges every cache it left behind, and unregisters itself.
//
// If offline support is wanted again, reintroduce it with a versioned cache and
// network-first (or stale-while-revalidate) for scripts — never cache-first.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) client.navigate(client.url);
    })(),
  );
});
