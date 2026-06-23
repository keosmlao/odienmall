import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getAdminBrandList } from "@/lib/brands-admin";
import { firstParam } from "@/lib/params";
import { PageHeader } from "@/components/admin/ui";
import BrandLogoEditor from "./BrandLogoEditor";

export const dynamic = "force-dynamic";

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const q = firstParam((await searchParams).q)?.trim() ?? "";
  const brands = await getAdminBrandList(q);
  return (
    <div>
      <PageHeader
        title="ຈັດການ Logo Brand"
        subtitle="ອັບໂຫຼດ ຫຼືໃສ່ URL logo — ບໍ່ແກ້ຂໍ້ມູນ ERP"
      />
      <form className="mb-5 flex max-w-lg gap-2">
        <input name="q" defaultValue={q} className="inp flex-1" placeholder="ຄົ້ນຫາ brand..." />
        <button className="rounded-lg bg-brand px-4 text-sm font-semibold text-white">ຄົ້ນຫາ</button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {brands.map((brand) => <BrandLogoEditor key={brand.code} brand={brand} />)}
      </div>
    </div>
  );
}
