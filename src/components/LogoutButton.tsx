"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "@/app/(shop)/login/actions";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
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
