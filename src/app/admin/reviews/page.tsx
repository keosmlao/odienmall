import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getAdminReviews, getAdminReviewStats } from "@/lib/reviews-admin";
import { firstParam, parsePage } from "@/lib/params";
import StatCard from "@/components/admin/StatCard";
import {
  PageHeader,
  Badge,
  EmptyState,
  TableShell,
  THEAD,
  TH,
  TBODY,
  TR,
  TD,
  BTN_SECONDARY,
} from "@/components/admin/ui";
import ReviewFilters from "./ReviewFilters";
import ReviewRowControls from "./ReviewRowControls";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim() || "";
  const ratingStr = firstParam(sp.rating) || "";
  const visRaw = firstParam(sp.vis) || "";
  const visibility = visRaw === "hidden" || visRaw === "visible" ? visRaw : undefined;
  const rating = Number(ratingStr) >= 1 && Number(ratingStr) <= 5 ? Number(ratingStr) : undefined;
  const page = parsePage(sp.page);

  const [stats, list] = await Promise.all([
    getAdminReviewStats(),
    getAdminReviews({ search: q, rating, visibility, page, pageSize: 30 }),
  ]);

  const pageParams = new URLSearchParams();
  if (q) pageParams.set("q", q);
  if (ratingStr) pageParams.set("rating", ratingStr);
  if (visRaw) pageParams.set("vis", visRaw);
  const qParam = pageParams.toString() ? `&${pageParams.toString()}` : "";

  return (
    <div>
      <PageHeader title="ຈັດການຣີວິວ" subtitle="ເບິ່ງ, ເຊື່ອງ ຫຼື ລຶບ ຄຳຕິຊົມຂອງລູກຄ້າ" />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="ຣີວິວທັງໝົດ"
          value={stats.total.toLocaleString()}
          tone="brand"
          icon="M12 17.3l-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z"
        />
        <StatCard
          label="ຄະແນນສະເລ່ຍ"
          value={stats.avg.toFixed(2)}
          tone="amber"
          icon="M12 17.3l-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z"
        />
        <StatCard
          label="ເຊື່ອງຢູ່"
          value={stats.hidden.toLocaleString()}
          tone="slate"
          icon="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.4 3.2M6.1 6.1A18 18 0 0 0 2 12s3.5 8 10 8a10.6 10.6 0 0 0 3-.4"
        />
      </div>

      <ReviewFilters search={q} rating={ratingStr} visibility={visRaw} />

      <p className="mb-2 text-xs text-gray-400">ພົບ {list.total.toLocaleString()} ຣີວິວ</p>

      {list.items.length === 0 ? (
        <EmptyState
          title="ບໍ່ພົບຣີວິວ"
          icon="M12 17.3l-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z"
        />
      ) : (
        <TableShell minWidth={760}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>ສິນຄ້າ</th>
              <th className={TH}>ລູກຄ້າ</th>
              <th className={TH}>ຄະແນນ</th>
              <th className={TH}>ຄຳເຫັນ</th>
              <th className={TH}>ວັນທີ</th>
              <th className={`${TH} text-right`}></th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {list.items.map((r) => (
              <tr key={r.id} className={`${TR} align-top ${r.isHidden ? "opacity-60" : ""}`}>
                <td className={TD}>
                  <Link
                    href={`/admin/products/${encodeURIComponent(r.productCode)}`}
                    className="line-clamp-1 font-semibold text-brand-dark hover:underline"
                  >
                    {r.productName}
                  </Link>
                  <div className="text-xs text-gray-400">{r.productCode}</div>
                </td>
                <td className={`${TD} font-medium text-gray-700`}>{r.customerName}</td>
                <td className={TD}>
                  <span className="whitespace-nowrap text-amber-500" aria-label={`${r.rating} ດາວ`}>
                    {"★".repeat(r.rating)}
                    <span className="text-gray-300">{"★".repeat(5 - r.rating)}</span>
                  </span>
                </td>
                <td className={TD}>
                  <div className="line-clamp-2 max-w-xs">{r.comment ?? <span className="text-gray-300">—</span>}</div>
                  {r.isHidden && (
                    <span className="mt-1 inline-block">
                      <Badge tone="gray">ເຊື່ອງຢູ່</Badge>
                    </span>
                  )}
                </td>
                <td className={`${TD} text-gray-400`}>
                  {new Date(r.createdAt).toLocaleDateString("lo-LA")}
                </td>
                <td className={`${TD} text-right`}>
                  <ReviewRowControls id={r.id} isHidden={r.isHidden} />
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {list.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={`/admin/reviews?page=${page - 1}${qParam}`} className={BTN_SECONDARY}>
              ກ່ອນໜ້າ
            </Link>
          )}
          <span className="text-gray-400">ໜ້າ {page} / {list.totalPages}</span>
          {page < list.totalPages && (
            <Link href={`/admin/reviews?page=${page + 1}${qParam}`} className={BTN_SECONDARY}>
              ຕໍ່ໄປ
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
