"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useT } from "@/lib/i18n-context";
import { formatKip } from "@/lib/format";
import ProductImage from "./ProductImage";
import type { Product } from "@/lib/types";

export default function ProductBuyBox({ product }: { product: Product }) {
  const { add } = useCart();
  const t = useT();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [stuck, setStuck] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const outOfStock = product.stock <= 0;

  // Desktop: show a sticky add-to-cart bar once the main buy buttons scroll out.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function handleAdd() {
    add(
      {
        code: product.code,
        name: product.name,
        price: product.price,
        unit: product.unit,
        brandName: product.brandName,
        imageUrl: product.imageUrl,
      },
      qty,
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{t("common.qty")}</span>
        <div className="inline-flex items-center rounded-md border border-gray-300">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid h-9 w-9 place-items-center text-lg text-gray-600 hover:bg-gray-100 disabled:text-gray-300"
            disabled={outOfStock}
            aria-label="ຫຼຸດ"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) =>
              setQty(Math.max(1, parseInt(e.target.value || "1", 10) || 1))
            }
            disabled={outOfStock}
            className="h-9 w-14 border-x border-gray-300 text-center text-sm outline-none"
          />
          <button
            onClick={() => setQty((q) => q + 1)}
            className="grid h-9 w-9 place-items-center text-lg text-gray-600 hover:bg-gray-100 disabled:text-gray-300"
            disabled={outOfStock}
            aria-label="ເພີ່ມ"
          >
            +
          </button>
        </div>
      </div>

      <div ref={boxRef} className="hidden gap-3 sm:grid sm:grid-cols-2">
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-orange-500 bg-orange-50 px-4 text-sm font-semibold text-orange-600 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 sm:text-base"
        >
          {outOfStock ? t("common.out_of_stock") : justAdded ? `✓ ${t("common.added")}` : t("common.add_to_cart")}
        </button>
        <Link
          href="/cart"
          className="flex h-12 w-full items-center justify-center rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 px-4 text-sm font-semibold text-white transition hover:from-orange-600 hover:to-rose-600 sm:text-base"
        >
          {t("common.go_to_cart")}
        </Link>
      </div>

      <div className="fixed inset-x-0 bottom-[53px] z-[35] grid grid-cols-2 gap-2 border-t border-orange-100 bg-white/95 p-2 shadow-[0_-6px_20px_rgba(15,23,42,0.10)] backdrop-blur sm:hidden">
        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className="flex h-12 items-center justify-center rounded-sm border border-orange-500 bg-orange-50 px-2 text-xs font-bold text-orange-600 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
        >
          {outOfStock ? t("common.out_of_stock") : justAdded ? `✓ ${t("common.added_short")}` : `${t("common.add_to_cart")} · ${qty}`}
        </button>
        <Link
          href="/cart"
          className="flex h-12 items-center justify-center rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 px-2 text-xs font-bold text-white"
        >
          {t("common.go_to_cart")}
        </Link>
      </div>

      {/* Desktop sticky buy bar — appears after the buy box scrolls away */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 hidden border-t border-slate-200 bg-white/95 shadow-[0_-6px_20px_rgba(15,23,42,0.10)] backdrop-blur transition-transform duration-300 sm:block ${
          stuck ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-3">
          <ProductImage code={product.code} name={product.name} brand={product.brandName} imageUrl={product.imageUrl} rounded="rounded-lg" className="h-12 w-12 border border-slate-100 object-contain" />
          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 text-sm font-bold text-slate-800">{product.name}</div>
            <div className="text-lg font-black text-orange-600">{formatKip(product.price)}</div>
          </div>
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className="h-11 rounded-sm border border-orange-500 bg-orange-50 px-6 text-sm font-bold text-orange-600 transition hover:bg-orange-100 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
          >
            {outOfStock ? t("common.out_of_stock") : justAdded ? `✓ ${t("common.added")}` : t("common.add_to_cart")}
          </button>
          <Link href="/cart" className="h-11 rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 px-6 text-sm font-bold leading-[44px] text-white">
            {t("common.go_to_cart")}
          </Link>
        </div>
      </div>
    </div>
  );
}
