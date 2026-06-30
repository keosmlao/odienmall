"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore, useTransition } from "react";
import { logout } from "@/app/(shop)/login/actions";

const subscribeBrowserEnvironment = () => () => {};

function isLineBrowser(): boolean {
  return /\bLine\//i.test(navigator.userAgent || "");
}

export default function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const insideLine = useSyncExternalStore(
    subscribeBrowserEnvironment,
    isLineBrowser,
    // Hide during SSR/hydration to avoid briefly flashing Logout inside LINE.
    () => true,
  );

  if (insideLine) return null;

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await logout();
          router.push("/");
          router.refresh();
        })
      }
      disabled={pending}
      className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-price hover:text-price disabled:opacity-50"
    >
      {pending ? "..." : "ອອກຈາກລະບົບ"}
    </button>
  );
}
