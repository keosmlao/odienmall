import { redirect } from "next/navigation";
import { isManager } from "@/lib/auth";
import { getTierConfig } from "@/lib/member-tier";
import TierList from "./TierList";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ຂັ້ນສະມາຊິກ" };

export default async function TierSettingsPage() {
  if (!(await isManager())) redirect("/admin");

  const tiers = await getTierConfig();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">ຂັ້ນສະມາຊິກ</h1>
        <p className="mt-1 text-sm text-slate-400 leading-relaxed">
          ຈັດການຍອດສະສົມຂັ້ນຕ່ຳ ແລະ ສ່ວນຫຼຸດຂອງແຕ່ລະຂັ້ນສະມາຊິກ ( overlay ຂໍ້ມູນ ERP ຂອງ <code className="text-orange-400">public.ar_group_sub</code> )
        </p>
      </div>

      {tiers.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-400">
          ບໍ່ພົບຂໍ້ມູນ ar_group_sub (status=1) — ກວດສອບ ERP
        </div>
      ) : (
        <TierList initialTiers={tiers} />
      )}

      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 text-xs text-slate-400 space-y-2 leading-relaxed">
        <p className="font-extrabold text-slate-350 text-sm mb-1">ວິທີການ auto-upgrade ແລະ ຂໍ້ກຳນົດ:</p>
        <p>• ທຸກຄົນທີ່ login ຜ່ານ web ຈະໄດ້ຮັບ <span className="text-orange-450 font-bold">ຂັ້ນເລີ່ມຕົ້ນ (Gold)</span> ທັນທີ</p>
        <p>• ຍອດຊື້ສະສົມ (CAE web orders) ຮອດ <span className="font-bold text-white">ຍອດຂັ້ນຕ່ຳ</span> → ລະບົບຈະອັບຂັ້ນ ແລະ ຂຽນ ERP (ar_customer_detail) ໃຫ້ໂດຍອັດຕະໂນມັດ</p>
        <p>• ລະບົບຈະເຮັດວຽກສະເພາະ upgrade ເທົ່ານັ້ນ — ຈະບໍ່ມີການ downgrade ຂັ້ນທີ່ ERP ກຳນົດໄວ້ແລ້ວ</p>
        <p>• ຂໍ້ມູນສ່ວນຫຼຸດ ແລະ ຍອດຂັ້ນຕ່ຳທີ່ແກ້ໄຂໃນໜ້ານີ້ ຈະຖືກ overlay ເທິງເວັບໄຊທ໌ໂດຍບໍ່ມີຜົນກະທົບຕໍ່ຖານຂໍ້ມູນຫຼັກຂອງ ERP</p>
      </div>
    </div>
  );
}
