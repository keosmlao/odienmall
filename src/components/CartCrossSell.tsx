"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { cartCrossSell } from "@/app/(shop)/cart/actions";
import type { Product } from "@/lib/types";
import ProductGrid from "./ProductGrid";
import SectionHeader from "./SectionHeader";

// "ມັກຊື້ຄູ່ກັນ" cross-sell on the cart, driven by real ERP co-purchase data.
// Re-fetches when the set of cart item codes changes.
export default function CartCrossSell() {
  const { items, ready } = useCart();
  const [recs, setRecs] = useState<Product[]>([]);

  // Stable key of the cart's product codes so the effect only re-runs on change.
  const codesKey = items
    .map((i) => i.code)
    .sort()
    .join(",");

  useEffect(() => {
    if (!ready || !codesKey) return;
    let cancelled = false;
    cartCrossSell(codesKey.split(","))
      .then((res) => {
        if (!cancelled) setRecs(res);
      })
      .catch(() => {
        if (!cancelled) setRecs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [codesKey, ready]);

  // Hide when the cart is empty (recs may be stale from a prior basket).
  if (items.length === 0 || recs.length === 0) return null;

  return (
    <section className="mt-5">
      <SectionHeader title="ມັກຊື້ຄູ່ກັນ" />
      <ProductGrid products={recs} dense />
    </section>
  );
}
