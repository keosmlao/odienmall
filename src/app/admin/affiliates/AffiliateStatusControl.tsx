"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeAffiliateStatus } from "./actions";
import type { AffiliateStatus } from "@/lib/affiliate-constants";

// Status buttons shown per affiliate. `size` keeps the list rows compact.
export default function AffiliateStatusControl({
  code,
  current,
  size = "md",
}: {
  code: string;
  current: AffiliateStatus;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set(status: AffiliateStatus) {
    setError(null);
    startTransition(async () => {
      const res = await changeAffiliateStatus(code, status);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm";
  const btn = (extra: string) =>
    `inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold shadow-sm transition disabled:opacity-50 ${pad} ${extra}`;

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      {current !== "active" && (
        <button
          onClick={() => set("active")}
          disabled={pending}
          className={btn("bg-emerald-600 text-white hover:bg-emerald-700")}
        >
          {current === "pending" ? "ອະນຸມັດ" : "ເປີດໃຊ້ຄືນ"}
        </button>
      )}
      {current !== "suspended" && (
        <button
          onClick={() => set("suspended")}
          disabled={pending}
          className={btn("border border-gray-200 bg-white font-medium text-gray-600 shadow-none hover:border-rose-300 hover:text-rose-600")}
        >
          ລະງັບ
        </button>
      )}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
