import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getRedemptions } from "@/lib/rewards-admin";
import { REDEMPTION_STATUS_LABEL } from "@/lib/rewards";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  fulfilled: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-600",
};
const FILTERS = ["all", "pending", "approved", "fulfilled", "rejected"] as const;
const FILTER_LABEL: Record<string, string> = {
  all: "ທັງໝົດ",
  pending: "ລໍຖ້າ",
  approved: "ອະນຸມັດ",
  fulfilled: "ອອກເບີກແລ້ວ",
  rejected: "ປະຕິເສດ",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default async function AdminRedemptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const sp = await searchParams;
  const status = sp.status && FILTERS.includes(sp.status as (typeof FILTERS)[number]) ? sp.status : "pending";
  const { items, total } = await getRedemptions({ status, pageSize: 100 });

  return (
    <div className="space-y-5">
      <PageHeader
        title="ການແລກຂອງລາງວັນ"
        subtitle={`ໃບຂໍເບີກລາງວັນ — ກຳນົດສາງຈ່າຍ ແລະ ຈັດສົ່ງ · ${total} ລາຍການ`}
        back={{ href: "/admin/rewards", label: "ຈັດການຂອງລາງວັນ" }}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/rewards/redemptions?status=${f}`}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
              status === f ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {FILTER_LABEL[f]}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
          ບໍ່ມີລາຍການ
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2.5">ວັນທີ</th>
                <th className="px-3 py-2.5">ລູກຄ້າ</th>
                <th className="px-3 py-2.5">ລາງວັນ</th>
                <th className="px-3 py-2.5 text-right">ແຕ້ມ</th>
                <th className="px-3 py-2.5">ໃບເບີກ</th>
                <th className="px-3 py-2.5">ສະຖານະ</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-100">
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold">{r.customerName ?? r.customerCode}</div>
                    <div className="text-[11px] text-slate-500">{r.customerCode}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{r.rewardName}</div>
                    {r.freeQty != null && r.unitCode && (
                      <div className="text-[11px] text-slate-500">🎁 {r.freeQty} {r.unitCode}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-orange-600">
                    {r.pointsSpent.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{r.smlDocNo ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${STATUS_STYLE[r.status]}`}>
                      {REDEMPTION_STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link href={`/admin/rewards/redemptions/${r.id}`} className="text-xs font-bold text-orange-600 hover:underline">
                      ຈັດການ ›
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
