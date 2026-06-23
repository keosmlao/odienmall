import { redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import { listVouchers } from "@/lib/vouchers";
import { PageHeader } from "@/components/admin/ui";
import VoucherManager from "@/components/admin/VoucherManager";

export const dynamic = "force-dynamic";

export default async function AdminVouchersPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");
  const vouchers = await listVouchers();
  return (
    <div>
      <PageHeader title="ຄູປ໋ອງ / ສ່ວນຫຼຸດ" subtitle="ສ້າງ ແລະ ຈັດການໂຄ້ດສ່ວນຫຼຸດສຳລັບ checkout" />
      <VoucherManager vouchers={vouchers} />
    </div>
  );
}
