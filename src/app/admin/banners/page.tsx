import { redirect } from "next/navigation";
import { isManager } from "@/lib/auth";
import { getAdminBanners } from "@/lib/banners";
import { PageHeader } from "@/components/admin/ui";
import BannerManager from "./BannerManager";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  if (!(await isManager())) redirect("/admin");
  const banners = await getAdminBanners();

  return (
    <div>
      <PageHeader
        title="ຈັດການ Banner Slide"
        subtitle="ເພີ່ມຮູບ, ຂໍ້ຄວາມ, ລິ້ງ, ສີ, ລຳດັບ ແລະເປີດ/ປິດ banner ໜ້າຫຼັກ"
      />
      <BannerManager banners={banners} />
    </div>
  );
}
