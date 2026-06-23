"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const VID_KEY = "om_vid";
const HEARTBEAT_MS = 60_000;

function getVid(): string {
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v) {
      v =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      localStorage.setItem(VID_KEY, v);
    }
    return v;
  } catch {
    return "";
  }
}

function send(vid: string, path: string, view: boolean) {
  if (!vid) return;
  const payload = JSON.stringify({ vid, path, view });
  try {
    if (view && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      return;
    }
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

// Anonymous first-party visit tracker: logs a view on every navigation and a
// heartbeat every minute (keeps the admin "online now" count fresh). No PII.
export default function VisitTracker() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  // One view per navigation (also keeps the ref in sync for the heartbeat).
  useEffect(() => {
    pathRef.current = pathname;
    send(getVid(), pathname, true);
  }, [pathname]);

  // Heartbeat for "online now".
  useEffect(() => {
    const id = setInterval(() => send(getVid(), pathRef.current, false), HEARTBEAT_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
