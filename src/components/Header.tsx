"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { useWishlist } from "@/lib/wishlist";
import { useT } from "@/lib/i18n-context";
import { useMemberTier } from "@/lib/useMemberTier";
import { getTierStyle, type TierCookieData } from "@/lib/tier-constants";
import SearchBox from "./SearchBox";
import NotificationBell from "./NotificationBell";
import HeaderMiniCart from "./HeaderMiniCart";
import HeaderCompare from "./HeaderCompare";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header({
  initialTier,
  points = 0,
}: {
  initialTier?: TierCookieData | null;
  points?: number;
}) {
  const { count: wishCount, ready: wishReady } = useWishlist();
  const t = useT();
  const cookieTier = useMemberTier();
  // Server-fetched initialTier is always fresh; cookie is a client-side fallback
  const tier = cookieTier ?? initialTier ?? null;
  const ts = tier ? getTierStyle(tier.rank) : null;

  const progressPct = tier && tier.nextSpend
    ? Math.min(100, Math.round((tier.spend / tier.nextSpend) * 100))
    : tier ? 100 : 0;

  const sep = ts ? "opacity-30" : "text-slate-300";

  function fmtM(n: number): string {
    if (n >= 1_000_000) {
      const m = n / 1_000_000;
      return (Number.isInteger(m) ? m : parseFloat(m.toFixed(1))) + "M";
    }
    if (n >= 1_000) return Math.round(n / 1_000) + "K";
    return n.toLocaleString("lo-LA");
  }

  return (
    <header className="bg-white text-slate-800">
      {/* Utility bar — full background color by tier */}
      <div className={`hidden border-b sm:block ${ts ? ts.topBarBg : "bg-orange-50/70"} ${ts ? ts.topBarBorder : "border-orange-100"}`}>
        <div className={`mx-auto flex max-w-[1400px] items-center justify-end gap-5 px-4 py-1 text-[11px] font-medium ${ts ? ts.topBarText : "text-slate-500"}`}>
          {/* Tier badge + discount + points + progress */}
          {tier && ts && (
            <>
              <Link href="/account" className="flex items-center gap-2 py-1">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${ts.badgeClass}`}>
                  <span>{ts.icon}</span>
                  <span>{tier.name}</span>
                </span>
                {tier.discountPct > 0 && (
                  <span className="font-bold opacity-90">ສ່ວນຫຼຸດ {tier.discountPct}%</span>
                )}
                {points > 0 && (
                  <span className="flex items-center gap-0.5 opacity-80">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
                    </svg>
                    {points.toLocaleString("lo-LA")} ແຕ້ມ
                  </span>
                )}
                {tier.nextSpend && (
                  <span className="flex items-center gap-1.5">
                    {/* Progress bar */}
                    <span className={`relative h-[5px] w-28 overflow-hidden rounded-full ${ts.progressTrack}`}>
                      <span
                        className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ${ts.progressBg}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </span>
                    {/* Amount */}
                    <span className="tabular-nums text-[9px] opacity-75">
                      {fmtM(tier.spend)}<span className="opacity-40 mx-0.5">/</span>{fmtM(tier.nextSpend)}₭
                    </span>
                    {/* Arrow */}
                    <span className="opacity-30 text-[10px]">›</span>
                    {/* Next tier name */}
                    <span className="text-[10px] font-bold">{tier.nextName}</span>
                    {/* Next tier discount bonus */}
                    {tier.nextDiscountPct != null && tier.nextDiscountPct > tier.discountPct && (
                      <span className={`rounded-full px-1.5 py-0 text-[9px] font-black leading-[18px] ${ts.badgeClass}`}>
                        +{parseFloat((tier.nextDiscountPct - tier.discountPct).toFixed(1))}%
                      </span>
                    )}
                  </span>
                )}
              </Link>
              <span className={sep}>|</span>
            </>
          )}
          <Link href="/rewards" className={`transition ${ts ? ts.linkHover : "hover:text-orange-600"}`}>⭐ ຂອງລາງວັນ</Link>
          <Link href="/flash-sales" className={`transition ${ts ? ts.linkHover : "hover:text-orange-600"}`}>⚡ Flash Sale</Link>
          <Link href="/track" className={`transition ${ts ? ts.linkHover : "hover:text-orange-600"}`}>{t("nav.track")}</Link>
          <Link href="/chat" className={`transition ${ts ? ts.linkHover : "hover:text-orange-600"}`}>💬 ຊ່ວຍເຫຼືອ</Link>
          <Link href="/affiliate" className={`transition ${ts ? ts.linkHover : "hover:text-orange-600"}`}>{t("nav.affiliate")}</Link>
          <span className={sep}>|</span>
          <a href="tel:+8562059929992" className={`transition ${ts ? ts.linkHover : "hover:text-orange-600"}`}>
            {t("nav.help")}: 020 5992 9992
          </a>
          <span className={sep}>|</span>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-2 px-3 py-2.5 sm:gap-7 sm:px-4 sm:py-4">
        <Link href="/" className="flex shrink-0 items-center transition-transform hover:scale-[1.02]" aria-label="ODIENMALL">
          <span className="flex h-11 w-14 items-center justify-center rounded-xl border border-slate-100 bg-white p-1.5 shadow-sm sm:h-16 sm:w-20">
            <Image
              src="/odm.png"
              alt="ODIENMALL"
              width={80}
              height={58}
              priority
              className="h-full w-full object-contain"
            />
          </span>
        </Link>

        <div className="col-span-3 row-start-2 w-full sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:min-w-0">
          <Suspense fallback={<div className="h-11 animate-pulse rounded-lg bg-slate-100" />}>
            <SearchBox />
          </Suspense>
        </div>

        <div className="col-start-3 row-start-1 flex min-w-0 items-center justify-end gap-0.5 sm:gap-2">
          <NotificationBell />
          <HeaderCompare />
          <HeaderAction href="/wishlist" label={t("nav.wishlist")}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M12 20s-7-4.6-9.3-9.2C1.2 7.9 2.6 5 5.6 5c1.9 0 3.2 1.1 3.9 2.3l.5.9.5-.9C11.2 6.1 12.5 5 14.4 5c3 0 4.4 2.9 2.9 5.8C19 15.4 12 20 12 20z" strokeLinejoin="round" />
            </svg>
            {wishReady && wishCount > 0 && <CountBadge count={wishCount} />}
          </HeaderAction>
          <HeaderAction href="/account" label={t("nav.account")}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
            </svg>
          </HeaderAction>
          <HeaderMiniCart />
        </div>
      </div>
    </header>
  );
}

function HeaderAction({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative flex min-w-9 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1.5 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600 sm:min-w-16 sm:px-2"
    >
      {children}
      <span className="hidden text-xs font-semibold md:block">{label}</span>
    </Link>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="absolute right-0.5 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
