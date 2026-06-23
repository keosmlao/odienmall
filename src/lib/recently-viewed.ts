"use client";

import { useSyncExternalStore } from "react";

export interface RecentItem {
  code: string;
  name: string;
  price: number | null;
  unit: string | null;
  brandName: string | null;
  stock: number;
  rating: number | null;
  reviewCount: number;
  imageUrl?: string | null;
}

const STORAGE_KEY = "odienmall.recent.v1";
const MAX = 12;
const EMPTY: RecentItem[] = [];

let items: RecentItem[] = EMPTY;
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
    items = e.newValue ? (JSON.parse(e.newValue) as RecentItem[]) : EMPTY;
  } catch {
    items = EMPTY;
  }
  emit();
}

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) items = JSON.parse(raw) as RecentItem[];
  } catch {
    // ignore
  }
  window.addEventListener("storage", onStorage);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Record a viewed product: move to front, dedup by code, cap to MAX. */
export function recordView(item: RecentItem) {
  items = [item, ...items.filter((p) => p.code !== item.code)].slice(0, MAX);
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

export function useRecentlyViewed() {
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );
  return { items: list, ready: useHydrated() };
}
