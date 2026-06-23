"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { formatKip } from "@/lib/format";
import ProductImage from "./ProductImage";

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="9" cy="20" r="1.35" />
      <circle cx="18" cy="20" r="1.35" />
      <path d="M2 3h2.5l2.2 12.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L21 7H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute right-0.5 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function HeaderMiniCart() {
  const { items, totalQty, totalPrice, remove, ready } = useCart();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const recent = items.slice(-4).reverse();

  return (
    <>
      <Link
        href="/cart"
        aria-label="ກະຕ່າ"
        className="relative flex min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600 md:hidden"
      >
        <CartIcon />
        {ready && <Badge count={totalQty} />}
      </Link>

      <div ref={root} className="relative hidden md:block">
        <button
          type="button"
          aria-label="ກະຕ່າ"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="relative flex min-w-16 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
        >
          <CartIcon />
          {ready && <Badge count={totalQty} />}
          <span className="text-xs font-semibold">ກະຕ່າ</span>
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-sm border border-slate-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <strong className="text-sm text-slate-900">ກະຕ່າຂອງທ່ານ</strong>
              <span className="text-xs text-slate-400">{totalQty} ຊິ້ນ</span>
            </div>

            {!ready || items.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <span className="text-4xl">🛒</span>
                <p className="mt-3 text-sm font-semibold text-slate-600">ຍັງບໍ່ມີສິນຄ້າໃນກະຕ່າ</p>
                <Link
                  href="/products"
                  onClick={() => setOpen(false)}
                  className="mt-4 inline-flex rounded-sm bg-orange-500 px-5 py-2.5 text-xs font-bold text-white"
                >
                  ເລືອກຊື້ສິນຄ້າ
                </Link>
              </div>
            ) : (
              <>
                <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                  {recent.map((item) => (
                    <div key={item.code} className="flex gap-3 p-3 hover:bg-slate-50">
                      <Link
                        href={`/product/${encodeURIComponent(item.code)}`}
                        onClick={() => setOpen(false)}
                        className="shrink-0"
                      >
                        <ProductImage
                          code={item.code}
                          name={item.name}
                          brand={item.brandName}
                          imageUrl={item.imageUrl}
                          rounded="rounded-sm"
                          className="h-14 w-14 border border-slate-100"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/product/${encodeURIComponent(item.code)}`}
                          onClick={() => setOpen(false)}
                          className="line-clamp-2 text-xs font-semibold leading-5 text-slate-700 hover:text-orange-600"
                        >
                          {item.name}
                        </Link>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-orange-600">{formatKip(item.price)}</span>
                          <span className="text-[10px] text-slate-400">×{item.qty}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.code)}
                        aria-label={`ລຶບ ${item.name}`}
                        className="self-start px-1 text-lg text-slate-300 hover:text-rose-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                {items.length > recent.length && (
                  <p className="border-t border-slate-100 px-4 py-2 text-center text-[11px] text-slate-400">
                    ຍັງມີອີກ {items.length - recent.length} ລາຍການ
                  </p>
                )}
                <div className="border-t border-orange-100 bg-orange-50/40 p-4">
                  <div className="mb-3 flex items-baseline justify-between">
                    <span className="text-xs font-semibold text-slate-600">ຍອດລວມ</span>
                    <span className="text-xl font-black text-orange-600">{formatKip(totalPrice)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/cart"
                      onClick={() => setOpen(false)}
                      className="rounded-sm border border-orange-200 bg-white py-2.5 text-center text-xs font-bold text-orange-600"
                    >
                      ເບິ່ງກະຕ່າ
                    </Link>
                    <Link
                      href="/checkout"
                      onClick={() => setOpen(false)}
                      className="rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 py-2.5 text-center text-xs font-bold text-white"
                    >
                      ຊຳລະເງິນ
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
