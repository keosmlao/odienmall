// Kill-switch service worker — OdienMall does NOT use a service worker.
//
// A stale service worker left over from a different app previously served on
// this origin (e.g. another project on http://localhost:3000) can keep running
// and serve OLD cached CSS/JS. That causes broken layouts and React hydration
// mismatches that survive a hard refresh. This script neutralises any such SW:
// on activation it deletes all caches, unregisters itself, and reloads open
// tabs so they fetch fresh assets directly from the network.
//
// It intentionally has NO fetch handler, so it never intercepts/caches requests.

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* best-effort cache purge */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* best-effort unregister */
      }
      try {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) client.navigate(client.url);
      } catch {
        /* best-effort reload */
      }
    })(),
  );
});
