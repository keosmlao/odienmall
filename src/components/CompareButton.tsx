"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { useCompare } from "@/lib/compare";

type ComparableProduct = Pick<
  Product,
  | "code"
  | "name"
  | "price"
  | "unit"
  | "brandName"
  | "categoryName"
  | "stock"
  | "rating"
  | "reviewCount"
  | "imageUrl"
>;

export default function CompareButton({
  product,
  variant = "icon",
}: {
  product: ComparableProduct;
  variant?: "icon" | "full";
}) {
  const { has, toggle, ready } = useCompare();
  const active = ready && has(product.code);
  const [message, setMessage] = useState<string | null>(null);

  function click() {
    const result = toggle(product);
    setMessage(result === "full" ? "ເລືອກໄດ້ສູງສຸດ 4 ລາຍການ" : null);
    if (result === "full") window.setTimeout(() => setMessage(null), 1800);
  }

  const icon = (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M7 4v16M17 4v16M3 8h8M13 16h8M5 6l2-2 2 2M15 18l2 2 2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (variant === "full") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={click}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-sm border px-4 text-sm font-semibold transition ${
            active
              ? "border-orange-400 bg-orange-50 text-orange-600"
              : "border-gray-300 text-gray-600 hover:border-orange-300 hover:text-orange-600"
          }`}
        >
          {icon}
          {active ? "ເລືອກປຽບທຽບແລ້ວ" : "ປຽບທຽບ"}
        </button>
        {message && (
          <span className="absolute bottom-full left-1/2 mb-2 w-max max-w-56 -translate-x-1/2 rounded bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        click();
      }}
      aria-label={active ? "ເອົາອອກຈາກການປຽບທຽບ" : "ເພີ່ມເຂົ້າການປຽບທຽບ"}
      title={message ?? "ປຽບທຽບ"}
      className={`grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white ${
        active ? "text-orange-600" : "text-gray-400 hover:text-orange-600"
      }`}
    >
      {icon}
    </button>
  );
}
