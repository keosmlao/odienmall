"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart-context";
import { syncCart } from "@/app/(shop)/cart-actions";

// Mirrors a logged-in customer's cart to the server (debounced) so an
// abandoned-cart reminder can be sent. No-op for guests (enabled=false).
export default function CartSync({ enabled }: { enabled: boolean }) {
  const { items, ready } = useCart();
  const first = useRef(true);

  useEffect(() => {
    if (!enabled || !ready) return;
    // Skip the very first run (initial hydration) to avoid a redundant write.
    if (first.current) {
      first.current = false;
      return;
    }
    const snapshot = items.map((i) => ({ code: i.code, name: i.name, qty: i.qty }));
    const t = setTimeout(() => {
      syncCart(snapshot);
    }, 1500);
    return () => clearTimeout(t);
  }, [items, enabled, ready]);

  return null;
}
