import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductsByTagSlug } from "@/lib/catalog";
import ProductGrid from "@/components/ProductGrid";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { tagName } = await getProductsByTagSlug(slug, { inStock: false });
  if (!tagName) return { title: "ບໍ່ພົບ Tag" };
  return { title: `${tagName} — OdienMall` };
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { products, tagName } = await getProductsByTagSlug(slug);

  if (!tagName) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <Link href="/products" className="hover:text-brand">ສິນຄ້າ</Link>
          <span>/</span>
          <span className="text-gray-600">#{tagName}</span>
        </div>
        <h1 className="text-xl font-black text-gray-900 sm:text-2xl">
          #{tagName}
        </h1>
        <p className="mt-1 text-sm text-gray-400">{products.length} ລາຍການ</p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <p className="text-sm font-medium text-gray-500">ຍັງບໍ່ມີສິນຄ້າໃນ tag ນີ້</p>
          <Link href="/products" className="mt-4 inline-block text-sm text-brand hover:underline">ເບິ່ງສິນຄ້າທັງໝົດ</Link>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
