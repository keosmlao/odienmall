import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getCustomerProfile } from "@/lib/auth";
import { getOrdersByCustomer } from "@/lib/orders";
import { getBalance, getHistory } from "@/lib/loyalty";
import { getCustomerTier, getMemberDiscountPct, getTierConfig } from "@/lib/member-tier";
import { getSmlCustomerInsights } from "@/lib/sml-history";
import { getCustomerAddresses } from "@/lib/addresses";
import { onepayEnabled, onepayMerchantConfigured } from "@/lib/onepay";
import { formatKip } from "@/lib/format";
import { getTierStyle, TIER_RANK_STYLES } from "@/lib/tier-constants";
import StatusBadge from "@/components/StatusBadge";
import LogoutButton from "@/components/LogoutButton";
import DeleteOrderButton from "./DeleteOrderButton";
import PayButton from "./PayButton";
import ReorderButton from "@/components/ReorderButton";
import CancelOrderButton from "@/components/CancelOrderButton";
import AddressBook from "./AddressBook";

export const dynamic = "force-dynamic";

// Quick-action tiles. Icons are outline paths (one `d`, may hold several
// subpaths) drawn at 24×24.
const TILES = [
  {
    href: "#orders",
    label: "ຄຳສັ່ງຊື້",
    desc: "ປະຫວັດ & ສະຖານະ",
    tone: "bg-brand-light text-brand-dark",
    // receipt
    icon: "M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z M9 8h6 M9 12h6 M9 16h4",
  },
  {
    href: "#addresses",
    label: "ທີ່ຢູ່ຈັດສົ່ງ",
    desc: "ຈັດການທີ່ຢູ່",
    tone: "bg-amber-100 text-amber-600",
    // map pin
    icon: "M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  },
  {
    href: "/wishlist",
    label: "ສິນຄ້າທີ່ມັກ",
    desc: "ລາຍການທີ່ບັນທຶກ",
    tone: "bg-rose-100 text-rose-600",
    // heart
    icon: "M12 20s-7-4.6-9.3-9.2C1.2 7.9 2.6 5 5.6 5c1.9 0 3.2 1.1 3.9 2.3l.5.9.5-.9C11.2 6.1 12.5 5 14.4 5c3 0 4.4 2.9 2.9 5.8C19 15.4 12 20 12 20z",
  },
  {
    href: "/affiliate",
    label: "ນາຍໜ້າ",
    desc: "ແນະນຳ ຮັບລາຍໄດ້",
    tone: "bg-emerald-100 text-emerald-600",
    // users
    icon: "M16 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21v-2a6 6 0 0 1 6-6m5 8v-2a4 4 0 0 0-3-3.87M17 11l1.5 1.5L21 9",
  },
  {
    href: "/account/returns",
    label: "ຄືນສິນຄ້າ",
    desc: "ປະຫວັດການຄືນ",
    tone: "bg-violet-100 text-violet-600",
    // return arrow + box
    icon: "M9 14l-4-4 4-4 M5 10h11a4 4 0 0 1 0 8h-1",
  },
  {
    href: "/account/questions",
    label: "ຄຳຖາມ",
    desc: "Q&A ຂອງຂ້ອຍ",
    tone: "bg-sky-100 text-sky-600",
    // chat bubble
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
  {
    href: "/products",
    label: "ຊ໊ອບປິ້ງ",
    desc: "ສືບຕໍ່ເລືອກຊື້",
    tone: "bg-blue-100 text-blue-600",
    // shopping cart
    icon: "M3 4h2l2.4 12.3a1 1 0 0 0 1 .7h9.2a1 1 0 0 0 1-.8L21 8H6 M10 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  },
];

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const ORDER_TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: "all", label: "ທັງໝົດ", statuses: [] },
  { key: "topay", label: "ລໍຖ້າຈ່າຍ", statuses: ["pending"] },
  { key: "processing", label: "ກຳລັງດຳເນີນ", statuses: ["cod", "awaiting_confirmation", "paid", "shipping"] },
  { key: "completed", label: "ສຳເລັດ", statuses: ["completed"] },
  { key: "cancelled", label: "ຍົກເລີກ", statuses: ["cancelled"] },
];

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/account");

  const sp = await searchParams;
  const rawTab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab = ORDER_TABS.some((t) => t.key === rawTab) ? (rawTab as string) : "all";

  const [profile, orders, addresses, pointBalance, pointHistory, sml, tier, memberPct, tierConfig] = await Promise.all([
    getCustomerProfile(session.code),
    getOrdersByCustomer(session.code),
    getCustomerAddresses(session.code),
    getBalance(session.code),
    getHistory(session.code, 8),
    getSmlCustomerInsights(session.code),
    getCustomerTier(session.code),
    getMemberDiscountPct(session.code),
    getTierConfig(),
  ]);

  const activeTab = ORDER_TABS.find((t) => t.key === tab) ?? ORDER_TABS[0];
  const visibleOrders =
    activeTab.statuses.length === 0 ? orders : orders.filter((o) => activeTab.statuses.includes(o.status));
  const tabCount = (t: (typeof ORDER_TABS)[number]) =>
    t.statuses.length === 0 ? orders.length : orders.filter((o) => t.statuses.includes(o.status)).length;

  const name = profile?.name ?? session.name ?? "?";
  const points = profile?.pointBalance ?? 0;
  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.subtotal, 0);

  // Tier progress (uses ENV-var config — tiers + spend thresholds)
  const currentTierConfig = tier ? tierConfig.find((t) => t.code === tier.code) : null;
  const nextTierConfig = currentTierConfig
    ? tierConfig.find((t) => t.rank === currentTierConfig.rank + 1) ?? null
    : tierConfig[0] ?? null; // no tier → show path to Gold
  const tierTs = currentTierConfig ? getTierStyle(currentTierConfig.rank) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* Inline styles for the premium membership card reflection sweep */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes sweep {
          0% { transform: translateX(-150%) skewX(-20deg); }
          35% { transform: translateX(200%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
        .animate-sweep {
          animation: sweep 7s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column - Sidebar (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Profile Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/5 blur-2xl pointer-events-none" />
            <div className="relative flex flex-col items-center text-center">
              {/* Avatar with Glow and Scale */}
              <div className="relative group mb-4">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-orange-500 to-rose-500 opacity-20 blur-md group-hover:opacity-45 transition-all duration-300 scale-95 group-hover:scale-105" />
                <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-tr from-orange-500 to-rose-500 text-2xl font-black text-white shadow-md ring-4 ring-white transition-transform duration-300 group-hover:scale-105 select-none">
                  {name.slice(0, 1).toUpperCase()}
                </div>
              </div>
              
              <h2 className="text-lg font-black text-slate-800 leading-tight tracking-tight">{name}</h2>
              <p className="text-xs font-semibold text-slate-400 mt-1">ລະຫັດລູກຄ້າ: {session.code}</p>

              {/* Action buttons */}
              <div className="mt-5 w-full pt-4 border-t border-slate-105/50 flex items-center justify-center">
                <LogoutButton />
              </div>
            </div>
          </div>

          {/* Membership Card Widget */}
          <div className="space-y-4">
            {/* Holographic Digital Member Card */}
            <div className={`relative overflow-hidden rounded-2xl p-6 h-52 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] border ${
              currentTierConfig?.rank === 2
                ? "bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 text-slate-100 shadow-[0_12px_30px_rgba(15,23,42,0.25)] border-slate-800"
                : currentTierConfig?.rank === 1
                ? "bg-gradient-to-tr from-slate-400 via-slate-200 to-slate-100 text-slate-900 shadow-[0_12px_30px_rgba(148,163,184,0.18)] border-slate-200"
                : currentTierConfig?.rank === 0
                ? "bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-250 text-amber-950 shadow-[0_12px_30px_rgba(245,158,11,0.2)] border-amber-300/40"
                : "bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 text-slate-200 shadow-lg border-slate-800"
            }`}>
              {/* Sweep gloss effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] animate-sweep pointer-events-none" />
              
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-widest opacity-60">OdienMall Member</p>
                  <h3 className="text-lg font-black mt-1 tracking-tight flex items-center gap-1.5">
                    <span>{tierTs?.icon ?? "👑"}</span>
                    <span>{tier?.name ?? "ສະມາຊິກທົ່ວໄປ"}</span>
                  </h3>
                </div>
                {/* Embedded Metallic Microchip Logo */}
                <div className="h-8 w-11 rounded-md bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 opacity-80 border border-amber-500/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  <div className="grid grid-cols-3 gap-0.5 w-7 h-5 opacity-40">
                    <div className="border border-amber-950 rounded-xs"></div>
                    <div className="border border-amber-950 rounded-xs"></div>
                    <div className="border border-amber-950 rounded-xs"></div>
                    <div className="border border-amber-950 rounded-xs"></div>
                    <div className="border border-amber-950 rounded-xs"></div>
                    <div className="border border-amber-950 rounded-xs"></div>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <p className="text-[10px] font-bold opacity-60 uppercase">ຍອດໃຊ້ຈ່າຍລວມ</p>
                <p className="text-2xl font-black tracking-tight">{formatKip(totalSpent)}</p>
              </div>

              <div className="flex items-end justify-between border-t border-white/10 pt-3.5">
                <div>
                  <p className="text-[8px] font-extrabold uppercase tracking-wider opacity-50">Member Code</p>
                  <p className="font-mono text-xs font-bold tracking-widest">{session.code}</p>
                </div>
                {memberPct > 0 && (
                  <span className="rounded-lg bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                    ສ່ວນຫຼຸດ {memberPct}%
                  </span>
                )}
              </div>
            </div>

            {/* Progress to next tier level */}
            {nextTierConfig && nextTierConfig.minSpend > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <span>{tier?.name ?? "ເລີ່ມຕົ້ນ"}</span>
                  <span>ຂຶ້ນ {nextTierConfig.name} · {formatKip(nextTierConfig.minSpend)}</span>
                </div>
                <div className="mt-2.5 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((totalSpent / nextTierConfig.minSpend) * 100))}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  ຕ້ອງການ {formatKip(Math.max(0, nextTierConfig.minSpend - totalSpent))} ອີກ ເພື່ອຂຶ້ນ {nextTierConfig.name}
                </p>
              </div>
            )}
            {!nextTierConfig && currentTierConfig && (
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-center">
                <p className="text-xs font-bold text-slate-650">✦ ທ່ານຢູ່ຂັ້ນສະມາຊິກສູງສຸດແລ້ວ ({tier?.name})</p>
              </div>
            )}
          </div>

          {/* Loyalty Points Widget */}
          <div className="rounded-2xl border border-amber-100/80 bg-amber-50/20 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">ແຕ້ມສະສົມ OdienMall</p>
                <p className="mt-1 text-3xl font-black text-amber-900 tracking-tight">
                  {pointBalance.toLocaleString()} <span className="text-xs font-extrabold text-amber-705">ແຕ້ມ</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href="/rewards" className="rounded-full bg-amber-500 px-3 py-1 text-[11px] font-black text-white transition hover:bg-amber-600">
                    🎁 ແລກຂອງລາງວັນ
                  </a>
                  <a href="/account/rewards" className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-700 transition hover:bg-amber-200">
                    ປະຫວັດການແລກ
                  </a>
                </div>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm shadow-amber-500/5">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
                </svg>
              </div>
            </div>
            {pointHistory.length > 0 && (
              <div className="mt-4 border-t border-amber-200/40 pt-4">
                <p className="text-[10px] font-extrabold text-amber-850 uppercase tracking-wider mb-2.5">ປະຫວັດຄະແນນຫຼ້າສຸດ</p>
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-amber-200">
                  {pointHistory.map((h) => (
                    <div key={h.id} className="flex justify-between items-center text-xs font-medium text-amber-800/90 py-0.5">
                      <div className="flex flex-col">
                        <span>
                          {h.reason === "earn" ? "ໄດ້ຮັບ" : h.reason === "redeem" ? "ໃຊ້" : "ປັບປຸງ"}
                        </span>
                        {h.orderNo && <span className="font-mono text-[9px] text-amber-600/70">{h.orderNo}</span>}
                      </div>
                      <span className={`font-black ${h.delta >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        {h.delta >= 0 ? "+" : ""}{h.delta.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SML Purchase Insights */}
          {sml.purchaseCount > 0 && (
            <div className="rounded-2xl border border-violet-100 bg-violet-50/15 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-violet-800 uppercase tracking-wider">ປະຫວັດການຊື້ກັບ ODIEN (SML)</p>
                  <p className="text-[10px] font-bold text-violet-500 mt-0.5">
                    {sml.purchaseCount.toLocaleString()} ບິນ · ລວມ {formatKip(sml.purchaseTotal)}
                  </p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600 shrink-0">
                  <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z M3 8l2-3h14l2 3 M9 12h6" />
                  </svg>
                </div>
              </div>
              <div className="divide-y divide-violet-100/60 max-h-48 overflow-y-auto pr-1">
                {sml.purchases.map((p) => (
                  <div key={p.docNo} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs font-bold text-slate-700">{p.docNo}</div>
                      <div className="text-[10px] font-semibold text-slate-450 mt-0.5">
                        {new Date(p.date).toLocaleDateString("lo-LA")} · {p.itemCount} ລາຍການ
                      </div>
                    </div>
                    <span className="shrink-0 font-extrabold text-xs text-violet-850">{formatKip(p.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Information */}
          {(profile?.phone || profile?.email) && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">ຂໍ້ມູນຕິດຕໍ່</h4>
              <div className="space-y-3">
                {profile?.phone && (
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-orange-50 text-orange-500 shrink-0">
                      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">ເບີໂທຕິດຕໍ່</div>
                      <div className="truncate text-xs font-bold text-slate-700">{profile.phone}</div>
                    </div>
                  </div>
                )}
                {profile?.email && (
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-500 shrink-0">
                      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">ອີເມວຕິດຕໍ່</div>
                      <div className="truncate text-xs font-bold text-slate-700">{profile.email}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column - Main Area (Span 8) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {TILES.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-100/80 bg-white px-3 py-4 text-center shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-md hover:shadow-orange-500/5 cursor-pointer"
              >
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-sm ${t.tone}`}>
                  <Icon d={t.icon} className="h-6 w-6" />
                </span>
                <div className="min-w-0 mt-1">
                  <div className="truncate text-xs font-bold text-slate-800">{t.label}</div>
                  <div className="truncate text-[9px] text-slate-400 font-extrabold mt-0.5 tracking-wide">{t.desc}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Stats Summary Strip */}
          <div className="grid grid-cols-3 gap-4">
            <Stat
              label="ຄຳສັ່ງຊື້ທັງໝົດ"
              value={orders.length.toLocaleString()}
              tone="bg-slate-50 text-slate-650"
              icon="M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z M9 8h6 M9 12h6"
            />
            <Stat
              label="ໃຊ້ຈ່າຍລວມ"
              value={`${formatKip(totalSpent)}`}
              tone="bg-emerald-50 text-emerald-600"
              icon="M4 7h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z M3 8l2-3h14l2 3 M16 13h1"
            />
            <Stat
              label="ຄະແນນສະສົມ"
              value={points.toLocaleString()}
              tone="bg-amber-50 text-amber-600"
              icon="M12 3l2.5 5.5 6 .6-4.5 4 1.3 5.9L12 21l-5.3 3 1.3-5.9-4.5-4 6-.6z"
            />
          </div>

          {/* Address book Widget */}
          <AddressBook initial={addresses} />

          {/* Order history */}
          <div
            id="orders"
            className="scroll-mt-20 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">ປະຫວັດການສັ່ງຊື້</h2>
            </div>

            {/* Segmented control tabs */}
            <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
              {ORDER_TABS.map((t) => {
                const on = t.key === tab;
                return (
                  <Link
                    key={t.key}
                    href={`/account?tab=${t.key}#orders`}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer ${
                      on
                        ? "bg-orange-500 text-white shadow-md shadow-orange-500/10"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    }`}
                  >
                    {t.label}
                    <span className={`ml-1 text-[10px] ${on ? "text-white/80" : "text-slate-400"}`}>
                      ({tabCount(t)})
                    </span>
                  </Link>
                );
              })}
            </div>

            {visibleOrders.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 shadow-inner">
                  <Icon
                    d="M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z M9 8h6 M9 12h6 M9 16h4"
                    className="h-7 w-7"
                  />
                </div>
                <p className="text-xs font-semibold text-slate-400">{tab === "all" ? "ຍັງບໍ່ມີປະຫວັດການສັ່ງຊື້" : "ບໍ່ມີອໍເດີໃນໝວດນີ້"}</p>
                <Link
                  href="/products"
                  className="mt-5 inline-block rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-950 hover:shadow-md cursor-pointer"
                >
                  ເລີ່ມຊ໊ອບປິ້ງ
                </Link>
              </div>
            ) : (
              <div className="space-y-3.5">
                {visibleOrders.map((o) => {
                  const canDelete = o.status === "pending" || o.status === "cancelled";
                  const awaitingPayment = o.status === "pending";
                  const canReorder = o.status === "completed" || o.status === "cancelled";
                  const canCancel = o.status === "cod";
                  return (
                    <div
                      key={o.orderNo}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-350 hover:border-orange-200 hover:shadow-md hover:shadow-orange-500/2"
                    >
                      <Link
                        href={`/order/${encodeURIComponent(o.orderNo)}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-800 text-sm tracking-tight hover:text-orange-550 transition">{o.orderNo}</span>
                          <StatusBadge status={o.status} />
                        </div>
                        <div className="mt-1.5 text-xs font-semibold text-slate-400 flex items-center gap-2">
                          <span>{o.itemCount} ລາຍການ</span>
                          <span className="h-1 w-1 rounded-full bg-slate-200" />
                          <span>{new Date(o.createdAt).toLocaleDateString("lo-LA")}</span>
                        </div>
                      </Link>

                      <div className="flex items-center justify-between w-full sm:w-auto gap-4 self-stretch sm:self-center border-t sm:border-t-0 border-slate-50 pt-3.5 sm:pt-0">
                        <div className="sm:text-right shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 block sm:hidden">ຍອດລວມ</span>
                          <div className="font-black text-price text-sm tracking-tight">{formatKip(o.subtotal)}</div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {canReorder && <ReorderButton orderNo={o.orderNo} />}
                          {canCancel && <CancelOrderButton orderNo={o.orderNo} />}
                          {awaitingPayment &&
                            (onepayMerchantConfigured() ? (
                              <PayButton
                                orderNo={o.orderNo}
                                amount={o.subtotal + o.shippingFee}
                                tracked={onepayEnabled()}
                              />
                            ) : (
                              <Link
                                href={`/order/${encodeURIComponent(o.orderNo)}`}
                                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-950 cursor-pointer"
                              >
                                ຊຳລະເງິນ
                              </Link>
                            ))}
                          {canDelete && <DeleteOrderButton orderNo={o.orderNo} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)] transition-all duration-300 hover:shadow-md hover:border-slate-200">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-all duration-300 ${tone}`}>
        <Icon d={icon} className="h-5.5 w-5.5" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-base font-black text-slate-800 tracking-tight sm:text-lg">
          {value}
        </div>
        <div className="truncate text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition hover:shadow-md">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="truncate font-bold text-slate-800 text-sm mt-1">{value}</div>
    </div>
  );
}
