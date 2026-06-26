import { redirect } from "next/navigation";
import { isManager } from "@/lib/auth";
import { getPointRules } from "@/lib/engage-points";
import { PageHeader } from "@/components/admin/ui";
import PointRulesForm from "./PointRulesForm";

export const dynamic = "force-dynamic";

export default async function PointRulesPage() {
  if (!(await isManager())) redirect("/admin");
  const rules = await getPointRules();

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="ເງື່ອນໄຂການສະສົມແຕ້ມ"
        subtitle="ເປີດ/ປິດ ແລະ ກຳນົດແຕ້ມ — ແຕ້ມເຂົ້າ ar_customer.point_balance ໂດຍກົງ"
      />
      <PointRulesForm initial={rules} />
      
      <div className="rounded-2xl border border-slate-150 bg-white p-5 text-xs text-slate-500 space-y-2.5 leading-relaxed shadow-sm">
        <p className="font-extrabold text-slate-800 text-sm mb-1">ໝາຍເຫດ ແລະ ຂໍ້ກຳນົດ:</p>
        <p>• ທີ່ຢູ່ ແລະ ວັນເກີດ ໃຫ້ຄະແນນ <span className="text-orange-600 font-bold">ຄັ້ງດຽວຕໍ່ລູກຄ້າ</span> (ປ້ອງກັນການຮັບຊ້ຳໂດຍການກວດສອບ ledger)</p>
        <p>• ຮັບແຕ້ມປະຈຳວັນ (Collect) ແລະ ການແບ່ງປັນ (Share) ຈະຖືກຈຳກັດຈຳນວນຄັ້ງຕໍ່ມື້</p>
        <p>• ລະບົບຈະບັນທຶກທຸກໆເຫດການການໃຫ້ແຕ້ມລົງໃນຕາຕະລາງ <code className="font-mono bg-slate-50 px-1.5 py-0.5 rounded text-[10px]">odg_ecom.point_events</code> ເພື່ອເປັນຫຼັກຖານ</p>
      </div>
    </div>
  );
}
