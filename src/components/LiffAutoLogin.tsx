"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    liff?: {
      init(input: { liffId: string }): Promise<void>;
      isLoggedIn(): boolean;
      login(input?: { redirectUri?: string }): void;
      getIDToken(): string | null;
      isInClient(): boolean;
    };
  }
}

let sdkLoaded: Promise<void> | null = null;

function loadLiffSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.liff) return Promise.resolve();
  if (sdkLoaded) return sdkLoaded;
  sdkLoaded = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("LIFF SDK load failed"));
    document.head.appendChild(script);
  });
  return sdkLoaded;
}

export default function LiffAutoLogin({
  liffId,
  loggedIn,
}: {
  liffId: string;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (!liffId || loggedIn || ran.current) return;
    ran.current = true;

    (async () => {
      try {
        await loadLiffSdk();
        if (!window.liff) return;
        await window.liff.init({ liffId });

        // Only auto-login when running inside the LINE Mini App client
        if (!window.liff.isInClient()) return;

        if (!window.liff.isLoggedIn()) {
          window.liff.login({ redirectUri: window.location.href });
          return;
        }

        const idToken = window.liff.getIDToken();
        if (!idToken) return;

        const res = await fetch("/api/auth/line/liff", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
        } | null;

        if (data?.ok) {
          router.refresh();
        } else if (data?.error === "line_unlinked") {
          // Account not linked yet — send to login page to connect
          router.push("/login?error=line_unlinked");
        }
      } catch (e) {
        console.error("[LiffAutoLogin]", e);
      }
    })();
  }, [liffId, loggedIn, router]);

  return null;
}
