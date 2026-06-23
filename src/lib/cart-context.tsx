"use client";

import { useSyncExternalStore } from "react";

export interface CartItem {
  code: string;
  name: string;
  price: number | null;
  unit: string | null;
  brandName: string | null;
  imageUrl?: string | null;
  qty: number;
}

const STORAGE_KEY = "odienmall.cart.v1";
export const CART_ADDED_EVENT = "odienmall:cart-added";
const EMPTY: CartItem[] = [];

// Module-level external store. The cart lives in localStorage and is exposed to
// React via useSyncExternalStore — no provider needed, and it stays in sync
// across tabs through the `storage` event.
let items: CartItem[] = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  try {
    items = e.newValue ? (JSON.parse(e.newValue) as CartItem[]) : EMPTY;
  } catch {
    items = EMPTY;
  }
  emit();
}

// Hydrate once, on the client only (this module also runs during SSR).
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) items = JSON.parse(raw) as CartItem[];
  } catch {
    // ignore corrupt storage
  }
  window.addEventListener("storage", onStorage);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ---- mutations -------------------------------------------------------------

export function addItem(item: Omit<CartItem, "qty">, qty = 1) {
  const existing = items.find((p) => p.code === item.code);
  items = existing
    ? items.map((p) => (p.code === item.code ? { ...p, qty: p.qty + qty } : p))
    : [...items, { ...item, qty }];
  persist();
  emit();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CART_ADDED_EVENT, {
        detail: { name: item.name, qty },
      }),
    );
  }
}

export function setItemQty(code: string, qty: number) {
  items =
    qty <= 0
      ? items.filter((p) => p.code !== code)
      : items.map((p) => (p.code === code ? { ...p, qty } : p));
  persist();
  emit();
}

export function removeItem(code: string) {
  items = items.filter((p) => p.code !== code);
  persist();
  emit();
}

export function clearCart() {
  items = EMPTY;
  persist();
  emit();
}

// ---- hooks -----------------------------------------------------------------

/** True only after client hydration — avoids SSR/markup mismatches. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function useCart() {
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );
  const ready = useHydrated();
  const totalQty = list.reduce((s, p) => s + p.qty, 0);
  const totalPrice = list.reduce((s, p) => s + (p.price ?? 0) * p.qty, 0);
  return {
    items: list,
    totalQty,
    totalPrice,
    add: addItem,
    setQty: setItemQty,
    remove: removeItem,
    clear: clearCart,
    ready,
  };
}
