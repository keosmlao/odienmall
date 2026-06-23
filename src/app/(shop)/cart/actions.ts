"use server";

import { getFrequentlyBoughtForCart } from "@/lib/catalog";
import type { Product } from "@/lib/types";

/** Co-purchase cross-sell for the current basket (excludes items already in it). */
export async function cartCrossSell(codes: string[]): Promise<Product[]> {
  if (!Array.isArray(codes) || codes.length === 0) return [];
  // Cap inputs to keep the ERP scan bounded.
  return getFrequentlyBoughtForCart(codes.slice(0, 20), 6);
}
