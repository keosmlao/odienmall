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

    // LIFF only matters inside the LINE in-app browser (its UA contains "Line/").
    // Skip everywhere else — avoids the "URL not under endpoint URL" warning on
    // localhost/regular browsers and the cost of loading the SDK for web visitors.
    if (!/\bLine\//i.test(navigator.userAgent || "")) return;

    (async () => {
      try {
        await loadLiffSdk();
        if (!window.liff) return;
        await window.liff.init({ liffId });

        // Only auto-login when running inside the LINE Mini App client
        if (!window.liff.isInClient()) return;

        // In-app the user is already signed into LINE, so isLoggedIn() is true and
        // we read the id token directly. If somehow not logged in, do NOT call
        // liff.login() (its redirect_uri must be whitelisted and often 400s) — the
        // user can tap the LINE button, which uses the OAuth flow.
        if (!window.liff.isLoggedIn()) return;

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
          link?: string;
        } | null;

        if (data?.ok) {
          router.refresh();
        } else if (data?.error === "line_unlinked") {
          // Account not linked yet — go to the linking page to connect (the API
          // already stashed the verified LINE identity in a signed cookie).
          router.push(data.link || "/login/line/link");
        }
      } catch (e) {
        console.error("[LiffAutoLogin]", e);
      }
    })();
  }, [liffId, loggedIn, router]);

  return null;
}
