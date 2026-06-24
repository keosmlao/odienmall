import { redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import {
  getDevNotice,
  getAnnouncement,
  getBankTransfer,
  getOnepayRuntimeConfig,
  getCodEnabled,
  listWebGroupOptions,
  getChatBotEnabled,
} from "@/lib/settings";
import { PageHeader, Card, CardTitle } from "@/components/admin/ui";
import DevNoticeForm from "./DevNoticeForm";
import AnnouncementForm from "./AnnouncementForm";
import BankTransferForm from "./BankTransferForm";
import OnepayTestForm from "./OnepayTestForm";
import CodToggleForm from "./CodToggleForm";
import WebGroupsForm from "./WebGroupsForm";
import ChatBotToggleForm from "./ChatBotToggleForm";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");

  const [notice, announcement, bank, onepay, codEnabled, webGroups, chatBot] = await Promise.all([
    getDevNotice(),
    getAnnouncement(),
    getBankTransfer(),
    getOnepayRuntimeConfig(),
    getCodEnabled(),
    listWebGroupOptions(),
    getChatBotEnabled(),
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

      <Card className="mb-6">
        <CardTitle hint="ເລືອກກຸ່ມສິນຄ້າ ERP ທີ່ຈະເປີດຂາຍໃນ web (storefront + ລາຍການສິນຄ້າ admin).">
          ກຸ່ມສິນຄ້າທີ່ຂາຍໃນ web
        </CardTitle>
        <WebGroupsForm options={webGroups} />
      </Card>

      <Card className="mb-6">
        <CardTitle hint="ຜູ້ຊ່ວຍ AI ຕອບລູກຄ້າໃນແຊັດຈາກຂໍ້ມູນ DB (ຕັ້ງ OPENAI_API_KEY; Anthropic ເປັນ fallback).">
          ແຊັດ — ຜູ້ຊ່ວຍ AI
        </CardTitle>
        <ChatBotToggleForm initial={chatBot} />
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
