"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useCart } from "@/lib/cart-context";
import { cartCrossSell } from "@/app/(shop)/cart/actions";
import type { Product } from "@/lib/types";

const UpsellModal = dynamic(() => import("./UpsellModal"), { ssr: false });

export default function AddToCartButton({
  product,
  variant = "compact",
}: {
  product: Pick<Product, "code" | "name" | "price" | "unit" | "brandName" | "stock" | "imageUrl">;
  variant?: "compact" | "full";
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [modal, setModal] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const outOfStock = product.stock <= 0;
  const noPrice = product.price == null;

  async function handleAdd() {
    add({
      code: product.code,
      name: product.name,
      price: product.price,
      unit: product.unit,
      brandName: product.brandName,
      imageUrl: product.imageUrl,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);

    // Only show upsell modal on the full (product detail) button.
    if (variant === "full") {
      const recs = await cartCrossSell([product.code]).catch(() => []);
      setSuggestions(recs);
      setModal(true);
    }
  }

  if (variant === "full") {
    return (
      <>
        <button
          onClick={handleAdd}
          disabled={outOfStock || noPrice}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 px-6 text-sm font-bold text-white shadow-sm transition hover:from-orange-600 hover:to-rose-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
        >
          {outOfStock ? "ສິນຄ້າໝົດ" : noPrice ? "ສອບຖາມລາຄາ" : added ? "✓ ເພີ່ມໃສ່ກະຕ່າແລ້ວ" : "ເພີ່ມໃສ່ກະຕ່າ"}
        </button>
        {modal && (
          <UpsellModal
            addedProduct={{ name: product.name, imageUrl: product.imageUrl }}
            suggestions={suggestions}
            onClose={() => setModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleAdd();
      }}
      disabled={outOfStock || noPrice}
      aria-label={noPrice ? "ສອບຖາມລາຄາ" : "ເພີ່ມໃສ່ກະຕ່າ"}
      className="inline-flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm transition hover:scale-110 hover:bg-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:scale-100"
    >
      {added ? (
        <span className="text-sm font-bold animate-pulse">✓</span>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="18" cy="20" r="1.4" />
          <path d="M2 3h2.5l2.2 12.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L21 7H6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
