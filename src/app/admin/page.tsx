import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import {
  getAllOrders,
  getOrderStats,
  getOrdersMissingSmlDoc,
  ORDER_STATUSES,
  STATUS_LABEL,
  type OrderStatus,
} from "@/lib/orders";
import { firstParam } from "@/lib/params";
import { formatKip } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/admin/StatCard";
import SmlBackfillBanner from "@/components/admin/SmlBackfillBanner";
import DeleteOrderAdminButton from "@/components/DeleteOrderAdminButton";
import SendOrderLinkButton from "@/components/SendOrderLinkButton";
import { Badge, PageHeader, EmptyState, TableShell, THEAD, TH, TBODY, TR, TD } from "@/components/admin/ui";
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
  const [orders, stats, missingSml] = await Promise.all([
    getAllOrders({ status, search: q, from, to }),
    getOrderStats(),
    getOrdersMissingSmlDoc(),
  ]);

  // Status chips preserve the search/date filters; export uses everything.
  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (from) baseParams.set("from", from);
  if (to) baseParams.set("to", to);
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
    <div>
      <PageHeader title="ຈັດການຄຳສັ່ງຊື້" subtitle="ລາຍການບິນຂາຍ SML (CAE) ຂອງ order ທີ່ສ້າງຈາກ web ນີ້" />

      {missingSml.length > 0 && <SmlBackfillBanner count={missingSml.length} />}

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="ຄຳສັ່ງຊື້ທັງໝົດ"
          value={stats.total.toLocaleString()}
          tone="brand"
          icon="M9 5h6M5 7h14l-1 13H6L5 7zM9 11v5M15 11v5"
        />
        <StatCard
          label="ລາຍຮັບ"
          value={formatKip(stats.revenue)}
          tone="green"
          accent
          icon="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        />
        <StatCard
          label="ລໍຖ້າດຳເນີນການ"
          value={(stats.byStatus.pending ?? 0).toLocaleString()}
          tone="amber"
          icon="M12 7v5l3 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"
        />
        <StatCard
          label="ສຳເລັດແລ້ວ"
          value={(stats.byStatus.completed ?? 0).toLocaleString()}
          tone="blue"
          icon="M20 6L9 17l-5-5"
        />
      </div>

      {/* Search + date range + CSV export */}
      <OrderFilters status={status} search={q} from={from} to={to} exportHref={exportHref} />

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        <FilterChip href={chipHref()} label={`ທັງໝົດ (${stats.total})`} active={!status} />
        {ORDER_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={chipHref(s)}
            label={`${STATUS_LABEL[s]} (${stats.byStatus[s] ?? 0})`}
            active={status === s}
          />
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="ບໍ່ມີບິນ SML"
          hint="ສະແດງສະເພາະ order ທີ່ຂຽນລົງ SML (ic_trans) ແລ້ວ — ຖ້າ order ມີແຕ່ຍັງບໍ່ຂຶ້ນ ໃຫ້ກົດ ‘ສ້າງໃບ SML’ ຂ້າງເທິງ"
          icon="M9 5h6M5 7h14l-1 13H6L5 7zM9 11v5M15 11v5"
        />
      ) : (
        <TableShell minWidth={1100}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>ເລກບິນ SML</th>
              <th className={TH}>ໃບ SML</th>
              <th className={TH}>ລູກຄ້າ</th>
              <th className={TH}>ເບີໂທ</th>
              <th className={TH}>ລາຍການ</th>
              <th className={`${TH} text-right`}>ລວມ</th>
              <th className={TH}>ສະຖານະ</th>
              <th className={TH}>ວັນທີ</th>
              <th className={`${TH} text-right`}></th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {orders.map((o) => (
              <tr key={o.orderNo} className={TR}>
                <td className={`${TD} whitespace-nowrap`}>
                  <Link
                    href={`/admin/orders/${encodeURIComponent(o.orderNo)}`}
                    className="font-mono font-semibold text-brand-dark hover:underline"
                  >
                    {o.smlDocNo}
                  </Link>
                  <div className="text-xs text-gray-400">{o.orderNo}</div>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <Badge tone={o.smlFlag === 44 ? "green" : "amber"}>
                    {o.smlFlag === 44 ? "ບິນສົດ (44)" : "ໃບສັ່ງຊື້ (34)"}
                  </Badge>
                </td>
                <td className={`${TD} min-w-40 font-medium text-gray-700`}>
                  {o.customerName}
                  {o.createdBy && (
                    <span className="ml-1.5 rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">ພະນັກງານ</span>
                  )}
                </td>
                <td className={`${TD} whitespace-nowrap`}>{o.phone}</td>
                <td className={`${TD} whitespace-nowrap`}>{o.itemCount}</td>
                <td className={`${TD} whitespace-nowrap text-right font-semibold text-price`}>
                  {formatKip(o.subtotal)}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <StatusBadge status={o.status as OrderStatus} />
                </td>
                <td className={`${TD} whitespace-nowrap text-gray-400`}>
                  {new Date(o.createdAt).toLocaleDateString("lo-LA")}
                </td>
                <td className={`${TD} whitespace-nowrap text-right`}>
                  <div className="inline-flex items-center gap-1.5">
                    <SendOrderLinkButton orderNo={o.orderNo} phone={o.phone} />
                    <DeleteOrderAdminButton orderNo={o.orderNo} compact />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 font-medium ring-1 ring-inset transition ${
        active
          ? "bg-brand text-white ring-brand"
          : "bg-white text-gray-600 ring-gray-200 hover:border-brand hover:text-brand-dark"
      }`}
    >
      {label}
    </Link>
  );
}
