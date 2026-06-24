import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin, isManager, getCustomerProfile } from "@/lib/auth";
import { getOrdersByCustomer } from "@/lib/orders";
import { listMemberTiers, getCustomerTier } from "@/lib/member-tier";
import { getSmlCustomerInsights } from "@/lib/customers-admin";
import { formatKip } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import CustomerTierControl from "@/components/admin/CustomerTierControl";
import type { OrderStatus } from "@/lib/order-constants";
import { PageHeader, Card, CardTitle, EmptyState } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetail({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { code } = await params;
  const customerCode = decodeURIComponent(code);

  const [profile, orders, tiers, currentTier, manager, sml] = await Promise.all([
    getCustomerProfile(customerCode),
    getOrdersByCustomer(customerCode),
    listMemberTiers(),
    getCustomerTier(customerCode),
    isManager(),
    getSmlCustomerInsights(customerCode),
  ]);

  // Reachable only via the customers list, so an order history must exist even
  // if the ERP profile lookup misses — fall back to the order data.
  if (!profile && orders.length === 0) notFound();

  const name = profile?.name ?? customerCode;
  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.subtotal, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={name}
        back={{ href: "/admin/customers", label: "ກັບໄປລາຍຊື່ລູກຄ້າ" }}
      />

      <Card>
        <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
          <div><span className="text-gray-400">ລະຫັດ: </span>{customerCode}</div>
          <div><span className="text-gray-400">ເບີໂທ: </span>{profile?.phone ?? "—"}</div>
          <div><span className="text-gray-400">ອີເມວ: </span>{profile?.email ?? "—"}</div>
          {profile && (
            <div><span className="text-gray-400">ຄະແນນສະສົມ: </span>{profile.pointBalance.toLocaleString()}</div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-sm sm:grid-cols-4">
          <div>
            <div className="text-gray-400">ຄະແນນສະສົມ (SML)</div>
            <div className="text-lg font-black text-violet-600">{sml.pointBalance.toLocaleString("en-US")}</div>
          </div>
          <div>
            <div className="text-gray-400">ຊື້ກັບ SML</div>
            <div className="text-lg font-bold text-gray-900">{sml.purchaseCount} ບິນ</div>
          </div>
          <div>
            <div className="text-gray-400">ຍອດຊື້ SML</div>
            <div className="text-lg font-bold text-price">{formatKip(sml.purchaseTotal)}</div>
          </div>
          <div>
            <div className="text-gray-400">ອໍເດີເວັບ</div>
            <div className="text-lg font-bold text-gray-900">{orders.length} · {formatKip(totalSpent)}</div>
          </div>
        </div>
        {manager && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="mb-2 text-sm font-semibold text-gray-700">
              ລະດັບສະມາຊິກ (ສ່ວນຫຼຸດ){currentTier ? ` — ${currentTier.name} ${currentTier.discountPct}%` : ""}
            </div>
            <CustomerTierControl customerCode={customerCode} current={currentTier?.code ?? null} tiers={tiers} />
          </div>
        )}
      </Card>

      <div className="mt-5">
        <Card>
          <CardTitle>ປະຫວັດການສັ່ງຊື້</CardTitle>
          {orders.length === 0 ? (
            <EmptyState title="ຍັງບໍ່ມີອໍເດີ" />
          ) : (
            <div className="divide-y divide-gray-100">
              {orders.map((o) => (
                <Link
                  key={o.orderNo}
                  href={`/admin/orders/${encodeURIComponent(o.orderNo)}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition hover:bg-brand-light/40"
                >
                  <div>
                    <div className="font-semibold text-brand-dark">{o.orderNo}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(o.createdAt).toLocaleDateString("lo-LA")} · {o.itemCount} ລາຍການ
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status as OrderStatus} />
                    <span className="font-semibold text-gray-700">{formatKip(o.subtotal)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Full purchase history from SML (all cash-sale bills, not just web) */}
      <div className="mt-5">
        <Card>
          <CardTitle hint="ບິນຂາຍສົດ (flag 44) ຈາກ ERP">ປະຫວັດການຊື້ ກັບ SML</CardTitle>
          {sml.purchases.length === 0 ? (
            <EmptyState title="ບໍ່ພົບປະຫວັດການຊື້ໃນ SML" />
          ) : (
            <div className="divide-y divide-gray-100">
              {sml.purchases.map((p) => (
                <div key={p.docNo} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <div className="font-mono font-semibold text-slate-700">{p.docNo}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(p.date).toLocaleDateString("lo-LA")} · {p.itemCount} ລາຍການ
                    </div>
                  </div>
                  <span className="font-semibold text-price">{formatKip(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
