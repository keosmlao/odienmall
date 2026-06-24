import { redirect } from "next/navigation";
import { isAdmin, isManager, listSalespeople } from "@/lib/auth";
import { getCommissionDefault, getCommissionOverrides, getCommissionEarners } from "@/lib/sales-link";
import { PageHeader, Card, CardTitle, BTN_SECONDARY } from "@/components/admin/ui";
import CommissionManager from "@/components/admin/CommissionManager";
import CommissionPayouts from "@/components/admin/CommissionPayouts";

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

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="ຄອມມິສຊັນພະນັກງານຂາຍ"
        subtitle="ອັດຕາມາດຕະຖານ + ກຳນົດສະເພາະຄົນ — ຄິດຈາກອໍເດີທີ່ຈັດສົ່ງສຳເລັດ"
        actions={
          earners.length > 0 ? (
            <a href="/admin/sales-commission/export" className={BTN_SECONDARY}>ດາວໂຫຼດ CSV</a>
          ) : undefined
        }
      />
      <Card className="mb-5">
        <CardTitle hint="ຄິດຈາກຍອດທີ່ສຳເລັດ (ຈັດສົ່ງແລ້ວ)">ຕັ້ງຄ່າຄອມມິສຊັນ</CardTitle>
        <CommissionManager defaultRate={defaultRate} overrides={overrides} options={salespeople} />
      </Card>

      <Card>
        <CardTitle hint="ໄດ້ຮັບ − ຈ່າຍແລ້ວ = ຄ້າງ">ການຈ່າຍຄອມມິສຊັນ</CardTitle>
        <CommissionPayouts earners={earners} />
      </Card>
    </div>
  );
}
