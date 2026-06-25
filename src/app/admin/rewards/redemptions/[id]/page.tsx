import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getRedemptionById } from "@/lib/rewards-admin";
import { getRewardWarehouseOptions } from "@/lib/reward-requisition";
import { REDEMPTION_STATUS_LABEL } from "@/lib/rewards";
import RedemptionControl from "./RedemptionControl";

export const dynamic = "force-dynamic";

export default async function RedemptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const r = await getRedemptionById(id);
  if (!r) notFound();

  // Warehouse options read the RWRT requisition doc straight from ic_trans.
  const options = r.smlDocNo ? await getRewardWarehouseOptions(r.smlDocNo).catch(() => null) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/admin/rewards/redemptions" className="text-xs font-bold text-orange-400 hover:underline">
        ‹ ກັບໄປລາຍການ
      </Link>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-white">{r.rewardName}</h1>
            <p className="mt-1 text-sm text-slate-400">
              ລູກຄ້າ: {r.customerName ?? r.customerCode} ({r.customerCode})
            </p>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-slate-200">
            {REDEMPTION_STATUS_LABEL[r.status]}
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-slate-500">ແຕ້ມທີ່ໃຊ້</dt><dd className="font-bold text-orange-300">{r.pointsSpent.toLocaleString()}</dd></div>
          <div><dt className="text-slate-500">ຂອງລາງວັນ</dt><dd className="text-slate-200">{r.freeQty != null && r.unitCode ? `${r.freeQty} ${r.unitCode}` : "—"}</dd></div>
          <div><dt className="text-slate-500">ລະຫັດສິນຄ້າ</dt><dd className="text-slate-200">{r.icCode ?? "—"}</dd></div>
          <div><dt className="text-slate-500">ໃບຂໍເບີກ (SML)</dt><dd className="text-slate-200">{r.smlDocNo ?? "—"}</dd></div>
        </dl>
        {r.note && <p className="mt-3 rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300">{r.note}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-black text-slate-800">ກຳນົດສາງຈ່າຍ ແລະ ຈັດສົ່ງ</h2>
        <RedemptionControl id={r.id} status={r.status} options={options} />
      </div>
    </div>
  );
}
