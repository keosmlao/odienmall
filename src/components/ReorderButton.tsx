"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reorder } from "@/app/(shop)/reorder-actions";
import { addItem } from "@/lib/cart-context";

// "ຊື້ອີກຄັ້ງ" — re-adds a past order's items to the cart at current prices,
// skipping anything now out of stock, then routes to the cart.
export default function ReorderButton({
  orderNo,
  variant = "compact",
}: {
  orderNo: string;
  variant?: "compact" | "full";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await reorder(orderNo);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      for (const it of res.items) {
        addItem(
          {
            code: it.code,
            name: it.name,
            price: it.price,
            unit: it.unit,
            brandName: it.brandName,
            imageUrl: it.imageUrl,
          },
          it.qty,
        );
      }
      router.push("/cart");
    });
  }

  const base =
    variant === "full"
      ? "justify-center rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-brand hover:text-brand-dark"
      : "rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-brand hover:text-brand-dark";

  return (
    <span className="inline-flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 disabled:opacity-60 ${base}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2v6h6M21 12A9 9 0 0 0 6 5.3L3 8" />
          <path d="M21 22v-6h-6M3 12a9 9 0 0 0 15 6.7l3-2.7" />
        </svg>
        {pending ? "ກຳລັງເພີ່ມ..." : "ຊື້ອີກຄັ້ງ"}
      </button>
      {error && <span className="text-[11px] font-medium text-rose-600">{error}</span>}
    </span>
  );
}
