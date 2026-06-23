"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { adminLogout } from "@/app/admin/actions";

type NavItem = {
  href: string;
  label: string;
  group: NavGroup;
  managerOnly?: boolean;
  match: (p: string) => boolean;
  icon: string;
};

const NAV_GROUPS = [
  "ພາບລວມ",
  "ການຂາຍ",
  "ລູກຄ້າ",
  "ການຕະຫຼາດ",
  "ສິນຄ້າ",
  "ລາຍງານ ແລະ ລະບົບ",
] as const;

type NavGroup = (typeof NAV_GROUPS)[number];

const NAV: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "ພາບລວມ",
    group: "ພາບລວມ",
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
    group: "ລູກຄ້າ",
    match: (p: string) => p.startsWith("/admin/customers"),
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  },
  {
    href: "/admin/chat",
    label: "ແຊັດ",
    group: "ລູກຄ້າ",
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
    group: "ການຕະຫຼາດ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/affiliates"),
    icon: "M16 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21v-2a6 6 0 0 1 6-6m5 8v-2a4 4 0 0 0-3-3.87M17 11l1.5 1.5L21 9",
  },
  {
    href: "/admin/vouchers",
    label: "ຄູປ໋ອງ",
    group: "ການຕະຫຼາດ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/vouchers"),
    icon: "M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM13 5v14",
  },
  {
    href: "/admin/flash",
    label: "Flash Sale",
    group: "ການຕະຫຼາດ",
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
    group: "ການຕະຫຼາດ",
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
    group: "ລາຍງານ ແລະ ລະບົບ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/analytics"),
    icon: "M3 3v18h18M7 14l3-3 3 3 5-5",
  },
  {
    href: "/admin/report",
    label: "ລາຍງານ",
    group: "ລາຍງານ ແລະ ລະບົບ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/report"),
    icon: "M4 19V5m0 14h16M8 16V9m4 7V6m4 10v-4",
  },
  {
    href: "/admin/audit",
    label: "ບັນທຶກ",
    group: "ລາຍງານ ແລະ ລະບົບ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/audit"),
    icon: "M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  },
  {
    href: "/admin/settings",
    label: "ຕັ້ງຄ່າ",
    group: "ລາຍງານ ແລະ ລະບົບ",
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
  const groupedNav = NAV_GROUPS.map((group) => ({
    group,
    items: nav.filter((item) => item.group === group),
  })).filter(({ items }) => items.length > 0);
  // Some routes intentionally overlap (for example `/admin/orders/new` also
  // matches the general orders item). Prefer the most specific matching href.
  const activeHref = nav
    .filter((n) => n.match(pathname))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const activeItem = nav.find((item) => item.href === activeHref);

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
        className={`group relative flex shrink-0 items-center gap-3 text-sm font-semibold transition duration-200 ${
          active
            ? isMobile
              ? "rounded-xl bg-orange-500 px-3 py-2 text-white shadow-lg shadow-orange-950/20"
              : "rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-2.5 text-white shadow-lg shadow-orange-950/20"
            : isMobile
              ? "rounded-xl px-3 py-2 text-slate-400 hover:bg-white/5 hover:text-white"
              : "rounded-xl px-3 py-2.5 text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
        }`}
      >
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${
            active
              ? "bg-white/20 text-white"
              : "bg-slate-800/80 text-slate-500 group-hover:bg-slate-700/80 group-hover:text-slate-200"
          } ${isMobile ? "h-7 w-7" : ""}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={n.icon} />
          </svg>
        </span>
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-hidden border-r border-white/5 bg-[#0b1120] lg:flex print:!hidden">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-orange-500/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-1/3 h-52 w-52 rounded-full bg-blue-500/[0.05] blur-3xl" />

        <div className="relative border-b border-white/[0.06] px-5 py-5">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3 shadow-2xl shadow-black/10 transition hover:border-orange-500/20 hover:bg-white/[0.07]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white shadow-lg shadow-black/20">
              <Image src="/odm.png" alt="ODIENMALL" width={52} height={38} className="h-8 w-auto object-contain" priority />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-sm font-black tracking-[0.12em] text-white">ODIENMALL</span>
              <span className="mt-1 block text-[10px] font-semibold tracking-wide text-slate-500">ADMIN PORTAL</span>
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" title="Online" />
          </Link>
        </div>

        <nav className="thin-scroll relative flex flex-1 flex-col overflow-y-auto px-4 py-4">
          {groupedNav.map(({ group, items }, groupIndex) => {
            const headingId = `admin-nav-${groupIndex}`;

            return (
              <section
                key={group}
                aria-labelledby={headingId}
                className={groupIndex === 0 ? "pb-4" : "border-t border-white/[0.05] py-4"}
              >
                <div className="mb-2 flex items-center gap-2 px-3">
                  <h2
                    id={headingId}
                    className="shrink-0 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600"
                  >
                    {group}
                  </h2>
                  <span className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent" />
                </div>
                <div className="space-y-1">
                  {items.map((item) => renderLink(item, false))}
                </div>
              </section>
            );
          })}
        </nav>

        <div className="relative border-t border-white/[0.06] bg-black/10 p-4">
          {adminName && (
            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-sm font-black text-white shadow-lg shadow-orange-950/30">
                {adminName.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-slate-200">{adminName}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {role === "staff" ? "Staff" : "Manager"}
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Link href="/" className="group flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2.5 text-xs font-semibold text-slate-400 transition hover:border-white/10 hover:bg-white/[0.07] hover:text-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500 transition group-hover:text-orange-400" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8M5 10v10h14V10" /></svg>
              <span>ໜ້າຮ້ານ</span>
            </Link>
            <button onClick={logout} disabled={pending} className="group flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-2.5 text-xs font-semibold text-slate-400 transition hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-500 transition group-hover:text-rose-400" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 12H4m0 0l3-3m-3 3l3 3M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
              <span>{pending ? "..." : "ອອກລະບົບ"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0b1120]/95 shadow-lg shadow-slate-950/10 backdrop-blur-xl lg:hidden print:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/admin/dashboard" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white">
            <Image src="/odm.png" alt="ODIENMALL" width={42} height={30} className="h-6 w-auto object-contain" priority />
          </Link>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">OdienMall Admin</span>
            <span className="block truncate text-sm font-bold text-white">{activeItem?.label || "ລະບົບຈັດການ"}</span>
          </span>
          {adminName && (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-xs font-black text-white shadow-lg shadow-orange-950/30">
              {adminName.slice(0, 1)}
            </span>
          )}
          <button onClick={logout} disabled={pending} className="shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.04] p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50" aria-label="ອອກຈາກລະບົບ">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 12H4m0 0l3-3m-3 3l3 3M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
          </button>
        </div>
        <nav className="thin-scroll flex items-center gap-1 overflow-x-auto border-t border-white/[0.04] px-3 py-2">{nav.map((n) => renderLink(n, true))}</nav>
      </div>
    </>
  );
}
