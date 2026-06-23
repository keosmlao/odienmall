"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useT } from "@/lib/i18n-context";
import type { Product } from "@/lib/types";

export default function ProductBuyBox({ product }: { product: Product }) {
  const { add } = useCart();
  const t = useT();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const outOfStock = product.stock <= 0;

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

      <div className="hidden gap-3 sm:grid sm:grid-cols-2">
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
    </div>
  );
}
