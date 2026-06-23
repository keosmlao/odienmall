import { redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import { listFlashDeals } from "@/lib/flash";
import { getHomePromotion } from "@/lib/settings";
import { PageHeader, Card, CardTitle } from "@/components/admin/ui";
import FlashManager from "@/components/admin/FlashManager";
import HomePromotionForm from "../settings/HomePromotionForm";

export const dynamic = "force-dynamic";

export default async function AdminFlashPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");
  const [deals, promotion] = await Promise.all([listFlashDeals(), getHomePromotion()]);
  return (
    <div>
      <PageHeader title="Flash Sale" subtitle="ຕັ້ງລາຄາພິເສດແບບຈຳກັດເວລາ — ສະແດງໜ້າຫຼັກພ້ອມ countdown" />
      <FlashManager deals={deals} />

      <Card className="mt-6 border-orange-100">
        <CardTitle hint="ແຖບສິນຄ້າໂປຣໂມຊັນ (ສິນຄ້າ ERP ທີ່ໝາຍ item_promote) ພ້ອມນັບຖອຍຫຼັງ — ບໍ່ໄດ້ຫຼຸດລາຄາ, ຄົນລະຢ່າງກັບ Flash Sale ຂ້າງເທິງ.">
          ໂປຣໂມຊັນໜ້າຫຼັກ (ນັບຖອຍຫຼັງ)
        </CardTitle>
        <HomePromotionForm initial={promotion} />
      </Card>
    </div>
  );
}
