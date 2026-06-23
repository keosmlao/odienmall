"use client";

import { useRecentlyViewed } from "@/lib/recently-viewed";
import type { Product } from "@/lib/types";
import ProductGrid from "./ProductGrid";
import SectionHeader from "./SectionHeader";

export default function RecentlyViewed({
  excludeCode,
  title = "ເບິ່ງລ່າສຸດ",
}: {
  excludeCode?: string;
  title?: string;
}) {
  const { items, ready } = useRecentlyViewed();
  if (!ready) return null;

  const list = items.filter((p) => p.code !== excludeCode);
  if (list.length === 0) return null;

  const products: Product[] = list.map((w) => ({
    code: w.code,
    name: w.name,
    nameThai: null,
    description: null,
    categoryCode: null,
    categoryName: null,
    brandCode: null,
    brandName: w.brandName,
    stock: w.stock,
    isNew: false,
    isPromo: false,
    price: w.price,
    unit: w.unit,
    rating: w.rating,
    reviewCount: w.reviewCount,
    imageUrl: w.imageUrl ?? null,
    isFeatured: false,
  }));

  return (
    <section className="mt-5">
      <SectionHeader title={title} />
      <ProductGrid products={products} dense />
    </section>
  );
}
