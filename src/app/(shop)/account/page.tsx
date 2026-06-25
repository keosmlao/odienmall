import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getCustomerProfile } from "@/lib/auth";
import { getOrdersByCustomer } from "@/lib/orders";
import { getBalance, getHistory, POINT_VALUE } from "@/lib/loyalty";
import { getCustomerTier, getMemberDiscountPct } from "@/lib/member-tier";
import { getSmlCustomerInsights } from "@/lib/sml-history";
import { getCustomerAddresses } from "@/lib/addresses";
import { onepayEnabled, onepayMerchantConfigured } from "@/lib/onepay";
import { formatKip } from "@/lib/format";
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

  const [profile, orders, addresses, pointBalance, pointHistory, sml, tier, memberPct] = await Promise.all([
    getCustomerProfile(session.code),
    getOrdersByCustomer(session.code),
    getCustomerAddresses(session.code),
    getBalance(session.code),
    getHistory(session.code, 8),
    getSmlCustomerInsights(session.code),
    getCustomerTier(session.code),
    getMemberDiscountPct(session.code),
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

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-sm bg-gradient-to-r from-orange-500 via-orange-500 to-rose-500 p-6 text-white shadow-lg">
        <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-xl font-bold uppercase ring-2 ring-white/30 backdrop-blur">
              {name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xl font-black leading-tight tracking-tight">{name}</div>
              <div className="text-[11px] font-medium text-white/70 mt-0.5">ລະຫັດລູກຄ້າ: {session.code}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold backdrop-blur tracking-wide">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                    <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
                  </svg>
                  ຄະແນນ {points.toLocaleString()} ₭
                </div>
                {tier && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-400/80 px-3 py-1 text-[10px] font-bold text-amber-900 backdrop-blur">
                    👑 {tier.name}
                    {memberPct > 0 && ` · ສ່ວນຫຼຸດ ${memberPct}%`}
                  </div>
                )}
                {!tier && memberPct > 0 && (
                  <div className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold backdrop-blur">
                    ສ່ວນຫຼຸດສະມາຊິກ {memberPct}%
                  </div>
                )}
              </div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>

      {/* Loyalty points (OdienMall) */}
      <div className="rounded-sm border border-amber-100 bg-amber-50/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-700">ແຕ້ມສະສົມ OdienMall</p>
            <p className="mt-0.5 text-2xl font-black text-amber-700">
              {pointBalance.toLocaleString()} <span className="text-sm font-bold">ແຕ້ມ</span>
            </p>
            <p className="text-[11px] text-amber-600/80">≈ {(pointBalance * POINT_VALUE).toLocaleString("lo-LA")} ₭ · ໃຊ້ຫຼຸດຕອນຊຳລະ</p>
          </div>
          <svg viewBox="0 0 24 24" className="h-12 w-12 text-amber-400" fill="currentColor">
            <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
          </svg>
        </div>
        {pointHistory.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-amber-100 pt-3 text-xs">
            {pointHistory.map((h) => (
              <li key={h.id} className="flex justify-between text-amber-700/90">
                <span>{h.reason === "earn" ? "ໄດ້ຮັບ" : h.reason === "redeem" ? "ໃຊ້" : "ປັບ"}{h.orderNo ? ` · ${h.orderNo}` : ""}</span>
                <span className={`font-bold ${h.delta >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                  {h.delta >= 0 ? "+" : ""}{h.delta.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Purchase history with ODG (from SML — all cash-sale bills) */}
      {sml.purchaseCount > 0 && (
        <div className="rounded-sm border border-violet-100 bg-violet-50/50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-violet-700">ປະຫວັດການຊື້ກັບ ODIEN (SML)</p>
              <p className="text-[11px] text-violet-600/80">
                {sml.purchaseCount.toLocaleString()} ບິນ · ລວມ {formatKip(sml.purchaseTotal)}
              </p>
            </div>
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-violet-300" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z M3 8l2-3h14l2 3 M9 12h6" />
            </svg>
          </div>
          <ul className="divide-y divide-violet-100 border-t border-violet-100 pt-1 text-sm">
            {sml.purchases.map((p) => (
              <li key={p.docNo} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs font-bold text-slate-700">{p.docNo}</div>
                  <div className="text-[11px] text-slate-400">
                    {new Date(p.date).toLocaleDateString("lo-LA")} · {p.itemCount} ລາຍການ
                  </div>
                </div>
                <span className="shrink-0 font-bold text-violet-700">{formatKip(p.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="ຄຳສັ່ງຊື້ທັງໝົດ"
          value={orders.length.toLocaleString()}
          tone="bg-slate-100 text-slate-800"
          icon="M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z M9 8h6 M9 12h6"
        />
        <Stat
          label="ໃຊ້ຈ່າຍລວມ"
          value={`${formatKip(totalSpent)}`}
          tone="bg-emerald-55/60 text-emerald-700"
          icon="M4 7h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z M3 8l2-3h14l2 3 M16 13h1"
        />
        <Stat
          label="ຄະແນນສະສົມ"
          value={points.toLocaleString()}
          tone="bg-amber-50 text-amber-700"
          icon="M12 3l2.5 5.5 6 .6-4.5 4 1.3 5.9L12 21l-5.3 3 1.3-5.9-4.5-4 6-.6z"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {TILES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group flex flex-col items-center gap-2 rounded-sm border border-slate-100 bg-white px-3 py-4 text-center shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-md"
          >
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105 ${t.tone}`}>
              <Icon d={t.icon} className="h-5.5 w-5.5" />
            </span>
            <div className="min-w-0 mt-1">
              <div className="truncate text-xs font-bold text-slate-800">{t.label}</div>
              <div className="truncate text-[10px] text-slate-400 font-semibold mt-0.5">{t.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Contact info */}
      {(profile?.phone || profile?.email) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {profile?.phone && <InfoRow label="ເບີໂທຕິດຕໍ່" value={profile.phone} />}
          {profile?.email && <InfoRow label="ອີເມວຕິດຕໍ່" value={profile.email} />}
        </div>
      )}

      {/* Address book */}
      <AddressBook initial={addresses} />

      {/* Order history */}
      <div
        id="orders"
        className="scroll-mt-24 rounded-sm border border-slate-100 bg-white p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">ປະຫວັດການສັ່ງຊື້</h2>
        </div>

        {/* Lazada-style status tabs */}
        <div className="mb-5 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
          {ORDER_TABS.map((t) => {
            const on = t.key === tab;
            return (
              <Link
                key={t.key}
                href={`/account?tab=${t.key}#orders`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  on ? "bg-brand text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {t.label}
                <span className={`ml-1 ${on ? "text-white/80" : "text-slate-400"}`}>({tabCount(t)})</span>
              </Link>
            );
          })}
        </div>

        {visibleOrders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-500">
              <Icon
                d="M7 3h10a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1z M9 8h6 M9 12h6 M9 16h4"
                className="h-7 w-7"
              />
            </div>
            <p className="text-sm font-medium text-slate-500">{tab === "all" ? "ຍັງບໍ່ມີປະຫວັດການສັ່ງຊື້" : "ບໍ່ມີອໍເດີໃນໝວດນີ້"}</p>
            <Link
              href="/products"
              className="mt-4 inline-block rounded-full bg-slate-900 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-950 hover:shadow-md"
            >
              ເລີ່ມຊ໊ອບປິ້ງ
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((o) => {
              const canDelete = o.status === "pending" || o.status === "cancelled";
              const awaitingPayment = o.status === "pending";
              const canReorder = o.status === "completed" || o.status === "cancelled";
              const canCancel = o.status === "cod";
              return (
                <div
                  key={o.orderNo}
                  className="flex items-stretch gap-2 rounded-2xl border border-slate-100 bg-white transition hover:border-slate-350 hover:shadow-[0_2px_12px_rgba(0,0,0,0.015)]"
                >
                  <Link
                    href={`/order/${encodeURIComponent(o.orderNo)}`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm tracking-tight">{o.orderNo}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="mt-1 text-[11px] font-semibold text-slate-400">
                        {o.itemCount} ລາຍການ ·{" "}
                        {new Date(o.createdAt).toLocaleDateString("lo-LA")}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-extrabold text-price text-sm">{formatKip(o.subtotal)}</div>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-700 mt-0.5 block">ເບິ່ງລາຍລະອຽດ ›</span>
                    </div>
                  </Link>
                  {(awaitingPayment || canDelete || canReorder || canCancel) && (
                    <div className="flex items-center gap-2 pr-4 pl-2 border-l border-slate-50">
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
                            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-950"
                          >
                            ຊຳລະເງິນ
                          </Link>
                        ))}
                      {canDelete && <DeleteOrderButton orderNo={o.orderNo} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition hover:shadow-md sm:p-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon d={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-base font-black text-slate-900 tracking-tight sm:text-lg">
          {value}
        </div>
        <div className="truncate text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</div>
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
