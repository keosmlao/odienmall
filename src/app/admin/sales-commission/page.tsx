import { redirect } from "next/navigation";
import { isAdmin, isManager, listSalespeople } from "@/lib/auth";
import { getCommissionDefault, getCommissionOverrides, getCommissionEarners } from "@/lib/sales-link";
import { PageHeader, Card, CardTitle, BTN_SECONDARY } from "@/components/admin/ui";
import CommissionManager from "@/components/admin/CommissionManager";
import CommissionPayouts from "@/components/admin/CommissionPayouts";
import { formatKip } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminSalesCommissionPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");
  const [defaultRate, overrides, salespeople, earners] = await Promise.all([
    getCommissionDefault(),
    getCommissionOverrides(),
    listSalespeople(),
    getCommissionEarners(),
  ]);

  // Aggregate stats
  const totalEarned = earners.reduce((sum, e) => sum + e.earnedAll, 0);
  const totalPaid = earners.reduce((sum, e) => sum + e.paid, 0);
  const totalOutstanding = earners.reduce((sum, e) => sum + e.outstanding, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ຄອມມິສຊັນພະນັກງານຂາຍ"
        subtitle="ອັດຕາມາດຕະຖານ + ກຳນົດສະເພາະຄົນ — ຄິດຈາກອໍເດີທີ່ຈັດສົ່ງສຳເລັດ"
        actions={
          earners.length > 0 ? (
            <a href="/admin/sales-commission/export" className={BTN_SECONDARY}>ດາວໂຫຼດ CSV</a>
          ) : undefined
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 lg:grid-cols-4">
        {/* Standard Rate */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-slate-400" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">ອັດຕາມາດຕະຖານ</span>
            <span className="rounded-lg bg-slate-50 p-1.5 text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900 leading-none">{defaultRate || 0} <span className="text-xs font-semibold text-slate-500">%</span></div>
        </div>

        {/* Total Earned */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 shadow-sm sm:p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">ຄອມມິສຊັນສະສົມ</span>
            <span className="rounded-lg bg-emerald-100/70 text-emerald-700 p-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-850 leading-none truncate" title={formatKip(totalEarned)}>
            {formatKip(totalEarned)}
          </div>
        </div>

        {/* Total Paid */}
        <div className="relative overflow-hidden rounded-xl border border-cyan-100 bg-cyan-50/20 p-4 shadow-sm sm:p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-cyan-500" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-800">ຈ່າຍແລ້ວທັງໝົດ</span>
            <span className="rounded-lg bg-cyan-100 text-cyan-700 p-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-cyan-850 leading-none truncate" title={formatKip(totalPaid)}>
            {formatKip(totalPaid)}
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="relative overflow-hidden rounded-xl border border-rose-100 bg-rose-50/20 p-4 shadow-sm sm:p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-rose-500" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">ຍອດຄ້າງຈ່າຍທັງໝົດ</span>
            <span className={`rounded-lg bg-rose-100 text-rose-700 p-1.5 ${totalOutstanding > 0 ? "animate-pulse" : ""}`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-rose-900 leading-none truncate" title={formatKip(totalOutstanding)}>
            {formatKip(totalOutstanding)}
          </div>
        </div>
      </div>

      {/* Main Two Column Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Commission Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardTitle hint="ຄິດຈາກຍອດທີ່ສຳເລັດ (ຈັດສົ່ງແລ້ວ)">ຕັ້ງຄ່າຄອມມິສຊັນ</CardTitle>
            <CommissionManager defaultRate={defaultRate} overrides={overrides} options={salespeople} />
          </Card>
        </div>

        {/* Right Column: Earnings Ledger */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardTitle hint="ໄດ້ຮັບ − ຈ່າຍແລ້ວ = ຄ້າງ">ການຈ່າຍຄອມມິສຊັນ</CardTitle>
            <CommissionPayouts earners={earners} />
          </Card>
        </div>
      </div>
    </div>
  );
}
