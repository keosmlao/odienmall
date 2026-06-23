"use client";

import { useWishlist } from "@/lib/wishlist";
import type { Product } from "@/lib/types";

export default function WishlistButton({
  product,
  variant = "icon",
}: {
  product: Pick<Product, "code" | "name" | "price" | "unit" | "brandName" | "stock" | "imageUrl">;
  variant?: "icon" | "full";
}) {
  const { has, toggle, ready } = useWishlist();
  const active = ready && has(product.code);

  const item = {
    code: product.code,
    name: product.name,
    price: product.price,
    unit: product.unit,
    brandName: product.brandName,
    stock: product.stock,
    imageUrl: product.imageUrl,
  };

  const heart = (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M12 20s-7-4.6-9.3-9.2C1.2 7.9 2.6 5 5.6 5c1.9 0 3.2 1.1 3.9 2.3l.5.9.5-.9C11.2 6.1 12.5 5 14.4 5c3 0 4.4 2.9 2.9 5.8C19 15.4 12 20 12 20z" strokeLinejoin="round" />
    </svg>
  );

  if (variant === "full") {
    return (
      <button
        onClick={() => toggle(item)}
        className={`flex h-12 items-center justify-center gap-2 rounded-md border px-5 text-sm font-semibold transition ${
          active
            ? "border-price bg-price/5 text-price"
            : "border-gray-300 text-gray-600 hover:border-price hover:text-price"
        }`}
      >
        {heart}
        {active ? "ບັນທຶກແລ້ວ" : "ບັນທຶກ"}
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(item);
      }}
      aria-label="ບັນທຶກໃສ່ລາຍການທີ່ມັກ"
      className={`grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white ${
        active ? "text-price" : "text-gray-400 hover:text-price"
      }`}
    >
      {heart}
    </button>
  );
}
