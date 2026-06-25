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
  getAiKnowledge,
  getDeliveryConfig,
} from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { countHumanTakenThreads } from "@/lib/chat";
import { getRecentAiLogs } from "@/lib/ai-logs";
import SettingsContainer from "./SettingsContainer";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");

  const [notice, announcement, bank, onepay, codEnabled, webGroups, chatBot, chatHandoffs, aiLogs, aiKnowledge, deliveryConfig] = await Promise.all([
    getDevNotice(),
    getAnnouncement(),
    getBankTransfer(),
    getOnepayRuntimeConfig(),
    getCodEnabled(),
    listWebGroupOptions(),
    getChatBotEnabled(),
    countHumanTakenThreads(),
    getRecentAiLogs(8).catch(() => []),
    getAiKnowledge(),
    getDeliveryConfig(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ຕັ້ງຄ່າລະບົບ"
        subtitle="ຈັດການການຕັ້ງຄ່າທົ່ວໄປ, ຊ່ອງທາງການຊຳລະເງິນ, ກຸ່ມສິນຄ້າ, ແລະ ລະບົບແຊັດບັອດ AI."
      />

      <SettingsContainer
        notice={notice}
        announcement={announcement}
        bank={bank}
        onepay={onepay}
        codEnabled={codEnabled}
        webGroups={webGroups}
        chatBot={chatBot}
        chatHandoffs={chatHandoffs}
        aiLogs={aiLogs}
        aiKnowledge={aiKnowledge}
        deliveryConfig={deliveryConfig}
      />
    </div>
  );
}
