// Dedicated push service worker (separate from the kill-switch sw.js). It has NO
// fetch handler and never unregisters — it only shows push notifications. It is
// registered by the app ONLY when web push (VAPID) is configured.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "OdienMall", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "OdienMall";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/odm.png",
      badge: "/odm.png",
      data: { link: data.link || "/account" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/account";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if (c.url.includes(link) && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(link);
    })(),
  );
});
