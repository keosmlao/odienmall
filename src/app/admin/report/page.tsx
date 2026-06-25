import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import { getSalesReport } from "@/lib/orders";
import { getMostViewedProducts } from "@/lib/analytics";
import { STATUS_LABEL, ORDER_STATUSES } from "@/lib/order-constants";
import { formatKip } from "@/lib/format";
import StatCard from "@/components/admin/StatCard";
import { PageHeader, Card, CardTitle, Badge, EmptyState } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function SalesReportPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");
  const [r, mostViewed] = await Promise.all([
    getSalesReport(),
    getMostViewedProducts(10, 30),
  ]);
  const maxRev = Math.max(1, ...r.daily.map((d) => d.revenue));

  return (
    <div>
      <PageHeader title="ລາຍງານການຂາຍ" subtitle="ພາບລວມ 14 ວັນຫຼ້າສຸດ" />

      {/* Stat cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="ຄຳສັ່ງຊື້ທັງໝົດ"
          value={r.totalOrders.toLocaleString()}
          tone="brand"
          icon="M9 5h6M5 7h14l-1 13H6L5 7zM9 11v5M15 11v5"
        />
        <StatCard
          label="ລາຍຮັບລວມ"
          value={formatKip(r.revenue)}
          tone="green"
          accent
          icon="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        />
        <StatCard
          label="ຄ່າສະເລ່ຍ/ຄຳສັ່ງ"
          value={formatKip(r.avgOrderValue)}
          tone="blue"
          icon="M3 3v18h18M7 14l4-4 3 3 5-6"
        />
        <StatCard
          label="ສຳເລັດແລ້ວ"
          value={(r.byStatus.completed ?? 0).toLocaleString()}
          tone="amber"
          icon="M20 6L9 17l-5-5"
        />
      </div>

      {/* Daily revenue chart */}
      <Card className="mb-6">
        <CardTitle>ລາຍຮັບລາຍວັນ</CardTitle>
        {r.revenue === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">ຍັງບໍ່ມີຂໍ້ມູນການຂາຍ</p>
        ) : (
          <div className="flex h-40 items-end gap-1.5">
            {r.daily.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${formatKip(d.revenue)}`}>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-brand/80 transition hover:bg-brand"
                    style={{ height: `${Math.max(2, (d.revenue / maxRev) * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] text-gray-400">{d.label}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Status breakdown */}
      <div className="mb-6 flex flex-wrap gap-2">
        {ORDER_STATUSES.map((s) => (
          <Badge key={s} tone="gray">
            {STATUS_LABEL[s]}: <span className="font-bold text-gray-700">{r.byStatus[s] ?? 0}</span>
          </Badge>
        ))}
      </div>

      {/* Top products */}
      <Card>
        <CardTitle>ສິນຄ້າຂາຍດີ</CardTitle>
        {r.topProducts.length === 0 ? (
          <EmptyState title="ຍັງບໍ່ມີຂໍ້ມູນ" />
        ) : (
          <div className="divide-y divide-gray-100">
            {r.topProducts.map((p, i) => (
              <div key={p.productCode} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-light text-xs font-bold text-brand-dark">
                  {i + 1}
                </span>
                <Link
                  href={`/product/${encodeURIComponent(p.productCode)}`}
                  className="line-clamp-1 flex-1 text-gray-700 transition hover:text-brand-dark"
                >
                  {p.productName}
                </Link>
                <span className="shrink-0 text-gray-400">{p.qty} ໜ່ວຍ</span>
                <span className="w-28 shrink-0 text-right font-semibold text-price">
                  {formatKip(p.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Most-viewed products */}
      <Card className="mt-6">
        <CardTitle hint="30 ວັນຫຼ້າສຸດ">ສິນຄ້າທີ່ເບິ່ງຫຼາຍສຸດ</CardTitle>
        {mostViewed.length === 0 ? (
          <EmptyState title="ຍັງບໍ່ມີຂໍ້ມູນ" hint="ຂໍ້ມູນຈະສະສົມຫຼັງຈາກລູກຄ້າເຂົ້າເບິ່ງໜ້າສິນຄ້າ" />
        ) : (
          <div className="divide-y divide-gray-100">
            {mostViewed.map((p, i) => (
              <div key={p.productCode} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                  {i + 1}
                </span>
                <Link
                  href={`/product/${encodeURIComponent(p.productCode)}`}
                  className="line-clamp-1 flex-1 text-gray-700 transition hover:text-brand-dark"
                >
                  {p.name}
                </Link>
                <span className="shrink-0 font-mono text-[10px] text-gray-400">{p.productCode}</span>
                <span className="w-20 shrink-0 text-right font-semibold text-sky-600">
                  {p.views.toLocaleString()} ຄັ້ງ
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Sales by salesperson (ພະນັກງານຂາຍ) */}
      <Card className="mt-6">
        <CardTitle hint="ບໍ່ນັບບິນຍົກເລີກ">ຍອດຂາຍຕໍ່ພະນັກງານຂາຍ</CardTitle>
        {r.bySalesperson.length === 0 ? (
          <EmptyState title="ຍັງບໍ່ມີຂໍ້ມູນ" hint="ອໍເດີຍັງບໍ່ໄດ້ກຳນົດພະນັກງານຂາຍ" />
        ) : (
          <div className="divide-y divide-gray-100">
            {r.bySalesperson.map((s, i) => (
              <div key={s.saleCode} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                  {i + 1}
                </span>
                <Link
                  href={`/admin?sale=${encodeURIComponent(s.saleCode)}`}
                  className="line-clamp-1 flex-1 text-gray-700 transition hover:text-brand-dark"
                >
                  {s.saleName}
                </Link>
                <span className="shrink-0 text-gray-400">{s.orders} ບິນ</span>
                <span className="w-28 shrink-0 text-right font-semibold text-price">
                  {formatKip(s.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
