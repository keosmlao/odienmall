import { redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import {
  getDevNotice,
  getAnnouncement,
  getBankTransfer,
  getOnepayRuntimeConfig,
  getCodEnabled,
} from "@/lib/settings";
import { PageHeader, Card, CardTitle } from "@/components/admin/ui";
import DevNoticeForm from "./DevNoticeForm";
import AnnouncementForm from "./AnnouncementForm";
import BankTransferForm from "./BankTransferForm";
import OnepayTestForm from "./OnepayTestForm";
import CodToggleForm from "./CodToggleForm";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");

  const [notice, announcement, bank, onepay, codEnabled] = await Promise.all([
    getDevNotice(),
    getAnnouncement(),
    getBankTransfer(),
    getOnepayRuntimeConfig(),
    getCodEnabled(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="ຕັ້ງຄ່າ"
        subtitle="ໂໝດພັດທະນາ — ສະແດງ modal ເຕືອນຢູ່ໜ້າຫຼັກໃນຊ່ວງທີ່ກຳລັງພັດທະນາ."
      />

      <Card className="mb-6">
        <CardTitle>ໂໝດພັດທະນາ</CardTitle>
        <DevNoticeForm initial={notice} />
      </Card>

      <Card className="mb-6">
        <CardTitle hint="ແຖບບາງໆເທິງສຸດຂອງໜ້າຮ້ານ (ເຊັ່ນ: ໂປຣໂມຊັນ ຫຼື ແຈ້ງການຈັດສົ່ງ).">
          ແຖບປະກາດ
        </CardTitle>
        <AnnouncementForm initial={announcement} />
      </Card>

      <Card className="mb-6 border-amber-100">
        <CardTitle hint="ສຳລັບທົດສອບ QR ດ້ວຍຍອດນ້ອຍ; ຄ່າເລີ່ມຕົ້ນ 1 ₭.">
          OnePay — ໂໝດທົດສອບ
        </CardTitle>
        <OnepayTestForm initial={onepay} />
      </Card>

      <Card className="mb-6 border-orange-100">
        <CardTitle hint="ເປີດ/ປິດ ການເກັບເງິນປາຍທາງ (COD) ຢູ່ໜ້າຊຳລະ.">
          ການຊຳລະ — ເກັບເງິນປາຍທາງ (COD)
        </CardTitle>
        <CodToggleForm initial={codEnabled} />
      </Card>

      <Card>
        <CardTitle hint="ສະແດງໃຫ້ລູກຄ້າທີ່ເລືອກ “ໂອນເງິນ” ຫຼັງສັ່ງຊື້ສຳເລັດ.">
          ບັນຊີໂອນເງິນ
        </CardTitle>
        <BankTransferForm initial={bank} />
      </Card>
    </div>
  );
}
