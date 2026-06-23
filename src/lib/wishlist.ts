"use client";

import { useSyncExternalStore } from "react";

export interface WishItem {
  code: string;
  name: string;
  price: number | null;
  unit: string | null;
  brandName: string | null;
  stock: number;
  imageUrl?: string | null;
}

const STORAGE_KEY = "odienmall.wishlist.v1";
const EMPTY: WishItem[] = [];

// Module-level external store (mirrors the cart): localStorage-backed, cross-tab.
let items: WishItem[] = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  try {
    items = e.newValue ? (JSON.parse(e.newValue) as WishItem[]) : EMPTY;
  } catch {
    items = EMPTY;
  }
  emit();
}

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) items = JSON.parse(raw) as WishItem[];
  } catch {
    // ignore
  }
  window.addEventListener("storage", onStorage);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function toggleWish(item: WishItem) {
  items = items.some((p) => p.code === item.code)
    ? items.filter((p) => p.code !== item.code)
    : [item, ...items];
  persist();
  emit();
}

export function removeWish(code: string) {
  items = items.filter((p) => p.code !== code);
  persist();
  emit();
}

function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function useWishlist() {
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );
  const ready = useHydrated();
  return {
    items: list,
    count: list.length,
    has: (code: string) => list.some((p) => p.code === code),
    toggle: toggleWish,
    remove: removeWish,
    ready,
  };
}
