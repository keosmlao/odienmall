import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  products,
  dense = false,
  cols,
}: {
  products: Product[];
  dense?: boolean;
  cols?: 5 | 6;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
        ບໍ່ພົບສິນຄ້າ
      </div>
    );
  }
  return (
    <div
      className={`grid items-start grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 ${
        cols === 5 ? "xl:grid-cols-5" : cols === 6 || dense ? "xl:grid-cols-6" : ""
      }`}
    >
      {products.map((p) => (
        <ProductCard key={p.code} product={p} />
      ))}
    </div>
  );
}
