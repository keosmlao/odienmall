import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import {
  getAdminProducts,
  getAdminProductStats,
  getAdminGroups,
  getAdminCategories,
  getAdminBrands,
} from "@/lib/products-admin";
import { firstParam, parsePage, parseBool } from "@/lib/params";
import StatCard from "@/components/admin/StatCard";
import { PageHeader, EmptyState, ButtonLink } from "@/components/admin/ui";
import ProductFilters from "./ProductFilters";
import ProductBulkList from "./ProductBulkList";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim() || "";
  const group = firstParam(sp.group) || "";
  const cat = firstParam(sp.cat) || "";
  const brand = firstParam(sp.brand) || "";
  const oos = parseBool(sp.oos);
  const low = parseBool(sp.low);
  const page = parsePage(sp.page);

  const [stats, list, groups, categories, brands] = await Promise.all([
    getAdminProductStats(),
    getAdminProducts({
      search: q,
      groupMain: group,
      categoryCode: cat,
      brandCode: brand,
      includeOutOfStock: oos,
      lowStock: low,
      page,
      pageSize: 30,
    }),
    getAdminGroups(),
    getAdminCategories(group),
    getAdminBrands(),
  ]);

  // Preserve every filter across pagination links.
  const pageParams = new URLSearchParams();
  if (q) pageParams.set("q", q);
  if (group) pageParams.set("group", group);
  if (cat) pageParams.set("cat", cat);
  if (brand) pageParams.set("brand", brand);
  if (oos) pageParams.set("oos", "1");
  if (low) pageParams.set("low", "1");
  const qParam = pageParams.toString() ? `&${pageParams.toString()}` : "";

  return (
    <div>
      <PageHeader
        title="ຈັດການຂໍ້ມູນສິນຄ້າ"
        subtitle="ເພີ່ມຮູບ, ເຊື່ອງ/ສະແດງ ແລະ ໝາຍສິນຄ້າແນະນຳ — ຂໍ້ມູນຫຼັກ (ຊື່/ລາຄາ/ສະຕັອກ) ມາຈາກ ERP ອ່ານຢ່າງດຽວ"
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/admin/products/stock-export?low=1"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-black text-amber-700 transition hover:bg-amber-100"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              ສ້ອຍໜ້ອຍ CSV
            </a>
            <a
              href="/admin/products/stock-export"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              ສ້ອຍທັງໝົດ CSV
            </a>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="ສິນຄ້າເທິງເວັບ"
          value={stats.total.toLocaleString()}
          tone="brand"
          icon="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10"
        />
        <StatCard
          label="ມີຮູບແລ້ວ"
          value={stats.withImage.toLocaleString()}
          tone="green"
          icon="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M9 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"
        />
        <Link href="/admin/products?low=1" className="block rounded-2xl outline-none transition focus-visible:ring-4 focus-visible:ring-brand/20">
          <StatCard
            label="ສະຕັອກໜ້ອຍ (≤5)"
            value={stats.lowStock.toLocaleString()}
            tone="amber"
            icon="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"
          />
        </Link>
        <StatCard
          label="ສິນຄ້າແນະນຳ"
          value={stats.featured.toLocaleString()}
          tone="blue"
          icon="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.1 21.9l1.1-6.5L2.5 9.8l6.5-.9L12 3z"
        />
        <StatCard
          label="ເຊື່ອງຢູ່"
          value={stats.hidden.toLocaleString()}
          tone="slate"
          icon="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.4 3.2M6.1 6.1A18 18 0 0 0 2 12s3.5 8 10 8a10.6 10.6 0 0 0 3-.4"
        />
      </div>

      {/* Filters */}
      <ProductFilters
        groups={groups}
        categories={categories}
        brands={brands}
        search={q}
        groupCode={group}
        categoryCode={cat}
        brandCode={brand}
        includeOutOfStock={oos}
        lowStock={low}
      />

      <p className="mb-2 text-xs text-gray-400">
        ພົບ {list.total.toLocaleString()} ລາຍການ
        {q && <> ສຳລັບ “{q}”</>}
      </p>

      {list.items.length === 0 ? (
        <EmptyState
          title="ບໍ່ພົບສິນຄ້າ"
          icon="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10"
        />
      ) : (
        <ProductBulkList items={list.items} />
      )}

      {/* Pagination */}
      {list.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <ButtonLink href={`/admin/products?page=${page - 1}${qParam}`}>ກ່ອນໜ້າ</ButtonLink>
          )}
          <span className="text-gray-400">
            ໜ້າ {page} / {list.totalPages}
          </span>
          {page < list.totalPages && (
            <ButtonLink href={`/admin/products?page=${page + 1}${qParam}`}>ຕໍ່ໄປ</ButtonLink>
          )}
        </div>
      )}
    </div>
  );
}
