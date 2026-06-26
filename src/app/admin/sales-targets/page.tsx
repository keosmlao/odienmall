import { redirect } from "next/navigation";
import { isAdmin, isManager, listSalespeople } from "@/lib/auth";
import { getSalesTargets, currentMonth } from "@/lib/sales-link";
import { firstParam } from "@/lib/params";
import { PageHeader, Card, CardTitle, EmptyState } from "@/components/admin/ui";
import SalesTargetRow from "@/components/admin/SalesTargetRow";
import AddSalesTarget from "@/components/admin/AddSalesTarget";
import MonthNav from "@/components/admin/MonthNav";
import { formatKip } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function AdminSalesTargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");
  const sp = await searchParams;
  const raw = firstParam(sp.month) || "";
  const month = MONTH_RE.test(raw) ? raw : currentMonth();

  const [targets, salespeople] = await Promise.all([getSalesTargets(month), listSalespeople()]);

  // Aggregate metrics
  const totalTarget = targets.reduce((sum, t) => sum + t.monthlyTarget, 0);
  const totalAchieved = targets.reduce((sum, t) => sum + t.revenueMonth, 0);
  const progressPct = totalTarget > 0 ? Math.min(100, Math.round((totalAchieved / totalTarget) * 100)) : 0;
  const staffWithTargets = targets.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ເປົ້າຍອດຂາຍ"
        subtitle="ກຳນົດເປົ້າຕາມເດືອນ ໃຫ້ພະນັກງານຂາຍເທື່ອລະຄົນ ແລະ ຕິດຕາມຄວາມຄືບໜ້າ"
        actions={<MonthNav month={month} />}
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 lg:grid-cols-4">
        {/* Total Target */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-slate-400" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">ເປົ້າໝາຍລວມ ({month})</span>
            <span className="rounded-lg bg-slate-50 p-1.5 text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 leading-none truncate" title={formatKip(totalTarget)}>
            {formatKip(totalTarget)}
          </div>
        </div>

        {/* Total Achieved */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 shadow-sm sm:p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">ຍອດຂາຍທີ່ເຮັດໄດ້</span>
            <span className="rounded-lg bg-emerald-100/70 text-emerald-700 p-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-850 leading-none truncate" title={formatKip(totalAchieved)}>
            {formatKip(totalAchieved)}
          </div>
        </div>

        {/* Progress Rate */}
        <div className="relative overflow-hidden rounded-xl border border-cyan-100 bg-cyan-50/20 p-4 shadow-sm sm:p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-cyan-500" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-800">ອັດຕາຄວາມສຳເລັດ</span>
            <span className="rounded-lg bg-cyan-100 text-cyan-700 p-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-cyan-850 leading-none">{progressPct} <span className="text-xs font-semibold text-cyan-500">%</span></div>
        </div>

        {/* Staff active */}
        <div className="relative overflow-hidden rounded-xl border border-amber-100 bg-amber-50/20 p-4 shadow-sm sm:p-5">
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">ພະນັກງານຂາຍທີ່ມີເປົ້າ</span>
            <span className="rounded-lg bg-amber-100 text-amber-800 p-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 025.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-950 leading-none">{staffWithTargets} <span className="text-xs font-semibold text-amber-600">ຄົນ</span></div>
        </div>
      </div>

      {/* Split grid layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Add Sales Target */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardTitle>ເພີ່ມເປົ້າ</CardTitle>
            <AddSalesTarget options={salespeople} defaultMonth={month} />
          </Card>
        </div>

        {/* Right Column: Active Targets Progress */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardTitle hint={`ຍອດ vs ເປົ້າ — ${month}`}>ເປົ້າເດືອນ {month}</CardTitle>
            {targets.length === 0 ? (
              <EmptyState title="ຍັງບໍ່ໄດ້ກຳນົດເປົ້າສຳລັບເດືອນນີ້" hint="ເພີ່ມເປົ້າໃຫ້ພະນັກງານຂາຍຂ້າງເທິງ" />
            ) : (
              <div className="divide-y divide-slate-100">
                {targets.map((s) => (
                  <SalesTargetRow
                    key={s.saleCode}
                    saleCode={s.saleCode}
                    saleName={s.saleName}
                    month={month}
                    monthlyTarget={s.monthlyTarget}
                    revenueMonth={s.revenueMonth}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
