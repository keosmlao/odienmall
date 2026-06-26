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
import { getSession } from "@/lib/auth";
import { getCollectStatus, getPointRules, getProfilePointStatus } from "@/lib/engage-points";
import EngagePointsCards from "@/components/EngagePointsCards";
import { getActiveRewards } from "@/lib/rewards";
import RewardsRail from "@/components/RewardsRail";

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
  const [groups, brands, newItems, promoItems, featured, notice, banners, vouchers, promotion, flash, pointPromos] = await Promise.all([
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
    getActiveRewards(),
  ]);

  // Flatten the group tree into its leaf sub-categories — the same set shown in
  // the top GroupMenu's dropdowns — so the homepage tiles match the primary nav.
  const subTiles = groups.flatMap((g) =>
    g.subs.map((s) => ({ mainCode: g.code, ...s })),
  );

  // Engagement-points cards for logged-in customers (collect / share / profile).
  const session = await getSession();
  const engage = session?.code
    ? {
        status: await getCollectStatus(session.code),
        rules: await getPointRules(),
        profile: await getProfilePointStatus(session.code),
      }
    : null;

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
        className="thin-scroll !mb-4 grid grid-cols-2 gap-2 overflow-x-auto sm:grid-cols-3 lg:grid-cols-5"
      >
        {[
          { title: "ສິນຄ້າແທ້ 100%", text: "ຈາກ ODG", color: "text-emerald-600 bg-emerald-50", href: "/products", icon: "M9 12l2 2 4-4M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" },
          { title: "Flash Sale", text: "ລາຄາພິເສດ", color: "text-orange-600 bg-orange-50", href: "/flash-sales", icon: "M13 2L3 14h7l-1 8 10-12h-7l1-8z" },
          { title: "ຊຳລະປອດໄພ", text: "BCEL OnePay", color: "text-blue-600 bg-blue-50", href: "/checkout", icon: "M3 10h18M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" },
          { title: "ຄູປ໋ອງ", text: "ຮັບສ່ວນຫຼຸດ", color: "text-rose-600 bg-rose-50", href: "/products", icon: "M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM13 5v14" },
          { title: "ຊ່ວຍເຫຼືອ 24/7", text: "020 5992 9992", color: "text-violet-600 bg-violet-50", href: "tel:+8562059929992", icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition group-hover:scale-105 ${item.color}`}>
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-[13px] font-black text-slate-800">{item.title}</strong>
              <span className="block truncate text-[11px] text-slate-400">{item.text}</span>
            </span>
          </Link>
        ))}
      </section>

      <VoucherRail vouchers={vouchers} />

      {engage && (
        <EngagePointsCards
          rules={engage.rules}
          collect={engage.status}
          profile={engage.profile}
          shareUrl={SITE_URL}
        />
      )}

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
        <section className="!mb-4 overflow-hidden rounded-lg bg-white shadow-sm">
          <SectionHeader title="ໝວດໝູ່ສິນຄ້າ" href="/products" />
          <div className="thin-scroll flex gap-1 overflow-x-auto p-2 sm:gap-2 sm:p-3">
            {subTiles.slice(0, 16).map((s) => (
              <div key={s.code} className="w-24 shrink-0 rounded-xl transition hover:bg-orange-50/60 sm:w-28">
                <GroupTile
                  mainCode={s.mainCode}
                  code={s.code}
                  name={s.name}
                  productCount={s.productCount}
                />
              </div>
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

      {/* Point promotions rail — pinned items only (admin-selected); fallback to first 10 active */}
      {([...pointPromos.all, ...pointPromos.member, ...pointPromos.vip].length > 0) && (
        <RewardsRail
          promos={
            pointPromos.pinned.length > 0
              ? pointPromos.pinned
              : [...pointPromos.all, ...pointPromos.member, ...pointPromos.vip].slice(0, 6)
          }
        />
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
