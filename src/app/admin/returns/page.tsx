import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listReturns, RETURN_STATUSES, RETURN_STATUS_LABEL, type ReturnStatus } from "@/lib/returns";
import { firstParam } from "@/lib/params";
import { PageHeader, EmptyState, TableShell, THEAD, TH, TBODY, TR, TD } from "@/components/admin/ui";
import ReturnRowControls from "@/components/admin/ReturnRowControls";

export const dynamic = "force-dynamic";

export default async function AdminReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const sp = await searchParams;
  const status = firstParam(sp.status) || "";
  const rows = await listReturns(status);

  return (
    <div>
      <PageHeader title="ຄືນສິນຄ້າ / ຄືນເງິນ" subtitle="ກວດສອບ ແລະ ອະນຸມັດຄຳຮ້ອງຄືນສິນຄ້າຈາກລູກຄ້າ" />

      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        <Chip href="/admin/returns" label="ທັງໝົດ" active={!status} />
        {RETURN_STATUSES.map((s) => (
          <Chip key={s} href={`/admin/returns?status=${s}`} label={RETURN_STATUS_LABEL[s]} active={status === s} />
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="ບໍ່ມີຄຳຮ້ອງ" icon="M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8" />
      ) : (
        <TableShell minWidth={820}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>ອໍເດີ</th>
              <th className={TH}>ລູກຄ້າ</th>
              <th className={TH}>ເຫດຜົນ</th>
              <th className={TH}>ສະຖານະ</th>
              <th className={TH}>ວັນທີ</th>
              <th className={`${TH} text-right`}>ຈັດການ</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {rows.map((r) => (
              <tr key={r.id} className={TR}>
                <td className={TD}>
                  <Link href={`/admin/orders/${encodeURIComponent(r.orderNo)}`} className="font-mono font-semibold text-brand-dark hover:underline">
                    {r.orderNo}
                  </Link>
                </td>
                <td className={TD}>{r.customerCode ?? "—"}</td>
                <td className={TD}>
                  <div className="font-medium text-gray-700">{r.reason}</div>
                  {r.detail && <div className="text-xs text-gray-400 line-clamp-2">{r.detail}</div>}
                </td>
                <td className={TD}>{RETURN_STATUS_LABEL[r.status as ReturnStatus] ?? r.status}</td>
                <td className={`${TD} text-gray-400`}>{new Date(r.createdAt).toLocaleDateString("lo-LA")}</td>
                <td className={`${TD} text-right`}>
                  <ReturnRowControls id={r.id} status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

function Chip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 font-medium ring-1 ring-inset transition ${
        active ? "bg-brand text-white ring-brand" : "bg-white text-gray-600 ring-gray-200 hover:text-brand-dark"
      }`}
    >
      {label}
    </Link>
  );
}
