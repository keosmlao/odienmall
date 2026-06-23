"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CART_ADDED_EVENT } from "@/lib/cart-context";

export default function CartAddedToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const show = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string; qty?: number }>).detail;
      setMessage(`${detail?.name ?? "ສິນຄ້າ"} ×${detail?.qty ?? 1}`);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setMessage(null), 2200);
    };
    window.addEventListener(CART_ADDED_EVENT, show);
    return () => {
      window.removeEventListener(CART_ADDED_EVENT, show);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 top-28 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 transition-all duration-200 ${
        message ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 rounded-sm border border-emerald-100 bg-white p-3 shadow-xl">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 font-black text-emerald-600">✓</span>
        <span className="min-w-0 flex-1">
          <strong className="block text-sm text-slate-800">ເພີ່ມໃສ່ກະຕ່າແລ້ວ</strong>
          <span className="block truncate text-xs text-slate-500">{message}</span>
        </span>
        <Link href="/cart" className="shrink-0 text-xs font-bold text-orange-600">
          ເບິ່ງ
        </Link>
      </div>
    </div>
  );
}
