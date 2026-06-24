import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import { listAffiliates, countPendingCommissionSync } from "@/lib/affiliates";
import {
  AFFILIATE_STATUSES,
  AFFILIATE_STATUS_LABEL,
  type AffiliateStatus,
} from "@/lib/affiliate-constants";
import { firstParam } from "@/lib/params";
import { formatKip } from "@/lib/format";
import {
  PageHeader,
  EmptyState,
  TableShell,
  THEAD,
  TH,
  TBODY,
  TR,
  TD,
  ButtonLink,
} from "@/components/admin/ui";
import AffiliateStatusControl from "./AffiliateStatusControl";
import SyncCommissionsButton from "./SyncCommissionsButton";

export const dynamic = "force-dynamic";

export default async function AdminAffiliates({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");

  const sp = await searchParams;
  const status = firstParam(sp.status);
  const [affiliates, pendingSync] = await Promise.all([
    listAffiliates(status),
    countPendingCommissionSync(),
  ]);
  const pendingCount = affiliates.filter((a) => a.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="ນາຍໜ້າແນະນຳ"
        subtitle={
          <>
            {affiliates.length} ນາຍໜ້າ
            {!status && pendingCount > 0 && ` · ${pendingCount} ລໍຖ້າອະນຸມັດ`}
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SyncCommissionsButton pending={pendingSync} />
            <ButtonLink href="/admin/affiliates/rates" variant="secondary">
              ຕັ້ງຄ່າອັດຕາຄ່ານາຍໜ້າ
            </ButtonLink>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5 text-sm">
        <FilterChip href="/admin/affiliates" label="ທັງໝົດ" active={!status} />
        {AFFILIATE_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={`/admin/affiliates?status=${s}`}
            label={AFFILIATE_STATUS_LABEL[s]}
            active={status === s}
          />
        ))}
      </div>

      {affiliates.length === 0 ? (
        <EmptyState
          title="ບໍ່ມີນາຍໜ້າ"
          icon="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21v-1a6 6 0 0 1 12 0v1M19 8v6M22 11h-6"
        />
      ) : (
        <TableShell minWidth={1420}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>ນາຍໜ້າ</th>
              <th className={TH}>ຕິດຕໍ່ / ຢືນຢັນ</th>
              <th className={TH}>ບັນຊີຮັບເງິນ</th>
              <th className={TH}>Referral</th>
              <th className={`${TH} text-right`}>ຄລິກ</th>
              <th className={`${TH} text-right`}>ຄຳສັ່ງຊື້</th>
              <th className={`${TH} text-right`}>ຄ້າງຈ່າຍ</th>
              <th className={`${TH} text-right`}>ຈ່າຍແລ້ວ</th>
              <th className={TH}>ສະຖານະ / ວັນທີ</th>
              <th className={TH}>ຈັດການ</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {affiliates.map((a) => (
              <tr key={a.code} className={TR}>
                <td className={TD}>
                  <Link
                    href={`/admin/affiliates/${encodeURIComponent(a.code)}`}
                    className="font-semibold text-brand-dark hover:underline"
                  >
                    {a.name}
                  </Link>
                  <div className="mt-1 text-xs text-gray-400">Customer: {a.customerCode}</div>
                  {a.phone && <div className="text-xs text-gray-400">{a.phone}</div>}
                </td>
                <td className={TD}>
                  <div className="max-w-52 break-all text-sm text-gray-700">{a.email ?? "—"}</div>
                  <div className={`mt-1 text-xs font-semibold ${a.emailVerifiedAt ? "text-emerald-600" : "text-amber-600"}`}>
                    {a.emailVerifiedAt ? "✓ ຢືນຢັນ Email ແລ້ວ" : "ຍັງບໍ່ຢືນຢັນ Email"}
                  </div>
                </td>
                <td className={TD}>
                  <div className="max-w-56 text-sm font-medium text-gray-700">{a.bankName ?? "—"}</div>
                  <div className="mt-1 text-xs text-gray-500">{a.accountName ?? "—"}</div>
                  <div className="font-mono text-xs text-gray-500">{a.accountNo ?? "—"}</div>
                </td>
                <td className={`${TD} font-mono text-xs`}>
                  <Link
                    href={`/admin/affiliates/${encodeURIComponent(a.code)}`}
                    className="text-brand-dark hover:underline"
                  >
                    {a.code}
                  </Link>
                </td>
                <td className={`${TD} text-right`}>{a.clicks.toLocaleString()}</td>
                <td className={`${TD} text-right`}>{a.referred}</td>
                <td className={`${TD} text-right font-semibold text-price`}>
                  {formatKip(a.earned)}
                </td>
                <td className={`${TD} text-right text-gray-500`}>{formatKip(a.paid)}</td>
                <td className={TD}>
                  <div className="text-sm font-semibold text-gray-700">
                    {AFFILIATE_STATUS_LABEL[a.status as AffiliateStatus]}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    ສະໝັກ: {new Date(a.createdAt).toLocaleDateString("lo-LA")}
                  </div>
                  {a.approvedAt && (
                    <div className="text-xs text-gray-400">
                      ອະນຸມັດ: {new Date(a.approvedAt).toLocaleDateString("lo-LA")}
                    </div>
                  )}
                </td>
                <td className={TD}>
                  <div className="flex min-w-32 flex-col items-start gap-2">
                    <Link
                      href={`/admin/affiliates/${encodeURIComponent(a.code)}`}
                      className="text-xs font-semibold text-brand-dark hover:underline"
                    >
                      ເບິ່ງລາຍລະອຽດ
                    </Link>
                    <AffiliateStatusControl
                      code={a.code}
                      current={a.status as AffiliateStatus}
                      size="sm"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 font-medium ring-1 ring-inset transition ${
        active
          ? "bg-brand text-white ring-brand"
          : "bg-white text-gray-600 ring-gray-200 hover:border-brand hover:text-brand-dark"
      }`}
    >
      {label}
    </Link>
  );
}
