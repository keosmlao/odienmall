"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import ProductImage from "./ProductImage";
import type { Product } from "@/lib/types";
import { formatKip } from "@/lib/format";
import { useCart } from "@/lib/cart-context";

export default function UpsellModal({
  addedProduct,
  suggestions,
  onClose,
}: {
  addedProduct: { name: string; imageUrl?: string | null };
  suggestions: Product[];
  onClose: () => void;
}) {
  const { add } = useCart();
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      <div
        ref={backdropRef}
        onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800 truncate">ເພີ່ມໃສ່ກະຕ່າແລ້ວ</p>
            <p className="text-[11px] text-slate-500 truncate">{addedProduct.name}</p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cross-sell */}
        {suggestions.length > 0 && (
          <div className="px-4 py-3">
            <p className="mb-2.5 text-[11px] font-black uppercase tracking-widest text-slate-400">ມັກຊື້ຄູ່ກັນ</p>
            <div className="space-y-2">
              {suggestions.slice(0, 3).map((p) => (
                <div key={p.code} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                    <ProductImage code={p.code} name={p.name} imageUrl={p.imageUrl} className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-800">{p.name}</p>
                    <p className="text-[11px] font-black text-orange-600">{p.price != null ? formatKip(p.price) : "ສອບຖາມລາຄາ"}</p>
                  </div>
                  {p.price != null && p.stock > 0 && (
                    <button
                      onClick={() => {
                        add({ code: p.code, name: p.name, price: p.price, unit: p.unit, brandName: p.brandName, imageUrl: p.imageUrl });
                      }}
                      className="shrink-0 rounded-lg bg-orange-500 px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-orange-600"
                    >
                      + ເພີ່ມ
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            ຊື້ຕໍ່
          </button>
          <Link
            href="/cart"
            onClick={onClose}
            className="rounded-xl bg-slate-950 py-2.5 text-center text-xs font-black text-white transition hover:bg-orange-600"
          >
            ເບິ່ງກະຕ່າ
          </Link>
        </div>
      </div>
    </div>
  );
}
