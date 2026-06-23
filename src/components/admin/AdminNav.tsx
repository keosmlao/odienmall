"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { adminLogout } from "@/app/admin/actions";

type NavItem = {
  href: string;
  label: string;
  group: string;
  managerOnly?: boolean;
  match: (p: string) => boolean;
  icon: string;
};

const NAV: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "ພາບລວມ",
    group: "ການຂາຍ",
    match: (p: string) => p.startsWith("/admin/dashboard"),
    icon: "M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z",
  },
  {
    href: "/admin",
    label: "ຄຳສັ່ງຊື້",
    group: "ການຂາຍ",
    match: (p: string) => p === "/admin" || p.startsWith("/admin/orders"),
    icon: "M9 5h6M5 7h14l-1 13H6L5 7zM9 11v5M15 11v5",
  },
  {
    href: "/admin/customers",
    label: "ລູກຄ້າ",
    group: "ການຂາຍ",
    match: (p: string) => p.startsWith("/admin/customers"),
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    href: "/admin/chat",
    label: "ແຊັດ",
    group: "ການຂາຍ",
    match: (p: string) => p.startsWith("/admin/chat"),
    icon: "M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6a8.5 8.5 0 0 1-.9-3.9A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z",
  },
  {
    href: "/admin/orders/new",
    label: "ສ້າງອໍເດີ",
    group: "ການຂາຍ",
    match: (p: string) => p.startsWith("/admin/orders/new"),
    icon: "M9 5h6M5 7h14l-1 13H6L5 7zM12 10v6M9 13h6",
  },
  {
    href: "/admin/returns",
    label: "ຄືນສິນຄ້າ",
    group: "ການຂາຍ",
    match: (p: string) => p.startsWith("/admin/returns"),
    icon: "M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8",
  },
  {
    href: "/admin/affiliates",
    label: "ນາຍໜ້າ",
    group: "ການຂາຍ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/affiliates"),
    icon: "M16 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21v-2a6 6 0 0 1 6-6m5 8v-2a4 4 0 0 0-3-3.87M17 11l1.5 1.5L21 9",
  },
  {
    href: "/admin/vouchers",
    label: "ຄູປ໋ອງ",
    group: "ການຂາຍ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/vouchers"),
    icon: "M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM13 5v14",
  },
  {
    href: "/admin/flash",
    label: "Flash Sale",
    group: "ການຂາຍ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/flash"),
    icon: "M13 2L3 14h7l-1 8 10-12h-7l1-8z",
  },
  {
    href: "/admin/products",
    label: "ສິນຄ້າ",
    group: "ສິນຄ້າ",
    match: (p: string) => p.startsWith("/admin/products"),
    icon: "M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10",
  },
  {
    href: "/admin/brands",
    label: "Logo Brand",
    group: "ສິນຄ້າ",
    match: (p: string) => p.startsWith("/admin/brands"),
    icon: "M20 13l-7 7-10-10V3h7l10 10zM7.5 7.5h.01",
  },
  {
    href: "/admin/banners",
    label: "Banner Slide",
    group: "ສິນຄ້າ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/banners"),
    icon: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6M16 9h.01",
  },
  {
    href: "/admin/reviews",
    label: "ຣີວິວ",
    group: "ສິນຄ້າ",
    match: (p: string) => p.startsWith("/admin/reviews"),
    icon: "M12 17.3l-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z",
  },
  {
    href: "/admin/qna",
    label: "ຖາມ-ຕອບ",
    group: "ສິນຄ້າ",
    match: (p: string) => p.startsWith("/admin/qna"),
    icon: "M8 10h8M8 14h5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  },
  {
    href: "/admin/analytics",
    label: "ສະຖິຕິຜູ້ເຂົ້າ",
    group: "ລະບົບ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/analytics"),
    icon: "M3 3v18h18M7 14l3-3 3 3 5-5",
  },
  {
    href: "/admin/report",
    label: "ລາຍງານ",
    group: "ລະບົບ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/report"),
    icon: "M4 19V5m0 14h16M8 16V9m4 7V6m4 10v-4",
  },
  {
    href: "/admin/audit",
    label: "ບັນທຶກ",
    group: "ລະບົບ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/audit"),
    icon: "M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  },
  {
    href: "/admin/settings",
    label: "ຕັ້ງຄ່າ",
    group: "ລະບົບ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/settings"),
    icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  },
];

export default function AdminNav({
  adminName,
  role,
  chatUnread = 0,
  returnsPending = 0,
  qnaOpen = 0,
}: {
  adminName?: string;
  role?: string;
  chatUnread?: number;
  returnsPending?: number;
  qnaOpen?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Staff (non-manager) don't see money/config sections.
  const nav = role === "staff" ? NAV.filter((n) => !n.managerOnly) : NAV;
  // Some routes intentionally overlap (for example `/admin/orders/new` also
  // matches the general orders item). Prefer the most specific matching href.
  const activeHref = nav
    .filter((n) => n.match(pathname))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  function logout() {
    startTransition(async () => {
      await adminLogout();
      router.push("/admin/login");
      router.refresh();
    });
  }

  const renderLink = (n: NavItem, isMobile = false, onClick?: () => void) => {
    const active = n.href === activeHref;
    return (
      <Link
        key={n.href}
        href={n.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition duration-200 shrink-0 ${
          active
            ? isMobile
              ? "bg-slate-800 text-orange-450 border-b-2 border-orange-500 rounded-b-none"
              : "bg-slate-800 text-orange-400 border-l-[3px] border-orange-500 rounded-r-xl rounded-l-none pl-2.5"
            : "text-slate-400 hover:bg-slate-850/40 hover:text-slate-100"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-5 w-5 transition-colors duration-200 ${
            active ? "text-orange-400" : "text-slate-500 group-hover:text-slate-300"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={n.icon} />
        </svg>
        <span className="flex-1">{n.label}</span>
        {n.href === "/admin/chat" && chatUnread > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white shadow-sm shadow-rose-500/20 animate-pulse">
            {chatUnread}
          </span>
        )}
        {n.href === "/admin/returns" && returnsPending > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white shadow-sm shadow-rose-500/20">
            {returnsPending}
          </span>
        )}
        {n.href === "/admin/qna" && qnaOpen > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white shadow-sm shadow-rose-500/20">
            {qnaOpen}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800 bg-slate-900 px-4 py-5 lg:flex print:!hidden">
        <Link href="/admin" className="mb-6 flex items-center gap-2.5 px-2">
          <Image src="/odm.png" alt="ODIENMALL" width={48} height={34} className="h-8 w-auto filter brightness-110" />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-extrabold text-white tracking-wider">ODIENMALL</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">ລະບົບຈັດການ</span>
          </span>
        </Link>
        <nav className="thin-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
          {nav.map((n) => renderLink(n, false))}
        </nav>
        {adminName && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 shadow-inner">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-xs font-bold text-white shadow-sm shadow-orange-500/20">
              {adminName.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-slate-300 leading-tight">{adminName}</div>
              <div className="text-[10px] text-slate-500 leading-none capitalize">{role || "staff"}</div>
            </div>
          </div>
        )}
        <div className="mt-2 space-y-0.5 border-t border-slate-800/80 pt-3">
          <Link href="/" className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-450 transition duration-200 hover:bg-slate-800/50 hover:text-slate-200">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500 transition-colors duration-200 group-hover:text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8M5 10v10h14V10" /></svg>
            <span className="font-medium">ໄປໜ້າຮ້ານ</span>
          </Link>
          <button onClick={logout} disabled={pending} className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-450 transition duration-200 hover:bg-rose-950/30 hover:text-rose-400 disabled:opacity-50">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500 transition-colors duration-200 group-hover:text-rose-400" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 12H4m0 0l3-3m-3 3l3 3M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
            <span className="font-medium">{pending ? "..." : "ອອກຈາກລະບົບ"}</span>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur lg:hidden print:hidden">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Link href="/admin" className="shrink-0">
            <Image src="/odm.png" alt="ODIENMALL" width={42} height={30} className="h-7 w-auto filter brightness-110" />
          </Link>
          <span className="flex-1 text-sm font-bold text-white">ລະບົບຈັດການ</span>
          {adminName && (
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-xs font-bold text-white">
              {adminName.slice(0, 1)}
            </span>
          )}
          <button onClick={logout} disabled={pending} className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-950/30 hover:text-rose-400 disabled:opacity-50" aria-label="ອອກຈາກລະບົບ">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 12H4m0 0l3-3m-3 3l3 3M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
          </button>
        </div>
        <nav className="thin-scroll flex items-center gap-1 overflow-x-auto px-3 pb-2">{nav.map((n) => renderLink(n, true))}</nav>
      </div>
    </>
  );
}
