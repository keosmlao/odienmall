"use client";

import { useSyncExternalStore } from "react";

export interface CompareItem {
  code: string;
  name: string;
  price: number | null;
  unit: string | null;
  brandName: string | null;
  categoryName: string | null;
  stock: number;
  rating: number | null;
  reviewCount: number;
  imageUrl: string | null;
}

const STORAGE_KEY = "odienmall.compare.v1";
const MAX = 4;
const EMPTY: CompareItem[] = [];
let items: CompareItem[] = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage restrictions.
  }
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  try {
    items = event.newValue ? (JSON.parse(event.newValue) as CompareItem[]).slice(0, MAX) : EMPTY;
  } catch {
    items = EMPTY;
  }
  emit();
}

if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) items = (JSON.parse(raw) as CompareItem[]).slice(0, MAX);
  } catch {
    // Ignore corrupt data.
  }
  window.addEventListener("storage", onStorage);
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function toggleCompare(item: CompareItem): "added" | "removed" | "full" {
  if (items.some((product) => product.code === item.code)) {
    items = items.filter((product) => product.code !== item.code);
    persist();
    emit();
    return "removed";
  }
  if (items.length >= MAX) return "full";
  items = [...items, item];
  persist();
  emit();
  return "added";
}

export function removeCompare(code: string) {
  items = items.filter((product) => product.code !== code);
  persist();
  emit();
}

export function clearCompare() {
  items = EMPTY;
  persist();
  emit();
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function useCompare() {
  const list = useSyncExternalStore(subscribe, () => items, () => EMPTY);
  return {
    items: list,
    count: list.length,
    has: (code: string) => list.some((product) => product.code === code),
    toggle: toggleCompare,
    remove: removeCompare,
    clear: clearCompare,
    ready: useHydrated(),
  };
}
