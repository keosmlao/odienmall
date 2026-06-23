"use server";

import { getProducts } from "@/lib/catalog";

export interface ProductSuggestion {
  code: string;
  name: string;
  price: number | null;
  imageUrl: string | null;
}

/** Live product suggestions for the search box (top matches). */
export async function suggestProducts(q: string): Promise<ProductSuggestion[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  try {
    const page = await getProducts({ search: term, page: 1, pageSize: 6, sort: "newest" });
    return page.items.map((p) => ({
      code: p.code,
      name: p.name,
      price: p.flashPrice ?? p.memberPrice ?? p.price,
      imageUrl: p.imageUrl,
    }));
  } catch {
    return [];
  }
}
