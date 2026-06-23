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

  return (
    <div>
      <PageHeader title="ພາບລວມ" subtitle="ສະຫຼຸບການຂາຍ, ຜູ້ເຂົ້າຊົມ ແລະ ວຽກທີ່ລໍຖ້າ" />

      {/* Live + today */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OnlineNow initial={visits.online} />
        {manager && (
          <StatCard label="ລາຍຮັບມື້ນີ້" value={formatKip(todayRevenue)} icon={ICON.money} tone="green" accent />
        )}
        <StatCard label="ອໍເດີມື້ນີ້" value={String(todayOrders)} icon={ICON.cart} tone="brand" />
        <StatCard label="ຜູ້ເຂົ້າມື້ນີ້" value={visits.todayVisitors.toLocaleString("en-US")} icon={ICON.users} tone="blue" hint={`${visits.todayViews.toLocaleString("en-US")} ການເບິ່ງ`} />
      </div>

      {/* Totals */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {manager && (
          <StatCard label="ລາຍຮັບລວມ" value={formatKip(report.revenue)} icon={ICON.money} tone="green" accent hint={`ສະເລ່ຍ/ບິນ ${formatKip(report.avgOrderValue)}`} />
        )}
        <StatCard label="ອໍເດີທັງໝົດ" value={String(stats.total)} icon={ICON.cart} tone="brand" />
        <StatCard label="ລໍຖ້າດຳເນີນການ" value={String(pendingWork)} icon={ICON.clock} tone="amber" />
        <Link href="/admin/products?low=1">
          <StatCard label="ສະຕັອກໜ້ອຍ (≤5)" value={String(products.lowStock)} icon={ICON.alert} tone={products.lowStock > 0 ? "amber" : "slate"} />
        </Link>
      </div>

      {/* Action items */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <ActionCard href="/admin/returns" label="ຄືນສິນຄ້າລໍຖ້າ" count={returnsN} tone="rose" />
        <ActionCard href="/admin/qna" label="ຄຳຖາມລໍຖ້າຕອບ" count={qnaN} tone="amber" />
        <ActionCard href="/admin/chat" label="ຂໍ້ຄວາມຍັງບໍ່ອ່ານ" count={chatN} tone="blue" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Revenue chart (manager) or order status (staff) */}
        {manager ? (
          <Card>
            <h2 className="mb-4 text-sm font-bold text-slate-900">ລາຍຮັບ 14 ມື້ຫຼ້າສຸດ</h2>
            {report.daily.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">ຍັງບໍ່ມີຂໍ້ມູນ</p>
            ) : (
              <div className="flex items-end gap-1.5" style={{ height: 160 }}>
                {report.daily.map((d) => (
                  <div key={d.day} className="group flex flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-orange-400 to-orange-300 transition group-hover:from-orange-500"
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
            <h2 className="text-sm font-bold text-slate-900">ອໍເດີລ່າສຸດ</h2>
            <Link href="/admin" className="text-xs font-semibold text-orange-600 hover:underline">ທັງໝົດ ›</Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">ຍັງບໍ່ມີອໍເດີ</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((o) => (
                <li key={o.orderNo}>
                  <Link href={`/admin/orders/${encodeURIComponent(o.orderNo)}`} className="flex items-center justify-between gap-2 py-2.5 transition hover:bg-slate-50">
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
      {manager && report.topProducts.length > 0 && (
        <Card className="mt-5">
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
    </div>
  );
}

function ActionCard({ href, label, count, tone }: { href: string; label: string; count: number; tone: string }) {
  const active = count > 0;
  const tones: Record<string, string> = {
    rose: active ? "border-rose-200 bg-rose-50 text-rose-700" : "",
    amber: active ? "border-amber-200 bg-amber-50 text-amber-700" : "",
    blue: active ? "border-blue-200 bg-blue-50 text-blue-700" : "",
  };
  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 shadow-sm transition hover:shadow-md ${
        active ? tones[tone] : "border-slate-100 bg-white text-slate-500"
      }`}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-sm font-black ${active ? "bg-white/70" : "bg-slate-100 text-slate-400"}`}>
        {count}
      </span>
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
