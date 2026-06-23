import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import { getAuditLog, getAuditActions } from "@/lib/audit";
import { firstParam, parsePage } from "@/lib/params";
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
import AuditFilters from "./AuditFilters";

export const dynamic = "force-dynamic";

// Colour the action prefix chip by domain.
const PREFIX_TONE: Record<string, "blue" | "brand" | "amber" | "green" | "gray"> = {
  order: "blue",
  product: "brand",
  review: "amber",
  affiliate: "green",
  settings: "gray",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");

  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim() || "";
  const action = firstParam(sp.action) || "";
  const page = parsePage(sp.page);

  const [log, actions] = await Promise.all([
    getAuditLog({ search: q, action, page, pageSize: 50 }),
    getAuditActions(),
  ]);

  const pageParams = new URLSearchParams();
  if (q) pageParams.set("q", q);
  if (action) pageParams.set("action", action);
  const qParam = pageParams.toString() ? `&${pageParams.toString()}` : "";

  return (
    <div>
      <PageHeader title="ບັນທຶກການເຄື່ອນໄຫວ" subtitle="ໃຜແກ້ໄຂຫຍັງ ໃນລະບົບຈັດການ" />

      <AuditFilters search={q} action={action} actions={actions} />

      <p className="mb-2 text-xs text-gray-400">ພົບ {log.total.toLocaleString()} ລາຍການ</p>

      {log.items.length === 0 ? (
        <EmptyState
          title="ຍັງບໍ່ມີບັນທຶກ"
          icon="M9 5h6M9 9h6M9 13h4M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
        />
      ) : (
        <TableShell minWidth={720}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>ເວລາ</th>
              <th className={TH}>ຜູ້ໃຊ້</th>
              <th className={TH}>ການກະທຳ</th>
              <th className={TH}>ເປົ້າໝາຍ</th>
              <th className={TH}>ລາຍລະອຽດ</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {log.items.map((e) => {
              const prefix = e.action.split(".")[0];
              return (
                <tr key={e.id} className={TR}>
                  <td className={`${TD} whitespace-nowrap text-gray-400`}>
                    {new Date(e.createdAt).toLocaleString("lo-LA")}
                  </td>
                  <td className={`${TD} font-medium text-gray-700`}>
                    {e.actorName ?? e.actorCode ?? "—"}
                    {e.actorCode && e.actorName && (
                      <span className="ml-1 text-xs font-normal text-gray-400">({e.actorCode})</span>
                    )}
                  </td>
                  <td className={TD}>
                    <Badge tone={PREFIX_TONE[prefix] ?? "gray"}>{e.action}</Badge>
                  </td>
                  <td className={`${TD} font-mono text-xs text-gray-500`}>{e.entity ?? "—"}</td>
                  <td className={`${TD} text-gray-500`}>
                    <div className="line-clamp-1 max-w-xs">{e.detail ?? "—"}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}

      {log.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={`/admin/audit?page=${page - 1}${qParam}`} className={BTN_SECONDARY}>
              ກ່ອນໜ້າ
            </Link>
          )}
          <span className="text-gray-400">ໜ້າ {page} / {log.totalPages}</span>
          {page < log.totalPages && (
            <Link href={`/admin/audit?page=${page + 1}${qParam}`} className={BTN_SECONDARY}>
              ຕໍ່ໄປ
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
