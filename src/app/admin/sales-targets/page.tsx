import { redirect } from "next/navigation";
import { isAdmin, isManager, listSalespeople } from "@/lib/auth";
import { getSalesTargets, currentMonth } from "@/lib/sales-link";
import { firstParam } from "@/lib/params";
import { PageHeader, Card, CardTitle, EmptyState } from "@/components/admin/ui";
import SalesTargetRow from "@/components/admin/SalesTargetRow";
import AddSalesTarget from "@/components/admin/AddSalesTarget";
import MonthNav from "@/components/admin/MonthNav";

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

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="ເປົ້າຍອດຂາຍ"
        subtitle="ກຳນົດເປົ້າຕາມເດືອນ ໃຫ້ພະນັກງານຂາຍເທື່ອລະຄົນ ແລະ ຕິດຕາມຄວາມຄືບໜ້າ"
        actions={<MonthNav month={month} />}
      />

      <Card className="mb-5">
        <CardTitle>ເພີ່ມເປົ້າ</CardTitle>
        <AddSalesTarget options={salespeople} defaultMonth={month} />
      </Card>

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
  );
}
