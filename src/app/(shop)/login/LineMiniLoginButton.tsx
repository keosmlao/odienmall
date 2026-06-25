"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

let liffPromise: Promise<void> | null = null;

function loadLiff(): Promise<void> {
  if (window.liff) return Promise.resolve();
  if (liffPromise) return liffPromise;
  liffPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-line-liff]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("LIFF SDK load failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.async = true;
    script.dataset.lineLiff = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("LIFF SDK load failed"));
    document.head.appendChild(script);
  });
  return liffPromise;
}

export default function LineMiniLoginButton({
  liffId,
  redirect,
  onError,
}: {
  liffId: string;
  redirect: string;
  onError: (error: string) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function login() {
    setPending(true);
    onError("");
    try {
      await loadLiff();
      if (!window.liff) throw new Error("LIFF SDK missing");
      await window.liff.init({ liffId });
      if (!window.liff.isLoggedIn()) {
        window.liff.login({ redirectUri: window.location.href });
        return;
      }
      const idToken = window.liff.getIDToken();
      if (!idToken) throw new Error("LINE ID token missing");
      const res = await fetch("/api/auth/line/liff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        onError(data?.error || "line_failed");
        setPending(false);
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch (e) {
      console.error("LIFF login failed:", e);
      onError("line_failed");
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={login}
      disabled={pending}
      className="mb-4 flex w-full items-center justify-center gap-2 rounded-sm bg-[#06C755] py-3.5 text-sm font-black text-white shadow-md transition hover:bg-[#05b84f] disabled:opacity-60"
    >
      <span className="grid h-5 w-5 place-items-center rounded bg-white text-[10px] font-black text-[#06C755]">LINE</span>
      {pending ? "ກຳລັງເຂົ້າຜ່ານ LINE..." : "ເຂົ້າຜ່ານ LINE Mini App"}
    </button>
  );
}
