"use client";

import Link from "next/link";
import { useCompare } from "@/lib/compare";
import { formatKip } from "@/lib/format";
import ProductImage from "@/components/ProductImage";
import AddToCartButton from "@/components/AddToCartButton";
import StarRating from "@/components/StarRating";
import StorePageHeader from "@/components/StorePageHeader";

export default function ComparePage() {
  const { items, remove, clear, ready } = useCompare();

  if (!ready) {
    return <div className="py-24 text-center text-sm font-semibold text-slate-400">ກຳລັງໂຫຼດ...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl border border-orange-100 bg-white px-6 py-20 text-center shadow-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-orange-50 text-2xl text-orange-500">⇄</span>
        <h1 className="mt-4 text-xl font-black text-slate-900">ຍັງບໍ່ມີສິນຄ້າປຽບທຽບ</h1>
        <p className="mt-2 text-sm text-slate-500">ກົດປຸ່ມປຽບທຽບໃນ product card ຫຼືໜ້າລາຍລະອຽດ.</p>
        <Link href="/products" className="mt-6 inline-flex rounded-sm bg-orange-500 px-6 py-3 text-sm font-bold text-white">
          ເລືອກສິນຄ້າ
        </Link>
      </div>
    );
  }

  return (
    <section className="!p-0">
      <StorePageHeader
        title={`ປຽບທຽບສິນຄ້າ (${items.length}/4)`}
        subtitle="ປຽບທຽບລາຄາ, ຍີ່ຫໍ້, stock ແລະຄະແນນ"
        action={
          <button type="button" onClick={clear} className="text-xs font-bold text-rose-500">
            ລ້າງທັງໝົດ
          </button>
        }
      />

      <div className="thin-scroll overflow-x-auto">
        <div className="grid min-w-[720px]" style={{ gridTemplateColumns: `150px repeat(${items.length}, minmax(180px, 1fr))` }}>
          <div className="border-b border-r border-slate-100 bg-slate-50 p-4" />
          {items.map((item) => (
            <div key={item.code} className="relative border-b border-r border-slate-100 bg-white p-4 text-center">
              <button
                type="button"
                onClick={() => remove(item.code)}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                aria-label={`ລຶບ ${item.name}`}
              >
                ×
              </button>
              <Link href={`/product/${encodeURIComponent(item.code)}`}>
                <ProductImage
                  code={item.code}
                  name={item.name}
                  brand={item.brandName}
                  imageUrl={item.imageUrl}
                  rounded="rounded-sm"
                  className="mx-auto aspect-square w-full max-w-44"
                />
                <h2 className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-800 hover:text-orange-600">
                  {item.name}
                </h2>
              </Link>
            </div>
          ))}

          <CompareLabel>ລາຄາ</CompareLabel>
          {items.map((item) => <CompareValue key={`price-${item.code}`} strong>{formatKip(item.price)}</CompareValue>)}

          <CompareLabel>ຍີ່ຫໍ້</CompareLabel>
          {items.map((item) => <CompareValue key={`brand-${item.code}`}>{item.brandName || "—"}</CompareValue>)}

          <CompareLabel>ໝວດໝູ່</CompareLabel>
          {items.map((item) => <CompareValue key={`category-${item.code}`}>{item.categoryName || "—"}</CompareValue>)}

          <CompareLabel>ສະຖານະ</CompareLabel>
          {items.map((item) => (
            <CompareValue key={`stock-${item.code}`}>
              <span className={item.stock > 0 ? "font-semibold text-emerald-600" : "font-semibold text-rose-500"}>
                {item.stock > 0 ? "ມີສິນຄ້າ" : "ສິນຄ້າໝົດ"}
              </span>
            </CompareValue>
          ))}

          <CompareLabel>ຄະແນນ</CompareLabel>
          {items.map((item) => (
            <CompareValue key={`rating-${item.code}`}>
              {item.rating != null && item.reviewCount > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <StarRating value={item.rating} size={12} />
                  <span className="text-xs text-slate-400">({item.reviewCount})</span>
                </span>
              ) : "ຍັງບໍ່ມີ"}
            </CompareValue>
          ))}

          <CompareLabel>ສັ່ງຊື້</CompareLabel>
          {items.map((item) => (
            <div key={`cart-${item.code}`} className="border-b border-r border-slate-100 bg-white p-4">
              <AddToCartButton product={{ ...item }} variant="full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompareLabel({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-r border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-600">{children}</div>;
}

function CompareValue({
  children,
  strong = false,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className={`border-b border-r border-slate-100 bg-white p-4 text-center text-sm ${
      strong ? "text-lg font-black text-orange-600" : "text-slate-600"
    }`}>
      {children}
    </div>
  );
}
