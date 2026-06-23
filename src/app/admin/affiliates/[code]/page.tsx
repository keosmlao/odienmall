import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import { getAffiliateDetail } from "@/lib/affiliates";
import { formatKip } from "@/lib/format";
import {
  AFFILIATE_STATUS_LABEL,
  COMMISSION_STATUS_LABEL,
  type AffiliateStatus,
} from "@/lib/affiliate-constants";
import { PageHeader, Card, CardTitle, Badge, EmptyState } from "@/components/admin/ui";
import AffiliateStatusControl from "../AffiliateStatusControl";
import PayButton from "../PayButton";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<AffiliateStatus, "green" | "amber" | "rose"> = {
  active: "green",
  pending: "amber",
  suspended: "rose",
};

export default async function AdminAffiliateDetail({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");

  const { code } = await params;
  const detail = await getAffiliateDetail(decodeURIComponent(code));
  if (!detail) notFound();

  const { affiliate: a } = detail;
  const status = a.status as AffiliateStatus;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={a.name}
        back={{ href: "/admin/affiliates", label: "ກັບໄປລາຍຊື່ນາຍໜ້າ" }}
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2">
              <Badge tone={STATUS_TONE[status]}>{AFFILIATE_STATUS_LABEL[status]}</Badge>
            </div>
            <div className="space-y-0.5 text-sm text-gray-500">
              <div>ລະຫັດລູກຄ້າ: {a.customerCode}</div>
              {a.phone && <div>ເບີໂທ: {a.phone}</div>}
              <div>
                ອີເມວ: {a.email ?? "—"}{" "}
                {a.emailVerifiedAt && <span className="font-semibold text-emerald-600">✓ ຢືນຢັນແລ້ວ</span>}
              </div>
              <div>
                ລະຫັດແນະນຳ: <span className="font-mono text-gray-700">{a.code}</span>
              </div>
            </div>
          </div>
          <AffiliateStatusControl code={a.code} current={status} />
        </div>
      </Card>

      <Card className="mt-5">
        <CardTitle>ບັນຊີຮັບຄ່ານາຍໜ້າ</CardTitle>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <Info label="ທະນາຄານ" value={a.bankName ?? "—"} />
          <Info label="ຊື່ບັນຊີ" value={a.accountName ?? "—"} />
          <Info label="ເລກບັນຊີ" value={a.accountNo ?? "—"} mono />
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="ຄລິກ" value={detail.clicks.toLocaleString()} />
        <Stat label="ຄຳສັ່ງຊື້" value={detail.referred.toLocaleString()} />
        <Stat label="ຄ້າງຈ່າຍ" value={formatKip(detail.earned)} accent />
        <Stat label="ຈ່າຍແລ້ວ" value={formatKip(detail.paid)} />
      </div>

      <Card className="mt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>ຄ່ານາຍໜ້າ</CardTitle>
          <PayButton code={a.code} earned={detail.earned} />
        </div>
        {detail.commissions.length === 0 ? (
          <EmptyState title="ຍັງບໍ່ມີຄ່ານາຍໜ້າ" />
        ) : (
          <div className="divide-y divide-gray-100">
            {detail.commissions.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <Link
                    href={`/admin/orders/${encodeURIComponent(c.orderNo)}`}
                    className="font-semibold text-brand-dark hover:underline"
                  >
                    {c.orderNo}
                  </Link>
                  <div className="text-xs text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString("lo-LA")} · ຍອດ {formatKip(c.baseAmount)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <div className="font-semibold text-price">{formatKip(c.amount)}</div>
                  <Badge tone={c.status === "paid" ? "green" : "amber"}>
                    {COMMISSION_STATUS_LABEL[c.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {detail.payouts.length > 0 && (
        <Card className="mt-5">
          <CardTitle>ປະຫວັດການຈ່າຍ</CardTitle>
          <div className="divide-y divide-gray-100">
            {detail.payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-gray-500">
                  {new Date(p.createdAt).toLocaleString("lo-LA")}
                </span>
                <span className="font-semibold text-gray-700">{formatKip(p.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`mt-1 font-semibold text-gray-800 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`mt-1 text-lg font-bold ${accent ? "text-price" : "text-gray-900"}`}>
        {value}
      </div>
    </Card>
  );
}
