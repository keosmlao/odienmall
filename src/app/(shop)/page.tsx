import Link from "next/link";
import {
  getGroupMenu,
  getWebBrands,
  getNewProducts,
  getPromoProducts,
  getFeaturedProducts,
} from "@/lib/catalog";
import GroupTile from "@/components/GroupTile";
import ProductGrid from "@/components/ProductGrid";
import SectionHeader from "@/components/SectionHeader";
import RecentlyViewed from "@/components/RecentlyViewed";
import BrandLogo from "@/components/BrandLogo";
import JsonLd from "@/components/JsonLd";
import DevNoticeModal from "@/components/DevNoticeModal";
import MarketplaceHero from "@/components/MarketplaceHero";
import FlashSaleCountdown from "@/components/FlashSaleCountdown";
import FlashCountdown from "@/components/FlashCountdown";
import { getActiveFlashDeals } from "@/lib/flash";
import { getDevNotice, getHomePromotion } from "@/lib/settings";
import { getHomeBanners } from "@/lib/banners";
import { SITE_URL } from "@/lib/config";
import { listPublicVouchers } from "@/lib/vouchers";
import VoucherRail from "@/components/VoucherRail";

// DB-backed; always render fresh.
export const dynamic = "force-dynamic";

const SITE_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ODIENMALL",
  url: SITE_URL,
  logo: `${SITE_URL}/odm.png`,
  telephone: "+856 20 5992 9992",
  address: {
    "@type": "PostalAddress",
    streetAddress: "ບ້ານ ຂົວຫຼວງ, ເມືອງ ຈັນທະບູລີ",
    addressLocality: "ນະຄອນຫຼວງວຽງຈັນ",
    addressCountry: "LA",
  },
};

const SEARCH_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ODIENMALL",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default async function HomePage() {
  const renderedAt = new Date().toISOString();
  const [groups, brands, newItems, promoItems, featured, notice, banners, vouchers, promotion, flash] = await Promise.all([
    getGroupMenu(),
    getWebBrands(12),
    getNewProducts(10),
    getPromoProducts(10),
    getFeaturedProducts(15),
    getDevNotice(),
    getHomeBanners(),
    listPublicVouchers(6),
    getHomePromotion(),
    getActiveFlashDeals(12),
  ]);

  // Flatten the group tree into its leaf sub-categories — the same set shown in
  // the top GroupMenu's dropdowns — so the homepage tiles match the primary nav.
  const subTiles = groups.flatMap((g) =>
    g.subs.map((s) => ({ mainCode: g.code, ...s })),
  );

  return (
    <div>
      <JsonLd data={SITE_LD} />
      <JsonLd data={SEARCH_LD} />
      {notice.enabled && (
        <DevNoticeModal title={notice.title} message={notice.message} />
      )}
      <MarketplaceHero groups={groups} banners={banners} />

      <section
        aria-label="ບໍລິການຂອງຮ້ານ"
        className="thin-scroll !mb-3 flex gap-2 overflow-x-auto !border-0 !bg-transparent !p-0 !shadow-none"
      >
        {[
          { symbol: "✓", title: "ສິນຄ້າແທ້", text: "ຈາກ ODG", color: "bg-emerald-100 text-emerald-600", href: "/products" },
          { symbol: "⚡", title: "Flash Sale", text: "ລາຄາພິເສດ", color: "bg-orange-100 text-orange-600", href: "/products" },
          { symbol: "₭", title: "ຊຳລະສະດວກ", text: "BCEL OnePay", color: "bg-blue-100 text-blue-600", href: "/checkout" },
          { symbol: "▣", title: "ຄູປ໋ອງ", text: "ຮັບສ່ວນຫຼຸດ", color: "bg-rose-100 text-rose-600", href: "/products" },
          { symbol: "☏", title: "ຊ່ວຍເຫຼືອ", text: "020 5992 9992", color: "bg-violet-100 text-violet-600", href: "tel:+8562059929992" },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="flex min-w-[190px] flex-1 items-center gap-3 rounded bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-black ${item.color}`}>
              {item.symbol}
            </span>
            <span>
              <strong className="block text-sm font-bold text-slate-800">{item.title}</strong>
              <span className="block text-[11px] text-slate-400">{item.text}</span>
            </span>
          </Link>
        ))}
      </section>

      <VoucherRail vouchers={vouchers} />

      {/* Flash sale */}
      {flash.products.length > 0 && flash.endsAt && (
        <section className="!mb-4 overflow-hidden rounded-lg border border-rose-100 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-2.5">
            <Link href="/products" className="flex items-center gap-2 text-base font-black text-white">
              ⚡ FLASH SALE
            </Link>
            <FlashCountdown endsAt={flash.endsAt} />
          </div>
          <div className="p-2 sm:p-3">
            <ProductGrid products={flash.products} dense />
          </div>
        </section>
      )}

      {/* Categories (product groups — matches the top GroupMenu nav) */}
      {subTiles.length > 0 && (
        <section className="!mb-4 !p-0">
          <SectionHeader title="ໝວດໝູ່ສິນຄ້າ" href="/products" flush />
          <div className="grid grid-cols-4 divide-x divide-y divide-slate-100 sm:grid-cols-6 lg:grid-cols-8">
            {subTiles.slice(0, 16).map((s) => (
              <GroupTile
                key={s.code}
                mainCode={s.mainCode}
                code={s.code}
                name={s.name}
                productCount={s.productCount}
              />
            ))}
          </div>
        </section>
      )}

      {/* Marketplace-style limited-time promotion rail. */}
      {promotion.enabled &&
        promotion.endsAt &&
        Date.parse(promotion.endsAt) > Date.parse(renderedAt) &&
        promoItems.length > 0 && (
        <section className="!mb-4 !border-orange-100 !p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black italic tracking-tight text-orange-600 sm:text-2xl">
                {promotion.title}
              </h2>
              <FlashSaleCountdown endsAt={promotion.endsAt} startsAt={renderedAt} />
            </div>
            <Link href="/products" className="text-xs font-bold text-orange-600 sm:text-sm">
              ເບິ່ງທັງໝົດ ›
            </Link>
          </div>
          <div className="p-2 sm:p-3">
            <ProductGrid products={promoItems.slice(0, 6)} dense />
          </div>
        </section>
      )}

      {/* New arrivals */}
      {newItems.length > 0 && (
        <section className="!mb-4">
          <SectionHeader title="ສິນຄ້າມາໃໝ່" href="/products?sort=newest" />
          <ProductGrid products={newItems.slice(0, 6)} dense />
        </section>
      )}

      {/* Recommended / featured */}
      <section className="!mb-4">
        <SectionHeader title="ສິນຄ້າແນະນຳ" href="/products" />
        <ProductGrid products={featured} dense />
      </section>

      {/* Recently viewed (client, hidden when empty) */}
      <RecentlyViewed />

      {/* Brands */}
      {brands.length > 0 && (
        <section className="!mb-4 !p-0">
          <SectionHeader title="ຍີ່ຫໍ້ຍອດນິຍົມ" href="/brands" flush />
          <div className="grid grid-cols-3 divide-x divide-y divide-slate-100 sm:grid-cols-4 md:grid-cols-6">
            {brands.map((b) => (
              <Link
                key={b.code}
                href={`/brand/${encodeURIComponent(b.code)}`}
                className="group flex min-h-28 flex-col items-center justify-center gap-2 bg-white p-3 text-center transition hover:relative hover:z-10 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <BrandLogo code={b.code} name={b.name} logo={b.logo} />
                <span className="text-sm font-bold text-gray-700 transition group-hover:text-brand-dark">
                  {b.name}
                </span>
                <span className="text-[11px] text-gray-400">{b.productCount} ລາຍການ</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
