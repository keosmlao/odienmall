"use client";

import { useEffect } from "react";
import { mergeItems } from "@/lib/cart-context";

// Runs once per browser session after login: fetches the server-saved cart and
// merges any items the customer added from another device into localStorage.
// sessionStorage key prevents a re-fetch on every page navigation.
const SYNC_KEY = "odienmall.cart.synced";

export default function CartSyncClient({ customerCode }: { customerCode: string }) {
  useEffect(() => {
    if (!customerCode) return;
    const alreadySynced = sessionStorage.getItem(SYNC_KEY) === customerCode;
    if (alreadySynced) return;
    fetch("/api/cart/sync")
      .then((r) => r.json())
      .then((data: { items: Array<{ code: string; name: string; qty: number }> }) => {
        if (data.items?.length) mergeItems(data.items);
        sessionStorage.setItem(SYNC_KEY, customerCode);
      })
      .catch(() => {});
  }, [customerCode]);

  return null;
}
