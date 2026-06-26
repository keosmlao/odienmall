import { redirect } from "next/navigation";
import { isManager } from "@/lib/auth";
import { getWarehouses } from "@/lib/inventory-stock";
import { getSalesWarehouseCodes } from "@/lib/sales-warehouse";
import { PageHeader } from "@/components/admin/ui";
import SalesWarehousesForm from "./SalesWarehousesForm";

export const dynamic = "force-dynamic";

export default async function SalesWarehousesPage() {
  if (!(await isManager())) redirect("/admin");
  const [warehouses, selected] = await Promise.all([getWarehouses(), getSalesWarehouseCodes()]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="ກຳນົດສາງສຳລັບການຂາຍ"
        subtitle="ສາງທີ່ໃຊ້ຈ່າຍສິນຄ້າສຳລັບອໍເດີ online"
        back={{ href: "/admin/stock", label: "ສິນຄ້າຄົງເຫຼືອ" }}
      />
      <SalesWarehousesForm warehouses={warehouses} selected={selected} />
    </div>
  );
}
