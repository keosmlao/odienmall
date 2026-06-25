import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin, isManager, getCustomerProfile } from "@/lib/auth";
import { getOrdersByCustomer } from "@/lib/orders";
import { getCustomerTier } from "@/lib/member-tier";
import { getCustomerNotes } from "@/lib/customer-notes";
import { formatKip } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import CustomerNotesPanel from "@/components/admin/CustomerNotesPanel";
import type { OrderStatus } from "@/lib/order-constants";
import { PageHeader, Card, CardTitle, EmptyState } from "@/components/admin/ui";
import { addCustomerNoteAction, deleteCustomerNoteAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetail({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { code } = await params;
  const customerCode = decodeURIComponent(code);

  const [profile, orders, currentTier, manager, customerNotes] = await Promise.all([
    getCustomerProfile(customerCode),
    getOrdersByCustomer(customerCode),
    getCustomerTier(customerCode),
    isManager(),
    getCustomerNotes(customerCode),
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
        <div className="mt-4 flex gap-6 border-t border-gray-100 pt-4 text-sm">
          <div>
            <div className="text-gray-400">ຈຳນວນອໍເດີ</div>
            <div className="text-lg font-bold text-gray-900">{orders.length}</div>
          </div>
          <div>
            <div className="text-gray-400">ຍອດໃຊ້ຈ່າຍ</div>
            <div className="text-lg font-bold text-price">{formatKip(totalSpent)}</div>
          </div>
        </div>
        {currentTier && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="text-sm text-gray-500">
              ລະດັບສະມາຊິກ:{" "}
              <span className="font-semibold text-gray-900">
                {currentTier.name}
                {currentTier.discountPct > 0 && ` · ສ່ວນຫຼຸດ ${currentTier.discountPct}%`}
              </span>
              <span className="ml-2 text-xs text-gray-400">(ຈາກ ERP)</span>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-5">
        <Card>
          <CardTitle hint="ໝາຍເຫດພາຍໃນ ຫຼື ການລະບຸ VIP/ບລ໋ອກ/ຂາຍສົ່ງ (ບໍ່ສະແດງໃຫ້ລູກຄ້າ)">ໝາຍເຫດ / ແຟລ໋ກ</CardTitle>
          <CustomerNotesPanel
            customerCode={customerCode}
            initial={customerNotes}
            addNote={addCustomerNoteAction}
            deleteNote={deleteCustomerNoteAction}
          />
        </Card>
      </div>

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
    </div>
  );
}
