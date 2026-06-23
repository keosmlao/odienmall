import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductByCode, getRelatedProducts, getFrequentlyBought, getSoldCount, getProductImageList } from "@/lib/catalog";
import { getProductReviews } from "@/lib/reviews";
import { getProductQuestions } from "@/lib/qna";
import ProductQna from "@/components/ProductQna";
import { getSession } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";
import { localeName } from "@/lib/i18n";
import { formatKip, productImageUrl, metaDescription } from "@/lib/format";
import { SITE_URL } from "@/lib/config";
import JsonLd from "@/components/JsonLd";
import ProductGallery from "@/components/ProductGallery";
import ProductBuyBox from "@/components/ProductBuyBox";
import WishlistButton from "@/components/WishlistButton";
import ProductAlertButton from "@/components/ProductAlertButton";
import ProductGrid from "@/components/ProductGrid";
import ProductReviews from "@/components/ProductReviews";
import StarRating from "@/components/StarRating";
import SectionHeader from "@/components/SectionHeader";
import Breadcrumb from "@/components/Breadcrumb";
import TrackView from "@/components/TrackView";
import RecentlyViewed from "@/components/RecentlyViewed";
import ProductShare from "@/components/ProductShare";
import CompareButton from "@/components/CompareButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const product = await getProductByCode(decodeURIComponent(code));
  if (!product) return { title: "ບໍ່ພົບສິນຄ້າ" };
  const description =
    metaDescription(product.description) ??
    `${product.name}${product.brandName ? ` · ${product.brandName}` : ""}`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${encodeURIComponent(product.code)}` },
    openGraph: { title: product.name, description, type: "website" },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const decoded = decodeURIComponent(code);
  const product = await getProductByCode(decoded);
  if (!product) notFound();

  const session = await getSession();
  const locale = await getLocale();
  const displayName = localeName(product, locale);
  const [related, frequentlyBought, soldCount, reviews, galleryImages, questions] = await Promise.all([
    getRelatedProducts(product.categoryCode, product.code, 6),
    getFrequentlyBought(product.code, 6),
    getSoldCount(product.code),
    getProductReviews(product.code, session?.code),
    getProductImageList(product.code),
    getProductQuestions(product.code),
  ]);
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  const productUrl = `${SITE_URL}/product/${encodeURIComponent(product.code)}`;
  const ldDescription = metaDescription(product.description);
  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.code,
    image: productImageUrl(product.code) ?? `${SITE_URL}/odm.png`,
    ...(ldDescription ? { description: ldDescription } : {}),
    ...(product.brandName ? { brand: { "@type": "Brand", name: product.brandName } } : {}),
    ...(product.categoryName ? { category: product.categoryName } : {}),
    ...(product.price != null
      ? {
          offers: {
            "@type": "Offer",
            price: Math.round(product.price),
            priceCurrency: "LAK",
            availability: outOfStock
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
            url: productUrl,
          },
        }
      : {}),
    ...(reviews.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(reviews.average.toFixed(1)),
            reviewCount: reviews.count,
          },
        }
      : {}),
  };

  const crumbs = [
    { name: "ໜ້າຫຼັກ", item: `${SITE_URL}/` },
    ...(product.categoryName && product.categoryCode
      ? [{ name: product.categoryName, item: `${SITE_URL}/category/${encodeURIComponent(product.categoryCode)}` }]
      : []),
    { name: product.name, item: undefined as string | undefined },
  ];
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.item ? { item: c.item } : {}),
    })),
  };

  return (
    <div className="pb-16 sm:pb-0">
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />
      <TrackView
        item={{
          code: product.code,
          name: product.name,
          price: product.price,
          unit: product.unit,
          brandName: product.brandName,
          stock: product.stock,
          rating: product.rating,
          reviewCount: product.reviewCount,
          imageUrl: product.imageUrl,
        }}
      />
      <Breadcrumb
        items={[
          ...(product.categoryName && product.categoryCode
            ? [
                {
                  label: product.categoryName,
                  href: `/category/${encodeURIComponent(product.categoryCode)}`,
                },
              ]
            : []),
          { label: product.name },
        ]}
      />

      <div className="grid min-w-0 gap-6 overflow-hidden rounded-sm border border-slate-100 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)_230px] lg:p-6">
        <ProductGallery
          code={product.code}
          name={product.name}
          brand={product.brandName}
          imageUrl={product.imageUrl}
          images={galleryImages}
        />

        <div className="flex min-w-0 flex-col gap-5">
          {product.brandName && product.brandCode && (
            <Link
              href={`/brand/${encodeURIComponent(product.brandCode)}`}
              className="text-xs font-bold uppercase tracking-wider text-orange-500 transition-colors hover:text-orange-600"
            >
              {product.brandName}
            </Link>
          )}
          <h1 className="break-words text-2xl font-black tracking-tight text-slate-900 sm:text-3xl leading-tight">
            {displayName}
          </h1>
          {product.nameThai && product.nameThai !== product.name && (
            <p className="-mt-3 text-sm font-medium text-slate-400">{product.nameThai}</p>
          )}
          {reviews.count > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <StarRating value={reviews.average} size={14} />
              <span className="font-bold text-amber-500">{reviews.average.toFixed(1)}</span>
              <span className="text-slate-400">· {reviews.count} ລີວິວ</span>
            </div>
          )}

          <div className="border-y border-orange-100 bg-orange-50 px-5 py-4">
            {(() => {
              const deal = product.flashPrice ?? product.memberPrice ?? null;
              const isDeal = deal != null && product.price != null && deal < product.price;
              const label = product.flashPrice != null ? "⚡ FLASH SALE" : "ລາຄາສະມາຊິກ";
              const cls = product.flashPrice != null ? "bg-rose-100 text-rose-600" : "bg-violet-100 text-violet-600";
              return isDeal ? (
                <>
                  <div className="text-base font-bold text-slate-400 line-through">{formatKip(product.price)}</div>
                  <div className="flex items-center gap-2 text-3xl font-black tracking-tight text-orange-600">
                    {formatKip(deal)}
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${cls}`}>{label}</span>
                  </div>
                </>
              ) : (
                <div className="text-3xl font-black tracking-tight text-orange-600">{formatKip(product.price)}</div>
              );
            })()}
            {product.unit && (
              <div className="text-xs font-bold text-slate-400 mt-1">ຕໍ່ {product.unit}</div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 shadow-xs border ${
              outOfStock 
                ? "bg-slate-100 text-slate-500 border-slate-200" 
                : "bg-emerald-50 text-emerald-700 border-emerald-100"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${outOfStock ? "bg-slate-400" : "bg-emerald-500 animate-pulse"}`} />
              {outOfStock ? "ສິນຄ້າໝົດ" : "ມີສິນຄ້າ"}
            </span>
            {lowStock && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-rose-600">
                🔥 ເຫຼືອພຽງ {product.stock} ອັນ
              </span>
            )}
            {soldCount > 0 && (
              <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-orange-700">
                ຂາຍແລ້ວ {soldCount.toLocaleString("en-US")}
              </span>
            )}
            {product.categoryName && (
              <span className="rounded-full bg-slate-100 border border-slate-200/40 px-3 py-1 text-slate-600">
                ໝວດໝູ່: {product.categoryName}
              </span>
            )}
            <span className="rounded-full bg-slate-100 border border-slate-200/40 px-3 py-1 text-slate-650">
              ລະຫັດ: {product.code}
            </span>
          </div>

          <div className="pt-2">
            <ProductBuyBox product={product} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <WishlistButton product={product} variant="full" />
            <CompareButton product={product} variant="full" />
            <ProductShare title={product.name} url={productUrl} />
          </div>
          <ProductAlertButton productCode={product.code} />
        </div>

        <aside className="hidden h-fit border-l border-slate-100 pl-5 lg:block">
          <h2 className="mb-4 text-sm font-bold text-slate-900">ບໍລິການຈາກ OdienMall</h2>
          <div className="space-y-4 text-xs text-slate-500">
            {[
              ["✓", "ສິນຄ້າຈາກ ODG", "ກວດສອບກ່ອນຈັດສົ່ງ"],
              ["▣", "ຈັດສົ່ງທົ່ວລາວ", "ເລືອກຈຸດຈັດສົ່ງໄດ້"],
              ["₭", "ຊຳລະຜ່ານ BCEL", "ສະຖານະອັບເດດອັດຕະໂນມັດ"],
              ["☏", "ມີພະນັກງານຊ່ວຍ", "020 5992 9992"],
            ].map(([icon, title, text]) => (
              <div key={title} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-50 font-black text-orange-600">{icon}</span>
                <span>
                  <strong className="block text-slate-700">{title}</strong>
                  <span className="mt-0.5 block leading-5">{text}</span>
                </span>
              </div>
            ))}
          </div>
          <a href="tel:+8562059929992" className="mt-5 block rounded-sm border border-orange-200 bg-orange-50 px-3 py-2.5 text-center text-xs font-bold text-orange-600">
            ສອບຖາມສິນຄ້າ
          </a>
        </aside>
      </div>

      {product.description && (
        <div className="mt-5 rounded-sm border border-slate-100 bg-white shadow-sm">
          <h2 className="border-b-2 border-orange-500 px-5 py-4 text-lg font-bold text-slate-900">ລາຍລະອຽດສິນຄ້າ</h2>
          <p className="whitespace-pre-line px-5 py-6 text-sm leading-relaxed text-slate-600">
            {product.description}
          </p>
        </div>
      )}

      <ProductReviews
        productCode={product.code}
        summary={reviews}
        canReview={!!session}
      />

      <ProductQna productCode={product.code} initial={questions} loggedIn={!!session} />

      {frequentlyBought.length > 0 && (
        <div className="mt-8">
          <SectionHeader title="ມັກຊື້ຄູ່ກັນ" />
          <ProductGrid products={frequentlyBought} />
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-8">
          <SectionHeader title="ສິນຄ້າທີ່ກ່ຽວຂ້ອງ" />
          <ProductGrid products={related} />
        </div>
      )}

      <RecentlyViewed excludeCode={product.code} />
    </div>
  );
}
