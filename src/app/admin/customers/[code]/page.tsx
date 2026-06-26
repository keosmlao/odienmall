import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin, getCustomerProfile } from "@/lib/auth";
import { getOrdersByCustomer } from "@/lib/orders";
import { getCustomerTier, autoUpgradeTier } from "@/lib/member-tier";
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

  const [profile, orders, currentTier, customerNotes, tierProgress] = await Promise.all([
    getCustomerProfile(customerCode),
    getOrdersByCustomer(customerCode),
    getCustomerTier(customerCode),
    getCustomerNotes(customerCode),
    autoUpgradeTier(customerCode),
  ]);

  // Reachable only via the customers list, so an order history must exist even
  // if the ERP profile lookup misses — fall back to the order data.
  if (!profile && orders.length === 0) notFound();

  const name = profile?.name ?? customerCode;
  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.subtotal, 0);

  let progressPct = 0;
  let remainingSpend = 0;
  if (tierProgress) {
    const { spend, nextSpend } = tierProgress;
    if (nextSpend && nextSpend > 0) {
      progressPct = Math.min(100, Math.max(0, (spend / nextSpend) * 100));
      remainingSpend = Math.max(0, nextSpend - spend);
    } else {
      progressPct = 100;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title={name}
        back={{ href: "/admin/customers", label: "ກັບໄປລາຍຊື່ລູກຄ້າ" }}
      />

      <Card>
        {/* Customer Information Grid */}
        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium w-16">ລະຫັດ:</span>
            <span className="font-mono font-bold text-slate-800">{customerCode}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium w-16">ເບີໂທ:</span>
            <span className="font-bold text-slate-800">{profile?.phone ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium w-16">ອີເມວ:</span>
            <span className="font-semibold text-slate-800 truncate">{profile?.email ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium w-16">ກຸ່ມ:</span>
            <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 shadow-sm">
              Member
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-5 flex gap-8 border-t border-slate-100 pt-5 text-sm">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">ຈຳນວນອໍເດີ</div>
            <div className="mt-1 text-2xl font-black text-slate-900 tabular-nums">{orders.length}</div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">ຍອດໃຊ້ຈ່າຍທັງໝົດ</div>
            <div className="mt-1 text-2xl font-black text-price tabular-nums">{formatKip(totalSpent)}</div>
          </div>
        </div>

        {/* Loyalty Points & Member Tier Progress Bar section */}
        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
          {/* Point Balance box */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600/85">ຄະແນນສະສົມ (Points)</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-amber-700 tabular-nums">
                  {profile ? profile.pointBalance.toLocaleString() : 0}
                </span>
                <span className="text-xs font-bold text-amber-600">ແຕ້ມ</span>
              </div>
              <p className="text-[9px] font-semibold text-slate-400">ຄະແນນສະສົມປັດຈຸບັນໃນລະບົບ ERP</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100/50 text-amber-600 border border-amber-200 shadow-inner">
              <svg className="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Level upgrade progression box */}
          <div className="rounded-xl border border-slate-150 bg-slate-50/50 p-4 flex flex-col justify-between shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">ລະດັບສະມາຊິກ (Tier)</span>
                {tierProgress && (
                  <span className="rounded bg-orange-50 border border-orange-100 px-2 py-0.5 text-[9px] font-black text-orange-600 shadow-xs">
                    ສ່ວນຫຼຸດ {tierProgress.discountPct}%
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-slate-800 flex flex-wrap items-center gap-1.5">
                <span className="font-extrabold">{tierProgress?.name || currentTier?.name || "Member"}</span>
                {tierProgress?.nextName && (
                  <span className="text-[9px] text-slate-400 font-semibold">
                    ➔ ລະດັບຖັດໄປ: {tierProgress.nextName}
                  </span>
                )}
              </div>
            </div>

            {tierProgress && tierProgress.nextSpend ? (
              <div className="mt-3 space-y-1">
                {/* Progress bar */}
                <div className="relative h-2 w-full rounded-full bg-slate-200 overflow-hidden shadow-inner">
                  <div 
                    className="absolute top-0 bottom-0 left-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 ease-out" 
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 tabular-nums">
                  <span>{formatKip(tierProgress.spend)}</span>
                  <span>{formatKip(tierProgress.nextSpend)}</span>
                </div>
                <p className="text-[9.5px] font-semibold text-slate-500 leading-tight">
                  ຍອດຊື້ສະສົມ: ອີກ <span className="font-bold text-orange-600">{formatKip(remainingSpend)}</span> ເພື່ອຂຶ້ນລະດັບ {tierProgress.nextName}
                </p>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <span>✦ ລະດັບສູງສຸດແລ້ວ</span>
                </span>
                <span className="text-[9.5px] font-semibold text-slate-400">
                  (ຍອດຊື້ສະສົມ {formatKip(tierProgress?.spend ?? 0)})
                </span>
              </div>
            )}
          </div>
        </div>
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
