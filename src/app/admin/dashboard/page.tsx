import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import {
  getAllOrders,
  getOrderStats,
  getSalesReport,
  type OrderStatus,
} from "@/lib/orders";
import { getVisitStats, getMostViewedProducts } from "@/lib/analytics";
import { getAdminProductStats } from "@/lib/products-admin";
import { countPendingReturns } from "@/lib/returns";
import { countOpenQuestions } from "@/lib/qna";
import { getTotalUnread } from "@/lib/chat";
import { formatKip } from "@/lib/format";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { PageHeader, Card } from "@/components/admin/ui";
import OnlineNow from "../analytics/OnlineNow";
import { getAuditLog } from "@/lib/audit";
import { getSalesTargets } from "@/lib/sales-link";
import { getAdminReviewStats } from "@/lib/reviews-admin";
import { getAffiliateSummary } from "@/lib/affiliates";
import AdminPushButton from "@/components/admin/AdminPushButton";

export const dynamic = "force-dynamic";

const ICON = {
  cart: "M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L22 7H6",
  money: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  box: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  clock: "M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
};

export default async function AdminOverview() {
  if (!(await isAdmin())) redirect("/admin/login");
  const manager = await isManager();

  const [report, stats, visits, products, returnsN, qnaN, chatN, recent, audit, targets, mostViewed, reviewStats, affiliateSummary] = await Promise.all([
    getSalesReport(),
    getOrderStats(),
    getVisitStats(),
    getAdminProductStats(),
    countPendingReturns().catch(() => 0),
    countOpenQuestions().catch(() => 0),
    getTotalUnread().catch(() => 0),
    getAllOrders({}).then((o) => o.slice(0, 8)).catch(() => []),
    getAuditLog({ pageSize: 6 }).catch(() => ({ items: [], total: 0 })),
    getSalesTargets().catch(() => []),
    getMostViewedProducts(5, 7).catch(() => []),
    getAdminReviewStats().catch(() => ({ total: 0, hidden: 0, avg: 0 })),
    manager ? getAffiliateSummary().catch(() => ({ active: 0, pending: 0, unpaidAmount: 0 })) : Promise.resolve({ active: 0, pending: 0, unpaidAmount: 0 }),
  ]);

  const todayBucket = report.daily[report.daily.length - 1];
  const todayRevenue = todayBucket?.revenue ?? 0;
  const todayOrders = todayBucket?.orders ?? 0;
  const yesterdayBucket = report.daily[report.daily.length - 2];
  const yesterdayRevenue = yesterdayBucket?.revenue ?? 0;
  const revDeltaPct = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : null;
  const conversionRate = visits.todayVisitors > 0 ? (todayOrders / visits.todayVisitors) * 100 : 0;

  // Orders still needing staff action
  const awaitingBill = stats.byStatus.awaiting_confirmation ?? 0;
  const codPending = stats.byStatus.cod ?? 0;
  const pendingWork =
    (stats.byStatus.cod ?? 0) +
    (stats.byStatus.awaiting_confirmation ?? 0) +
    (stats.byStatus.paid ?? 0) +
    (stats.byStatus.pending ?? 0);

  const maxRev = Math.max(1, ...report.daily.map((d) => d.revenue));
  const topActions = [
    { href: "/admin", label: "ອໍເດີລໍຖ້າ", count: pendingWork, tone: "amber" },
    { href: "/admin/chat", label: "ແຊັດຍັງບໍ່ອ່ານ", count: chatN, tone: "blue" },
    { href: "/admin/qna", label: "ຄຳຖາມລໍຖ້າ", count: qnaN, tone: "green" },
    { href: "/admin/returns", label: "ຄືນສິນຄ້າ", count: returnsN, tone: "rose" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ພາບລວມ"
        subtitle="ເບິ່ງວຽກດ່ວນ, ຍອດມື້ນີ້ ແລະສະຖານະຮ້ານໃນໜ້າດຽວ"
        actions={
          <>
            <AdminPushButton />
            <Link href="/admin/orders/new" className="inline-flex h-10 items-center justify-center rounded-xl bg-[linear-gradient(90deg,#0f172a,#f97316)] px-4 text-sm font-black text-white transition hover:brightness-110 shadow-sm shadow-orange-500/20">
              + ສ້າງອໍເດີ
            </Link>
            <Link href="/admin/chat" className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 shadow-sm">
              ເປີດແຊັດ
            </Link>
          </>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-xl">
          {/* Top brand gradient strip */}
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#f97316,#22c55e,#06b6d4,#e11d48)]" />
          
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">Today pulse</div>
              <div className="mt-3 text-3xl font-black leading-tight sm:text-4xl drop-shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                {manager ? formatKip(todayRevenue) : `${todayOrders.toLocaleString("en-US")} ອໍເດີ`}
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-350">
                {todayOrders.toLocaleString("en-US")} ອໍເດີມື້ນີ້ · {visits.todayVisitors.toLocaleString("en-US")} ຜູ້ເຂົ້າຊົມ · {visits.online.toLocaleString("en-US")} online
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[28rem]">
              {topActions.map((a) => (
                <ActionPill key={a.href} {...a} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <OnlineNow initial={visits.online} />
          <Link href="/admin/products?low=1" className="block transition hover:-translate-y-0.5">
            <StatCard label="ສະຕັອກໜ້ອຍ" value={String(products.lowStock)} icon={ICON.alert} tone={products.lowStock > 0 ? "amber" : "slate"} hint="≤5 ຊິ້ນ" />
          </Link>
        </div>
      </section>

      {/* Quick Metrics Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {manager && (
          <div className={`rounded-2xl border px-4 py-3 ${revDeltaPct === null ? "border-slate-100 bg-white" : revDeltaPct >= 0 ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50"}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ລາຍຮັບ vs ມື້ວານ</p>
            <p className="mt-1.5 text-lg font-black text-slate-900">{formatKip(todayRevenue)}</p>
            <p className={`mt-0.5 text-xs font-bold ${revDeltaPct === null ? "text-slate-400" : revDeltaPct >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {revDeltaPct === null ? "ຍັງບໍ່ມີຂໍ້ມູນ" : `${revDeltaPct >= 0 ? "▲" : "▼"} ${Math.abs(revDeltaPct).toFixed(1)}% · ມື້ວານ ${formatKip(yesterdayRevenue)}`}
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Conversion Rate</p>
          <p className="mt-1.5 text-lg font-black text-slate-900">{conversionRate.toFixed(1)}<span className="text-sm font-semibold text-slate-500">%</span></p>
          <p className="mt-0.5 text-xs font-bold text-blue-600">{todayOrders} ອໍເດີ ÷ {visits.todayVisitors.toLocaleString("en-US")} ຜູ້ເຂົ້າ</p>
        </div>
        <Link href="/admin?status=awaiting_confirmation" className="block transition hover:-translate-y-0.5">
          <div className={`h-full rounded-2xl border px-4 py-3 ${awaitingBill > 0 ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-white"}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ລໍຖ້າ ອອກBill</p>
            <p className={`mt-1.5 text-lg font-black ${awaitingBill > 0 ? "text-amber-700" : "text-slate-400"}`}>{awaitingBill} <span className="text-sm font-semibold">ອໍເດີ</span></p>
            <p className="mt-0.5 text-xs font-bold text-slate-400">COD ລໍຖ້າ: {codPending}</p>
          </div>
        </Link>
        <Link href="/admin/reviews" className="block transition hover:-translate-y-0.5">
          <div className="h-full rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ລີວິວລູກຄ້າ</p>
            <p className="mt-1.5 text-lg font-black text-slate-900">{reviewStats.total} <span className="text-sm font-semibold text-slate-500">ລີວິວ</span></p>
            <p className="mt-0.5 text-xs font-bold text-violet-600">
              ⭐ {Number(reviewStats.avg).toFixed(1)}{reviewStats.hidden > 0 ? ` · ${reviewStats.hidden} ຊ່ອນ` : " · ທັງໝົດ visible"}
            </p>
          </div>
        </Link>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {manager && (
          <StatCard
            label="ລາຍຮັບລວມ"
            value={formatKip(report.revenue)}
            icon={ICON.money}
            tone="green"
            accent
            hint={`ສະເລ່ຍ/ບິນ ${formatKip(report.avgOrderValue)}`}
          />
        )}
        <StatCard label="ອໍເດີທັງໝົດ" value={String(stats.total)} icon={ICON.cart} tone="brand" />
        <StatCard label="ລໍຖ້າດຳເນີນການ" value={String(pendingWork)} icon={ICON.clock} tone="amber" />
        <StatCard
          label="ຜູ້ເຂົ້າມື້ນີ້"
          value={visits.todayVisitors.toLocaleString("en-US")}
          icon={ICON.users}
          tone="blue"
          hint={`${visits.todayViews.toLocaleString("en-US")} views`}
        />
      </div>

      {/* Main Dashboard Details (2 Column Grid) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (Main Charts/Orders list) - spans 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Chart (manager) or Order Status (staff) */}
          {manager ? (
            <Card>
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-black text-slate-955">ລາຍຮັບ 14 ມື້ຜ່ານມາ</h2>
                  <p className="mt-0.5 text-xs text-slate-400 font-semibold">ແຜນພູມສະແດງລາຍຮັບ ແລະ ຍອດຂາຍລາຍວັນ</p>
                </div>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 border border-emerald-100 text-xs font-black text-emerald-700">
                  ຍອດລວມ: {formatKip(report.revenue)}
                </span>
              </div>
              {report.daily.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">ຍັງບໍ່ມີຂໍ້ມູນ</p>
              ) : (
                <div className="flex items-end gap-2.5 pt-4" style={{ height: 180 }}>
                  {report.daily.map((d) => {
                    const isPeak = d.revenue === maxRev && maxRev > 0;
                    return (
                      <div key={d.day} className="group flex flex-1 flex-col items-center justify-end gap-1.5 h-full">
                        {/* Interactive Bar with Tooltip */}
                        <div className="relative w-full flex flex-col justify-end items-center h-[140px] group/bar">
                          {/* Tooltip */}
                          <div className="pointer-events-none absolute bottom-full mb-2 hidden flex-col items-center group-hover/bar:flex z-10">
                            <div className="rounded-lg bg-slate-955 px-2 py-1.5 text-[10px] font-black text-white shadow-xl whitespace-nowrap border border-slate-800">
                              <div>{formatKip(d.revenue)}</div>
                              <div className="text-[9px] text-slate-400 mt-0.5 text-center">{d.orders} ອໍເດີ</div>
                            </div>
                            <div className="h-1.5 w-1.5 rotate-45 bg-slate-955 -mt-1 border-r border-b border-slate-800" />
                          </div>
                          
                          <div
                            className={`w-full rounded-t-lg transition-all duration-300 ${
                              isPeak 
                                ? "bg-gradient-to-t from-orange-500 to-amber-400 shadow-md shadow-orange-500/20" 
                                : "bg-gradient-to-t from-slate-200 to-slate-350 group-hover/bar:from-orange-400 group-hover/bar:to-amber-300"
                            }`}
                            style={{ 
                              height: `${Math.round((d.revenue / maxRev) * 110)}px`, 
                              minHeight: d.revenue > 0 ? 4 : 0 
                            }}
                          />
                        </div>
                        <span className={`text-[9px] font-bold tracking-wider ${isPeak ? 'text-orange-655 font-black' : 'text-slate-400'}`}>
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <h2 className="mb-4 text-base font-black text-slate-955">ສະຖານະອໍເດີ</h2>
              <StatusBreakdown byStatus={stats.byStatus} total={stats.total} />
            </Card>
          )}

          {/* Recent Orders */}
          <Card>
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-955">ອໍເດີຫຼ້າສຸດ</h2>
                <p className="mt-0.5 text-xs text-slate-400 font-semibold">ລາຍການຄຳສັ່ງຊື້ 8 ລາຍການຫຼ້າສຸດ</p>
              </div>
              <Link href="/admin" className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700 hover:bg-orange-100 transition">
                ເບິ່ງທັງໝົດ
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">ຍັງບໍ່ມີອໍເດີ</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((o) => (
                  <li key={o.orderNo}>
                    <Link href={`/admin/orders/${encodeURIComponent(o.orderNo)}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50/60">
                      <span className="min-w-0 flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 border border-slate-100 text-slate-500 font-mono text-[10px] font-black">
                          {o.orderNo.slice(-4)}
                        </span>
                        <span className="min-w-0 leading-tight">
                          <span className="block truncate text-xs font-bold text-slate-800">{o.orderNo}</span>
                          <span className="block truncate text-[11px] text-slate-400 font-semibold mt-0.5">{o.customerName}</span>
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-xs font-black text-price">{formatKip(o.subtotal + o.shippingFee)}</span>
                        <StatusBadge status={o.status as OrderStatus} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right Column (Sidebar Widgets) */}
        <div className="space-y-6">
          {/* Most-Viewed Products — all admins */}
          <Card>
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-955">ສິນຄ້າເບິ່ງຫຼາຍ</h2>
                <p className="mt-0.5 text-xs text-slate-400 font-semibold">Top 5 ໃນ 7 ວັນຜ່ານມາ</p>
              </div>
              <Link href="/admin/report" className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-black text-violet-700 hover:bg-violet-100 transition">ລາຍງານ</Link>
            </div>
            {mostViewed.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">ຍັງບໍ່ມີຂໍ້ມູນ</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {mostViewed.map((p, i) => (
                  <li key={p.productCode} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-50 border border-violet-100 text-[10px] font-black text-violet-600">{i + 1}</span>
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate font-bold text-slate-700">{p.name}</span>
                        <span className="block font-mono text-[10px] text-slate-400">{p.productCode}</span>
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 font-black text-violet-700">{p.views} ຄັ້ງ</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Affiliate Summary — manager only */}
          {manager && (
            <Card>
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-black text-slate-955">ນາຍໜ້າ (Affiliate)</h2>
                  <p className="mt-0.5 text-xs text-slate-400 font-semibold">ສະຫຼຸບຍອດ affiliate</p>
                </div>
                <Link href="/admin/affiliates" className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-black text-slate-500 hover:bg-slate-100 transition">ຈັດການ</Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-center">
                  <p className="text-2xl font-black text-emerald-700">{affiliateSummary.active}</p>
                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-600">Active</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-center">
                  <p className="text-2xl font-black text-amber-700">{affiliateSummary.pending}</p>
                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-amber-600">ລໍຖ້າ</p>
                </div>
              </div>
              {affiliateSummary.unpaidAmount > 0 && (
                <div className="mt-3 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5">
                  <p className="text-xs font-semibold text-rose-500">ຄ່ານາຍໜ້າລໍຖ້າຈ່າຍ</p>
                  <p className="mt-0.5 text-base font-black text-rose-700">{formatKip(affiliateSummary.unpaidAmount)}</p>
                </div>
              )}
            </Card>
          )}

          {/* Salesperson Targets (Leaderboard) - manager only */}
          {manager && (
            <Card>
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-black text-slate-955">ເປົ້າຍອດຂາຍພະນັກງານ</h2>
                  <p className="mt-0.5 text-xs text-slate-400 font-semibold">ຜົນງານ ແລະ ເປົ້າໝາຍໃນເດືອນນີ້</p>
                </div>
                <Link href="/admin/sales-targets" className="rounded-lg bg-orange-50 px-2 py-1 text-xs font-black text-orange-700 hover:bg-orange-100 transition">
                  ຈັດການ
                </Link>
              </div>
              {targets.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">ຍັງບໍ່ມີຂໍ້ມູນເປົ້າໝາຍ</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {targets.slice(0, 5).map((t, i) => (
                    <li key={t.saleCode} className="py-3 text-xs space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-600">
                            {i + 1}
                          </span>
                          <Link href={`/admin?sale=${encodeURIComponent(t.saleCode)}`} className="truncate font-black text-slate-700 hover:text-orange-600 transition-colors">
                            {t.saleName}
                          </Link>
                        </div>
                        <div className="text-right leading-none">
                          <span className="font-extrabold text-slate-800">{formatKip(t.revenueMonth)}</span>
                          {t.monthlyTarget > 0 && (
                            <span className="text-[9px] text-slate-450 block font-semibold mt-1">
                              ເປົ້າ: {formatKip(t.monthlyTarget)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {t.monthlyTarget > 0 && (
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-50 border border-slate-100/50">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${
                                t.pct >= 100 ? "from-emerald-500 to-teal-500" : "from-orange-500 to-amber-500"
                              }`}
                              style={{ width: `${Math.min(100, t.pct)}%` }}
                            />
                          </div>
                          <span className={`w-8 shrink-0 text-right font-black text-[10px] ${
                            t.pct >= 100 ? "text-emerald-600" : "text-orange-600"
                          }`}>
                            {t.pct}%
                          </span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* Recent Audit Log (Activity Feed) - manager only */}
          {manager && (
            <Card>
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-black text-slate-955">ບັນທຶກການເຄື່ອນໄຫວ</h2>
                  <p className="mt-0.5 text-xs text-slate-400 font-semibold">ການເຄື່ອນໄຫວຫຼ້າສຸດໃນລະບົບ</p>
                </div>
                <Link href="/admin/audit" className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-500 hover:bg-slate-100 transition">
                  ທັງໝົດ
                </Link>
              </div>
              {audit.items.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">ຍັງບໍ່ມີການເຄື່ອນໄຫວ</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {audit.items.map((entry) => (
                    <li key={entry.id} className="py-3 text-xs leading-relaxed">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-slate-800">{entry.actorName || "ລະບົບ"}</span>
                        <span className="text-[9px] text-slate-400 font-semibold">
                          {new Date(entry.createdAt).toLocaleTimeString("lo-LA", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-500 font-semibold">
                        <span className="rounded bg-slate-50 border border-slate-100 px-1 py-0.5 text-[8.5px] font-black text-slate-600 mr-1.5 uppercase tracking-wide">
                          {entry.action}
                        </span>
                        {entry.detail || entry.entity}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* Top Selling Products - manager only */}
          {manager && report.topProducts.length > 0 && (
            <Card>
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-black text-slate-955">ສິນຄ້າຂາຍດີ</h2>
                  <p className="mt-0.5 text-xs text-slate-400 font-semibold">ສິນຄ້າທີ່ຂາຍດີທີ່ສຸດໃນລະບົບ</p>
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {report.topProducts.slice(0, 5).map((p, i) => (
                  <li key={p.productCode} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange-50 border border-orange-100 text-[10px] font-black text-orange-600">
                        {i + 1}
                      </span>
                      <span className="truncate text-slate-700 font-bold">{p.productName}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-semibold">{p.qty} ອັນ</span>
                      <span className="font-extrabold text-slate-700">{formatKip(p.revenue)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionPill({ href, label, count, tone }: { href: string; label: string; count: number; tone: string }) {
  const active = count > 0;
  const tones: Record<string, string> = {
    rose: active ? "bg-rose-500 text-white" : "bg-white/10 text-slate-350",
    amber: active ? "bg-amber-400 text-slate-955" : "bg-white/10 text-slate-355",
    blue: active ? "bg-cyan-400 text-slate-955" : "bg-white/10 text-slate-355",
    green: active ? "bg-lime-400 text-slate-955" : "bg-white/10 text-slate-355",
  };
  return (
    <Link
      href={href}
      className={`rounded-xl px-3 py-3 transition hover:scale-[1.02] ${tones[tone]}`}
    >
      <span className="block text-2xl font-black leading-none">{count}</span>
      <span className="mt-1.5 block text-[10px] font-black uppercase tracking-wide">{label}</span>
    </Link>
  );
}

function StatusBreakdown({ byStatus, total }: { byStatus: Record<string, number>; total: number }) {
  const order: OrderStatus[] = ["pending", "cod", "awaiting_confirmation", "paid", "shipping", "completed", "cancelled"];
  const rows = order.filter((s) => (byStatus[s] ?? 0) > 0);
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-slate-400">ຍັງບໍ່ມີອໍເດີ</p>;
  return (
    <div className="space-y-3">
      {rows.map((s) => {
        const n = byStatus[s] ?? 0;
        return (
          <div key={s} className="flex items-center gap-3 text-xs">
            <span className="w-28 shrink-0"><StatusBadge status={s} /></span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-slate-50 border border-slate-100/50">
              <div className="h-full rounded bg-slate-350" style={{ width: `${Math.round((n / Math.max(1, total)) * 100)}%`, minWidth: 2 }} />
            </div>
            <span className="w-10 shrink-0 text-right font-bold text-slate-700">{n}</span>
          </div>
        );
      })}
    </div>
  );
}
