import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import {
  getAllOrders,
  getOrderStats,
  getSalesReport,
  type OrderStatus,
} from "@/lib/orders";
import { getVisitStats } from "@/lib/analytics";
import { getAdminProductStats } from "@/lib/products-admin";
import { countPendingReturns } from "@/lib/returns";
import { countOpenQuestions } from "@/lib/qna";
import { getTotalUnread } from "@/lib/chat";
import { formatKip } from "@/lib/format";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { PageHeader, Card } from "@/components/admin/ui";
import OnlineNow from "../analytics/OnlineNow";

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

  const [report, stats, visits, products, returnsN, qnaN, chatN, recent] = await Promise.all([
    getSalesReport(),
    getOrderStats(),
    getVisitStats(),
    getAdminProductStats(),
    countPendingReturns().catch(() => 0),
    countOpenQuestions().catch(() => 0),
    getTotalUnread().catch(() => 0),
    getAllOrders({}).then((o) => o.slice(0, 8)).catch(() => []),
  ]);

  const todayBucket = report.daily[report.daily.length - 1];
  const todayRevenue = todayBucket?.revenue ?? 0;
  const todayOrders = todayBucket?.orders ?? 0;
  // Orders still needing staff action (not shipped/completed/cancelled).
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
    <div className="space-y-5">
      <PageHeader
        title="ພາບລວມ"
        subtitle="ເບິ່ງວຽກດ່ວນ, ຍອດມື້ນີ້ ແລະສະຖານະຮ້ານໃນໜ້າດຽວ"
        actions={
          <>
            <Link href="/admin/orders/new" className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-orange-600">
              + ສ້າງອໍເດີ
            </Link>
            <Link href="/admin/chat" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700">
              ເປີດແຊັດ
            </Link>
          </>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="relative overflow-hidden rounded-lg bg-slate-950 p-5 text-white shadow-xl shadow-slate-900/10">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#f97316,#22c55e,#06b6d4,#e11d48)]" />
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Today pulse</div>
              <div className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                {manager ? formatKip(todayRevenue) : `${todayOrders.toLocaleString("en-US")} ອໍເດີ`}
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-300">
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
          <Link href="/admin/products?low=1" className="block">
            <StatCard label="ສະຕັອກໜ້ອຍ" value={String(products.lowStock)} icon={ICON.alert} tone={products.lowStock > 0 ? "amber" : "slate"} hint="≤5 ຊິ້ນ" />
          </Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {manager && <StatCard label="ລາຍຮັບລວມ" value={formatKip(report.revenue)} icon={ICON.money} tone="green" accent hint={`ສະເລ່ຍ/ບິນ ${formatKip(report.avgOrderValue)}`} />}
        <StatCard label="ອໍເດີທັງໝົດ" value={String(stats.total)} icon={ICON.cart} tone="brand" />
        <StatCard label="ລໍຖ້າດຳເນີນການ" value={String(pendingWork)} icon={ICON.clock} tone="amber" />
        <StatCard label="ຜູ້ເຂົ້າມື້ນີ້" value={visits.todayVisitors.toLocaleString("en-US")} icon={ICON.users} tone="blue" hint={`${visits.todayViews.toLocaleString("en-US")} views`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Revenue chart (manager) or order status (staff) */}
        {manager ? (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-950">ລາຍຮັບ 14 ມື້</h2>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">{formatKip(report.revenue)}</span>
            </div>
            {report.daily.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">ຍັງບໍ່ມີຂໍ້ມູນ</p>
            ) : (
              <div className="flex items-end gap-1.5" style={{ height: 160 }}>
                {report.daily.map((d) => (
                  <div key={d.day} className="group flex flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className="w-full rounded-t-md bg-[linear-gradient(180deg,#22c55e,#f97316)] transition group-hover:brightness-110"
                      style={{ height: `${Math.round((d.revenue / maxRev) * 130)}px`, minHeight: d.revenue > 0 ? 3 : 0 }}
                      title={`${d.label}: ${formatKip(d.revenue)} · ${d.orders} ບິນ`}
                    />
                    <span className="text-[9px] text-slate-400">{d.label.slice(-2)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <h2 className="mb-4 text-sm font-bold text-slate-900">ສະຖານະອໍເດີ</h2>
            <StatusBreakdown byStatus={stats.byStatus} total={stats.total} />
          </Card>
        )}

        {/* Recent orders */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-950">ອໍເດີລ່າສຸດ</h2>
            <Link href="/admin" className="rounded-md bg-orange-50 px-2 py-1 text-xs font-black text-orange-700 hover:bg-orange-100">ທັງໝົດ</Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">ຍັງບໍ່ມີອໍເດີ</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((o) => (
                <li key={o.orderNo}>
                  <Link href={`/admin/orders/${encodeURIComponent(o.orderNo)}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2.5 transition hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-slate-700">{o.orderNo}</span>
                      <span className="block truncate text-[11px] text-slate-400">{o.customerName}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs font-bold text-price">{formatKip(o.subtotal + o.shippingFee)}</span>
                      <StatusBadge status={o.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Top products (manager) */}
      {manager && (report.topProducts.length > 0 || report.bySalesperson.length > 0) && (
        <div className="grid gap-5 lg:grid-cols-2">
          {report.topProducts.length > 0 && (
            <Card>
              <h2 className="mb-3 text-sm font-bold text-slate-900">ສິນຄ້າຂາຍດີ</h2>
              <ul className="divide-y divide-slate-100">
                {report.topProducts.slice(0, 6).map((p, i) => (
                  <li key={p.productCode} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange-50 text-xs font-bold text-orange-600">{i + 1}</span>
                      <span className="truncate text-slate-700">{p.productName}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-slate-400">{p.qty} ອັນ</span>
                      <span className="font-semibold text-slate-700">{formatKip(p.revenue)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {report.bySalesperson.length > 0 && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">ພະນັກງານຂາຍດີເດັ່ນ</h2>
                <Link href="/admin/report" className="text-xs font-semibold text-brand-dark hover:underline">ທັງໝົດ ›</Link>
              </div>
              <ul className="divide-y divide-slate-100">
                {report.bySalesperson.slice(0, 6).map((s, i) => (
                  <li key={s.saleCode} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{i + 1}</span>
                      <Link href={`/admin?sale=${encodeURIComponent(s.saleCode)}`} className="truncate text-slate-700 hover:text-brand-dark">{s.saleName}</Link>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-slate-400">{s.orders} ບິນ</span>
                      <span className="font-semibold text-slate-700">{formatKip(s.revenue)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ActionPill({ href, label, count, tone }: { href: string; label: string; count: number; tone: string }) {
  const active = count > 0;
  const tones: Record<string, string> = {
    rose: active ? "bg-rose-500 text-white" : "bg-white/10 text-slate-300",
    amber: active ? "bg-amber-400 text-slate-950" : "bg-white/10 text-slate-300",
    blue: active ? "bg-cyan-400 text-slate-950" : "bg-white/10 text-slate-300",
    green: active ? "bg-lime-400 text-slate-950" : "bg-white/10 text-slate-300",
  };
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-3 transition hover:scale-[1.02] ${tones[tone]}`}
    >
      <span className="block text-2xl font-black leading-none">{count}</span>
      <span className="mt-1 block text-[10px] font-black uppercase tracking-wide">{label}</span>
    </Link>
  );
}

function StatusBreakdown({ byStatus, total }: { byStatus: Record<string, number>; total: number }) {
  const order: OrderStatus[] = ["pending", "cod", "awaiting_confirmation", "paid", "shipping", "completed", "cancelled"];
  const rows = order.filter((s) => (byStatus[s] ?? 0) > 0);
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-slate-400">ຍັງບໍ່ມີອໍເດີ</p>;
  return (
    <div className="space-y-2">
      {rows.map((s) => {
        const n = byStatus[s] ?? 0;
        return (
          <div key={s} className="flex items-center gap-3 text-xs">
            <span className="w-28 shrink-0"><StatusBadge status={s} /></span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
              <div className="h-full rounded bg-slate-300" style={{ width: `${Math.round((n / Math.max(1, total)) * 100)}%`, minWidth: 2 }} />
            </div>
            <span className="w-10 shrink-0 text-right font-bold text-slate-700">{n}</span>
          </div>
        );
      })}
    </div>
  );
}
