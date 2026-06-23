"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist";

const HOME = { href: "/", label: "ໜ້າຫຼັກ", icon: "M3 11l9-8 9 8M5 10v10h14V10" };
const PRODUCTS = { href: "/products", label: "ສິນຄ້າ", icon: "M4 6h16M4 12h16M4 18h16" };
const ACCOUNT = { href: "/account", label: "ບັນຊີ", icon: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4.5 21a7.5 7.5 0 0 1 15 0" };
const HEART = "M12 20s-7-4.6-9.3-9.2C1.2 7.9 2.6 5 5.6 5c1.9 0 3.2 1.1 3.9 2.3l.5.9.5-.9C11.2 6.1 12.5 5 14.4 5c3 0 4.4 2.9 2.9 5.8C19 15.4 12 20 12 20z";
const CART = "M2 3h2.5l2.2 12.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L21 7H6";

export default function MobileNav() {
  const pathname = usePathname();
  const { totalQty, ready } = useCart();
  const { count: wishCount, ready: wishReady } = useWishlist();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const cls = (href: string) =>
    `relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
      isActive(href) ? "text-brand" : "text-gray-500"
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-100 bg-white/95 shadow-[0_-4px_18px_rgba(15,23,42,0.08)] backdrop-blur sm:hidden">
      <div className="grid grid-cols-5">
        {[HOME, PRODUCTS].map((it) => (
          <Link key={it.href} href={it.href} className={cls(it.href)}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d={it.icon} />
            </svg>
            {it.label}
          </Link>
        ))}

        <Link href="/wishlist" className={cls("/wishlist")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
            <path d={HEART} />
          </svg>
          {wishReady && wishCount > 0 && (
            <span className="absolute right-5 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-price px-1 text-[10px] font-bold text-white">
              {wishCount}
            </span>
          )}
          ມັກ
        </Link>

        <Link href="/cart" className={cls("/cart")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="20" r="1.4" />
            <circle cx="18" cy="20" r="1.4" />
            <path d={CART} />
          </svg>
          {ready && totalQty > 0 && (
            <span className="absolute right-5 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-price px-1 text-[10px] font-bold text-white">
              {totalQty}
            </span>
          )}
          ກະຕ່າ
        </Link>

        <Link href={ACCOUNT.href} className={cls(ACCOUNT.href)}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d={ACCOUNT.icon} />
          </svg>
          {ACCOUNT.label}
        </Link>
      </div>
    </nav>
  );
}
