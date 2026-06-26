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
    href: "/admin/sales-link",
    label: "ລິ້ງຂາຍ",
    group: "ການຂາຍ",
    match: (p: string) => p.startsWith("/admin/sales-link"),
    icon: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
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
    href: "/admin/stock",
    label: "ສິນຄ້າຄົງເຫຼືອ",
    group: "ສິນຄ້າ",
    match: (p: string) => p.startsWith("/admin/stock"),
    icon: "M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10 M3 12l9 4 9-4",
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
    href: "/admin/rewards",
    label: "ຂອງລາງວັນ",
    group: "ສິນຄ້າ",
    match: (p: string) => p.startsWith("/admin/rewards"),
    icon: "M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z",
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
    href: "/admin/sales-targets",
    label: "ເປົ້າຍອດຂາຍ",
    group: "ລາຍງານ ແລະ ລະບົບ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/sales-targets"),
    icon: "M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 12h.01",
  },
  {
    href: "/admin/sales-commission",
    label: "ຄອມມິສຊັນຂາຍ",
    group: "ລາຍງານ ແລະ ລະບົບ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/sales-commission"),
    icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
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
    href: "/admin/tier-settings",
    label: "ຂັ້ນສະມາຊິກ",
    group: "ລູກຄ້າ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/tier-settings"),
    icon: "M12 2l2.4 5.3 5.6.5-4.1 3.7 1.2 5.5L12 14.3l-5.1 2.7 1.2-5.5L4 7.8l5.6-.5L12 2zM5 21h14",
  },
  {
    href: "/admin/point-rules",
    label: "ເງື່ອນໄຂແຕ້ມ",
    group: "ລູກຄ້າ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/point-rules"),
    icon: "M12 2l2.4 5.3 5.6.5-4.1 3.7 1.2 5.5L12 14.3l-5.1 2.7 1.2-5.5L4 7.8l5.6-.5L12 2z",
  },
  {
    href: "/admin/settings",
    label: "ຕັ້ງຄ່າ",
    group: "ລາຍງານ ແລະ ລະບົບ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/settings"),
    icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  },
  {
    href: "/admin/status",
    label: "ສະຖານະລະບົບ",
    group: "ລາຍງານ ແລະ ລະບົບ",
    managerOnly: true,
    match: (p: string) => p.startsWith("/admin/status"),
    icon: "M22 12h-4l-3 9L9 3l-3 9H2",
  },
];

export default function AdminNav({
  adminName,
  role,
  chatUnread = 0,
  returnsPending = 0,
  qnaOpen = 0,
  pendingOrders = 0,
  redemptionsPending = 0,
}: {
  adminName?: string;
  role?: string;
  chatUnread?: number;
  returnsPending?: number;
  qnaOpen?: number;
  pendingOrders?: number;
  redemptionsPending?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const nav = role === "staff" ? NAV.filter((n) => !n.managerOnly) : NAV;
  const groupedNav = NAV_GROUPS.map((group) => ({
    group,
    items: nav.filter((item) => item.group === group),
  })).filter(({ items }) => items.length > 0);

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
    if (isMobile) {
      return (
        <Link
          key={n.href}
          href={n.href}
          onClick={onClick}
          aria-current={active ? "page" : undefined}
          className={`adm-focus group flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-black transition-all duration-200 ${
            active
              ? "bg-gradient-to-r from-orange-600 to-amber-500 text-white border-orange-500/20 shadow-md shadow-orange-600/10"
              : "bg-white text-slate-500 border-slate-200 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={n.icon} />
          </svg>
          <span>{n.label}</span>
          {n.href === "/admin" && pendingOrders > 0 && <Counter value={pendingOrders} />}
          {n.href === "/admin/chat" && chatUnread > 0 && <Counter value={chatUnread} />}
          {n.href === "/admin/returns" && returnsPending > 0 && <Counter value={returnsPending} />}
          {n.href === "/admin/qna" && qnaOpen > 0 && <Counter value={qnaOpen} />}
          {n.href === "/admin/rewards" && redemptionsPending > 0 && <Counter value={redemptionsPending} />}
        </Link>
      );
    }

    return (
      <Link
        key={n.href}
        href={n.href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={`adm-focus group relative flex shrink-0 items-center gap-3 rounded-lg py-2 pl-3 pr-2.5 text-[13px] font-semibold transition-colors duration-150 ${
          active
            ? "bg-orange-50 text-orange-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        {/* Left accent bar for the active item */}
        <span
          className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-orange-500 transition-all duration-200 ${
            active ? "opacity-100" : "opacity-0"
          }`}
        />
        <svg
          viewBox="0 0 24 24"
          className={`h-[18px] w-[18px] shrink-0 transition-colors ${
            active ? "text-orange-600" : "text-slate-400 group-hover:text-slate-600"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={n.icon} />
        </svg>
        <span className="flex-1 truncate">{n.label}</span>
        {n.href === "/admin" && pendingOrders > 0 && <Counter value={pendingOrders} />}
        {n.href === "/admin/chat" && chatUnread > 0 && <Counter value={chatUnread} />}
        {n.href === "/admin/returns" && returnsPending > 0 && <Counter value={returnsPending} />}
        {n.href === "/admin/qna" && qnaOpen > 0 && <Counter value={qnaOpen} />}
        {n.href === "/admin/rewards" && redemptionsPending > 0 && <Counter value={redemptionsPending} />}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col overflow-hidden border-r border-slate-200 bg-white text-slate-900 lg:flex print:!hidden shadow-[4px_0_24px_-12px_rgba(15,23,42,0.12)]">
        <div className="px-5 pb-3 pt-5">
          <Link href="/admin/dashboard" className="adm-focus flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 shadow-sm shadow-orange-500/25">
              <Image src="/odm.png" alt="ODIENMALL" width={48} height={36} className="h-6 w-auto object-contain brightness-0 invert" priority />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[15px] font-black tracking-tight text-slate-900">OdienMall</span>
              <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Admin
              </span>
            </span>
          </Link>
        </div>

        <nav className="thin-scroll relative flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-3">
          {groupedNav.map(({ group, items }, groupIndex) => {
            const headingId = `admin-nav-${groupIndex}`;
            return (
              <section key={group} aria-labelledby={headingId} className="space-y-0.5">
                <h2 id={headingId} className="mb-1 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {group}
                </h2>
                {items.map((item) => renderLink(item, false))}
              </section>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-3">
          {adminName && (
            <div className="mb-2 flex items-center gap-2.5 rounded-xl px-2 py-1.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-sm font-black text-white shadow-sm">
                {adminName.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-slate-900">{adminName}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {role === "staff" ? "Staff" : "Manager"}
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            <Link href="/" className="adm-focus group flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 px-2 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400 transition-colors group-hover:text-orange-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8M5 10v10h14V10" /></svg>
              <span>ໜ້າຮ້ານ</span>
            </Link>
            <button onClick={logout} disabled={pending} className="adm-focus group flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 px-2 py-2 text-xs font-bold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400 transition-colors group-hover:text-rose-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 12H4m0 0l3-3m-3 3l3 3M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
              <span>{pending ? "..." : "ອອກລະບົບ"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-35 border-b border-slate-200 bg-white text-slate-900 backdrop-blur-xl lg:hidden print:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/admin/dashboard" className="adm-focus grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white">
            <Image src="/odm.png" alt="ODIENMALL" width={42} height={30} className="h-6 w-auto object-contain" priority />
          </Link>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-500">OdienMall Admin</span>
            <span className="block truncate text-xs font-bold text-slate-900">{activeItem?.label || "ລະບົບຈັດການ"}</span>
          </span>
          {adminName && (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-[10px] font-black text-white shadow-sm">
              {adminName.slice(0, 1)}
            </span>
          )}
          <button onClick={logout} disabled={pending} className="adm-focus shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50" aria-label="ອອກຈາກລະບົບ">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 12H4m0 0l3-3m-3 3l3 3M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
          </button>
        </div>
        <nav className="thin-scroll flex items-center gap-1.5 overflow-x-auto border-t border-slate-200 bg-white px-3 py-2.5">{nav.map((n) => renderLink(n, true))}</nav>
      </div>
    </>
  );
}

function Counter({ value }: { value: number }) {
  return (
    <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-sm shadow-rose-500/30">
      {value > 99 ? "99+" : value}
    </span>
  );
}
