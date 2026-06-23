import type { SortKey } from "./types";

const SORTS: SortKey[] = ["newest", "price_asc", "price_desc", "name", "rating"];

export function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseSort(v: string | string[] | undefined): SortKey {
  const s = firstParam(v);
  return (SORTS as string[]).includes(s ?? "") ? (s as SortKey) : "newest";
}

export function parsePage(v: string | string[] | undefined): number {
  const n = parseInt(firstParam(v) ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function parseNum(v: string | string[] | undefined): number | undefined {
  const s = firstParam(v);
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseBool(v: string | string[] | undefined): boolean {
  return firstParam(v) === "1";
}
