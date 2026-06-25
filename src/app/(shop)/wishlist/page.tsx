"use client";

import Link from "next/link";
import { useWishlist } from "@/lib/wishlist";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import StorePageHeader from "@/components/StorePageHeader";
import RecentlyViewed from "@/components/RecentlyViewed";

export default function WishlistPage() {
  const { items, ready } = useWishlist();

  if (!ready) {
    return <div className="py-24 text-center text-slate-400 font-semibold animate-pulse">ກຳລັງໂຫຼດລາຍການທີ່ມັກ...</div>;
  }

  if (items.length === 0) {
    return (
      <div>
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-5 rounded-sm border border-orange-100 bg-white p-10 py-20 text-center shadow-sm">
        <div className="text-6xl mb-2">❤️</div>
        <p className="text-lg font-bold text-slate-800">ຍັງບໍ່ມີສິນຄ້າທີ່ມັກ</p>
        <p className="text-xs text-slate-450 -mt-2">ກົດຮູບຫົວໃຈໃສ່ສິນຄ້າເພື່ອບັນທຶກໄວ້ເບິ່ງພາຍຫຼັງ</p>
        <Link
          href="/products"
          className="rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-3.5 text-xs font-bold text-white shadow-md transition hover:from-orange-600 hover:to-rose-600"
        >
          ເລີ່ມຊ໊ອບປິ້ງ
        </Link>
      </div>
      <RecentlyViewed title="ສິນຄ້າທີ່ເບິ່ງລ່າສຸດ" />
      </div>
    );
  }

  // Map stored wish items to the Product shape ProductCard expects.
  const products: Product[] = items.map((w) => ({
    code: w.code,
    name: w.name,
    nameThai: null,
    description: null,
    shortDescription: null,
    categoryCode: null,
    categoryName: null,
    brandCode: null,
    brandName: w.brandName,
    stock: w.stock,
    isNew: false,
    isPromo: false,
    price: w.price,
    unit: w.unit,
    rating: null,
    reviewCount: 0,
    imageUrl: w.imageUrl ?? null,
    isFeatured: false,
    priceNote: null,
  }));

  return (
    <section className="!p-0">
      <StorePageHeader
        title={`ສິນຄ້າທີ່ມັກ (${items.length})`}
        subtitle="ສິນຄ້າທີ່ທ່ານບັນທຶກໄວ້ ພ້ອມເພີ່ມລົງກະຕ່າ"
      />
      <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 sm:gap-3 sm:p-3 lg:grid-cols-5 xl:grid-cols-6">
        {products.map((p) => (
          <ProductCard key={p.code} product={p} />
        ))}
      </div>
      <div className="p-3">
        <RecentlyViewed title="ທ່ານອາດສົນໃຈ" />
      </div>
    </section>
  );
}
