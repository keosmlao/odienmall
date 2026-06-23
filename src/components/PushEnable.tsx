"use client";

import { useEffect, useState } from "react";
import { subscribePush } from "@/app/(shop)/account/notify-actions";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// "Enable browser push" toggle. Renders only when VAPID is configured and the
// browser supports push + permission isn't already granted.
export default function PushEnable() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!VAPID) return;
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (Notification.permission !== "default") return;
      if (alive) setShow(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function enable() {
    if (busy) return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setShow(false);
        return;
      }
      const reg = await navigator.serviceWorker.register("/push-sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID) as BufferSource,
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        await subscribePush({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      }
      setShow(false);
    } catch (e) {
      console.error("push enable failed:", e);
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;
  return (
    <button
      type="button"
      onClick={enable}
      disabled={busy}
      className="w-full border-b border-gray-100 bg-brand-light/40 px-4 py-2.5 text-left text-xs font-semibold text-brand-dark transition hover:bg-brand-light/70 disabled:opacity-60"
    >
      🔔 ເປີດການແຈ້ງເຕືອນຜ່ານ browser
    </button>
  );
}
