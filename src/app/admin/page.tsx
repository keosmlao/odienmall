import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin, listSalespeople, getSalesScope } from "@/lib/auth";
import {
  getAllOrders,
  getOrderStats,
  getOrdersMissingSmlDoc,
  ORDER_STATUSES,
  STATUS_LABEL,
  type OrderStatus,
} from "@/lib/orders";
import { getMonthlyKpi, currentMonth } from "@/lib/sales-link";
import { firstParam } from "@/lib/params";
import { formatKip } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/admin/StatCard";
import SmlBackfillBanner from "@/components/admin/SmlBackfillBanner";
import DeleteOrderAdminButton from "@/components/DeleteOrderAdminButton";
import SendOrderLinkButton from "@/components/SendOrderLinkButton";
import OrderBulkTable from "@/components/admin/OrderBulkTable";
import OrderItemsList from "@/components/admin/OrderItemsList";
import { Badge, PageHeader, EmptyState, ButtonLink, Card } from "@/components/admin/ui";
import OrderFilters from "./OrderFilters";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const sp = await searchParams;
  const status = firstParam(sp.status) || "";
  const q = firstParam(sp.q)?.trim() || "";
  const from = firstParam(sp.from) || "";
  const to = firstParam(sp.to) || "";

  // Staff see only their own sales; managers see everything (and may filter).
  const scope = await getSalesScope();
  const sale = scope.all ? firstParam(sp.sale) || "" : scope.saleCode || "";
  const [orders, stats, missingSml, salespeople, monthlyKpi] = await Promise.all([
    getAllOrders({ status, search: q, from, to, saleCode: sale }),
    getOrderStats(sale || undefined),
    getOrdersMissingSmlDoc(),
    scope.all ? listSalespeople() : Promise.resolve([]),
    scope.all ? getMonthlyKpi() : Promise.resolve(null),
  ]);

  // Status chips preserve the search/date filters; export uses everything.
  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (from) baseParams.set("from", from);
  if (to) baseParams.set("to", to);
  if (sale) baseParams.set("sale", sale);
  const chipHref = (s?: string) => {
    const p = new URLSearchParams(baseParams);
    if (s) p.set("status", s);
    const qs = p.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };
  const exportParams = new URLSearchParams(baseParams);
  if (status) exportParams.set("status", status);
  const exportHref = `/admin/orders/export${exportParams.toString() ? `?${exportParams}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ຈັດການຄຳສັ່ງຊື້"
        subtitle={scope.all ? "ບິນຂາຍ SML (CAE) ຈາກ web" : "ສະແດງສະເພາະຍອດຂາຍຂອງທ່ານ"}
        actions={
          <ButtonLink href="/admin/orders/new" variant="primary">
            + ສ້າງອໍເດີ
          </ButtonLink>
        }
      />

      {missingSml.length > 0 && <SmlBackfillBanner count={missingSml.length} />}

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 lg:grid-cols-4">
        <StatCard label="ຄຳສັ່ງຊື້ທັງໝົດ" value={stats.total.toLocaleString()} tone="brand" icon="M9 5h6M5 7h14l-1 13H6L5 7zM9 11v5M15 11v5" />
        <StatCard label="ລາຍຮັບ" value={formatKip(stats.revenue)} tone="green" accent icon="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        <StatCard label="ລໍຖ້າດຳເນີນການ" value={(stats.byStatus.pending ?? 0).toLocaleString()} tone="amber" icon="M12 7v5l3 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" />
        <StatCard label="ສຳເລັດແລ້ວ" value={(stats.byStatus.completed ?? 0).toLocaleString()} tone="blue" icon="M20 6L9 17l-5-5" />
      </div>

      {/* Monthly revenue KPI gauge (managers only, when targets are set) */}
      {monthlyKpi && monthlyKpi.target > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700">
              ລາຍຮັບປະຈຳເດືອນ{" "}
              <span className="font-normal text-gray-400">{monthlyKpi.month}</span>
            </span>
            <span className="font-bold text-gray-900">
              {formatKip(monthlyKpi.revenue)}{" "}
              <span className="font-normal text-gray-400">/ {formatKip(monthlyKpi.target)}</span>
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all"
              style={{ width: `${Math.min(100, Math.round((monthlyKpi.revenue / monthlyKpi.target) * 100))}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
            <span>{Math.round((monthlyKpi.revenue / monthlyKpi.target) * 100)}% ຂອງເປົ້າໝາຍ</span>
            <a href="/admin/sales-targets" className="text-brand hover:underline">ຕັ້ງເປົ້າໝາຍ →</a>
          </div>
        </div>
      )}

      {/* Search + date range + salesperson + CSV export */}
      <OrderFilters status={status} search={q} from={from} to={to} sale={sale} salespeople={salespeople} exportHref={exportHref} />

      {/* Status filter chips */}
          <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1.5 text-sm shadow-sm sm:mx-0 sm:w-fit sm:flex-wrap sm:overflow-visible">
        <FilterChip href={chipHref()} label="ທັງໝົດ" count={stats.total} active={!status} />
        {ORDER_STATUSES.map((s) => (
          <FilterChip key={s} href={chipHref(s)} label={STATUS_LABEL[s]} count={stats.byStatus[s] ?? 0} active={status === s} />
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="ບໍ່ມີຄຳສັ່ງຊື້"
          hint="ບໍ່ພົບອໍເດີຕາມເງື່ອນໄຂທີ່ກັ່ນຕອງ — ລອງລ້າງຕົວກັ່ນຕອງ ຫຼື ສ້າງອໍເດີໃໝ່"
          icon="M9 5h6M5 7h14l-1 13H6L5 7zM9 11v5M15 11v5"
        />
      ) : (
        <>
          {/* Mobile View (Stack of Cards) */}
          <div className="space-y-4 lg:hidden">
            {orders.map((o) => (
              <MobileOrderCard key={o.orderNo} o={o} />
            ))}
          </div>

          {/* Desktop View (Unified SaaS Table with bulk select) */}
          <div className="hidden lg:block">
            <OrderBulkTable orders={orders} />
          </div>
        </>
      )}
    </div>
  );
}

type OrderRow = Awaited<ReturnType<typeof getAllOrders>>[number];

function MobileOrderCard({ o }: { o: OrderRow }) {
  const detailHref = `/admin/orders/${encodeURIComponent(o.orderNo)}`;
  const initial = (o.customerName || "?").trim().slice(0, 1).toUpperCase();

  return (
    <article className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-300 hover:shadow-md sm:p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#f97316,#22c55e,#06b6d4)]" />
      {/* Header Block */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <Link href={detailHref} className="font-mono text-sm font-black text-slate-800 hover:underline">
            {o.smlDocNo || o.orderNo}
          </Link>
          {o.smlDocNo && o.smlDocNo !== o.orderNo && (
            <div className="font-mono text-[10px] text-slate-500 mt-0.5 truncate">{o.orderNo}</div>
          )}
        </div>
        <Badge tone={o.smlFlag === 44 ? "green" : o.smlFlag === 34 ? "amber" : "gray"}>
          {o.smlFlag === 44 ? "ບິນສົດ 44" : o.smlFlag === 34 ? "ໃບສັ່ງຊື້ 34" : "ລໍຖ້າ"}
        </Badge>
      </div>

      {/* Customer Detail Card */}
      <div className="mt-3.5 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[linear-gradient(135deg,#f97316,#22c55e)] text-[9px] font-black uppercase text-white">
            {initial}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800 text-[11px] truncate block">{o.customerName}</span>
              {o.createdBy && (
                <span className="shrink-0 rounded bg-violet-50 px-1 py-0.5 text-[8px] font-bold text-violet-600 leading-none">ພະນັກງານ</span>
              )}
            </div>
          </div>
        </div>
        <a href={`tel:${o.phone}`} className="text-[11px] font-semibold text-slate-550 hover:text-orange-500 transition-colors">
          {o.phone || "—"}
        </a>
      </div>

      {/* Product Preview */}
      <div className="mt-3.5 min-w-0">
        <OrderItemsList items={o.items} itemCount={o.itemCount} />
      </div>

      {/* Status & Price Row */}
      <div className="mt-3.5 flex items-center justify-between pt-3 border-t border-slate-100">
        <div>
          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">ຍອດລວມ</div>
          <div className="text-[15px] font-black text-price">{formatKip(o.subtotal)}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">ສະຖານະ</div>
          <StatusBadge status={o.status as OrderStatus} />
        </div>
      </div>

      {/* Meta Info Row */}
      <div className="mt-3.5 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100/70 pt-2.5">
        <div>ພະນັກງານຂາຍ: <span className="font-bold text-slate-600">{o.saleName || "—"}</span></div>
        <div>{new Date(o.createdAt).toLocaleDateString("lo-LA")}</div>
      </div>

      {/* Actions Button Bar */}
      <div className="mt-3.5 flex items-center gap-2 pt-2.5 border-t border-slate-100/70">
        <Link
          href={detailHref}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-white transition hover:bg-orange-600"
        >
          ເບິ່ງລາຍລະອຽດ
        </Link>
        <SendOrderLinkButton orderNo={o.orderNo} phone={o.phone} />
        <DeleteOrderAdminButton orderNo={o.orderNo} compact />
      </div>
    </article>
  );
}

function FilterChip({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-black transition ${
        active
          ? "border-slate-200 bg-white text-slate-900"
          : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
      }`}
    >
      {label}
      <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${active ? "bg-white/15 text-slate-900/90" : "bg-slate-100 text-slate-500"}`}>
        {count}
      </span>
    </Link>
  );
}
