import { redirect } from "next/navigation";
import { isAdmin, getAdminSession } from "@/lib/auth";
import { getSalespersonStats, getCommissionEarnedMonth } from "@/lib/sales-link";
import { formatKip } from "@/lib/format";
import { PageHeader, Card, CardTitle } from "@/components/admin/ui";
import SalesLinkBuilder from "@/components/admin/SalesLinkBuilder";
import StatCard from "@/components/admin/StatCard";

export const dynamic = "force-dynamic";

export default async function AdminSalesLinkPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const [stats, commission] = await Promise.all([
    getSalespersonStats(admin.code),
    getCommissionEarnedMonth(admin.code),
  ]);

  const tiles = [
    {
      label: "ຄລິກລິ້ງ (30 ວັນ)",
      value: stats.clicks30d.toLocaleString(),
      tone: "blue",
      icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5",
    },
    {
      label: "ອໍເດີເດືອນນີ້",
      value: stats.ordersMonth.toLocaleString(),
      tone: "amber",
      icon: "M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L22 7H6",
    },
    {
      label: "ຍອດຂາຍເດືອນນີ້",
      value: formatKip(stats.revenueMonth),
      tone: "brand",
      accent: true,
      icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    },
    {
      label: commission.rate > 0 ? `ຄອມເດືອນນີ້ (${commission.rate}%)` : "ຄອມເດືອນນີ້",
      value: formatKip(commission.earned),
      tone: "green",
      icon: "M19 5L5 19M6.5 9.5a3 3 0 100-6 3 3 0 000 6zm11 11a3 3 0 100-6 3 3 0 000 6z",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ລິ້ງຂາຍ"
        subtitle="ສ້າງລິ້ງສ່ວນຕົວ ສົ່ງໃຫ້ລູກຄ້າ — ອໍເດີຈະນັບເປັນຍອດຂາຍຂອງທ່ານ"
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <StatCard
            key={t.label}
            label={t.label}
            value={t.value}
            tone={t.tone}
            icon={t.icon}
            accent={t.accent}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Link builder section */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle hint="ໝົດອາຍຸ 30 ວັນ (last-click)">ລິ້ງຂາຍຂອງທ່ານ</CardTitle>
            <SalesLinkBuilder saleCode={admin.code} saleName={admin.name} />
          </Card>
        </div>

        {/* Stats and guide section */}
        <div className="space-y-6 lg:col-span-1">
          {/* Target Progress */}
          <Card>
            <CardTitle>ເປົ້າໝາຍການຂາຍເດືອນນີ້</CardTitle>
            {stats.monthlyTarget > 0 ? (
              <div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500">ຍອດຂາຍປະຈຸບັນ</span>
                  <span className="text-slate-700">
                    {formatKip(stats.revenueMonth)} / {formatKip(stats.monthlyTarget)}
                  </span>
                </div>
                {(() => {
                  const pct = Math.round((stats.revenueMonth / stats.monthlyTarget) * 100);
                  const reached = stats.revenueMonth >= stats.monthlyTarget;
                  return (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 border border-slate-200/50">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              reached ? "bg-gradient-to-r from-emerald-500 to-green-500" : "bg-gradient-to-r from-orange-500 to-amber-500"
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span className={`shrink-0 text-sm font-black ${reached ? "text-emerald-600" : "text-orange-600"}`}>
                          {pct}%
                        </span>
                      </div>
                      {reached && (
                        <p className="mt-2 text-center text-xs font-bold text-emerald-600 animate-bounce">
                          🎉 ຍິນດີດ້ວຍ! ທ່ານບັນລຸເປົ້າໝາຍແລ້ວ
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-500">
                <svg viewBox="0 0 24 24" className="mx-auto h-8 w-8 text-slate-350 mb-2" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-bold text-slate-500">ຍັງບໍ່ມີການຕັ້ງເປົ້າໝາຍ</p>
                <p className="text-[10px] text-slate-500 mt-1">ຕິດຕໍ່ຜູ້ຈັດການເພື່ອຕັ້ງເປົ້າໝາຍຍອດຂາຍຂອງທ່ານ</p>
              </div>
            )}
          </Card>

          {/* All-Time Performance Card */}
          <Card>
            <CardTitle>ຜົນງານທັງໝົດ</CardTitle>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-500">ອໍເດີທັງໝົດ</span>
                <span className="text-sm font-black text-slate-800">{stats.ordersAll.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">ຍອດຂາຍສະສົມ</span>
                <span className="text-sm font-black text-price">{formatKip(stats.revenueAll)}</span>
              </div>
            </div>
          </Card>

          {/* Sales Guide Card */}
          <Card>
            <CardTitle>ຄຳແນະນຳໃນການຂາຍ</CardTitle>
            <ul className="space-y-3 text-xs leading-relaxed text-slate-600 font-semibold">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-orange-50 border border-orange-100 text-[10px] font-black text-orange-600">1</span>
                <span><strong>ແບ່ງປັນໃນສື່ສັງຄົມ:</strong> ໂພສລິ້ງລົງໃນ Facebook, LINE ຫຼື WhatsApp Status ພ້ອມຮູບພາບສິນຄ້າທີ່ໜ້າສົນໃຈ.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-orange-50 border border-orange-100 text-[10px] font-black text-orange-600">2</span>
                <span><strong>ສົ່ງໃຫ້ລູກຄ້າໂດຍກົງ:</strong> ເມື່ອລູກຄ້າສອບຖາມທາງ Inbox ສາມາດຄັດລອກລິ້ງສິນຄ້ານັ້ນສົ່ງໃຫ້ລູກຄ້າໄດ້ທັນທີ.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-orange-50 border border-orange-100 text-[10px] font-black text-orange-600">3</span>
                <span><strong>ລະຫັດສິນຄ້າ:</strong> ໃສ່ລະຫັດສິນຄ້າໃນຊ່ອງຄົ້ນຫາ ເພື່ອລິ້ງໄປຫາໜ້າສິນຄ້ານັ້ນໂດຍກົງ.</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
