"use client";

import { useState } from "react";
import DevNoticeForm from "./DevNoticeForm";
import AnnouncementForm from "./AnnouncementForm";
import BankTransferForm from "./BankTransferForm";
import OnepayTestForm from "./OnepayTestForm";
import CodToggleForm from "./CodToggleForm";
import WebGroupsForm from "./WebGroupsForm";
import ChatBotToggleForm from "./ChatBotToggleForm";
import ChatBotTestForm from "./ChatBotTestForm";
import ChatBotMaintenanceForm from "./ChatBotMaintenanceForm";
import ChatBotLogs from "./ChatBotLogs";
import AiKnowledgeForm from "./AiKnowledgeForm";
import DeliveryConfigForm from "./DeliveryConfigForm";
import { Card, CardTitle } from "@/components/admin/ui";

import type {
  DevNotice,
  Announcement,
  BankTransfer,
  OnepayRuntimeConfig,
  AiKnowledge,
  DeliveryConfig,
  WebGroupOption,
} from "@/lib/settings";
import type { AiLogRow } from "@/lib/ai-logs";

interface SettingsContainerProps {
  notice: DevNotice;
  announcement: Announcement;
  bank: BankTransfer;
  onepay: OnepayRuntimeConfig;
  codEnabled: boolean;
  webGroups: WebGroupOption[];
  chatBot: boolean;
  chatHandoffs: number;
  aiLogs: AiLogRow[];
  aiKnowledge: AiKnowledge;
  deliveryConfig: DeliveryConfig;
}

type TabType = "general" | "payments" | "catalog" | "ai";

export default function SettingsContainer({
  notice,
  announcement,
  bank,
  onepay,
  codEnabled,
  webGroups,
  chatBot,
  chatHandoffs,
  aiLogs,
  aiKnowledge,
  deliveryConfig,
}: SettingsContainerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("general");

  const tabs = [
    {
      id: "general" as TabType,
      label: "ຕັ້ງຄ່າທົ່ວໄປ",
      desc: "ໂໝດພັດທະນາ, ປະກາດ ແລະ ຈັດສົ່ງ",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: "payments" as TabType,
      label: "ຊ່ອງທາງການຊຳລະ",
      desc: "COD, OnePay ແລະ ບັນຊີໂອນ",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      id: "catalog" as TabType,
      label: "ສິນຄ້າ ແລະ ກຸ່ມຂາຍ",
      desc: "ກຸ່ມສິນຄ້າ ERP ທີ່ສະແດງໃນເວັບ",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: "ai" as TabType,
      label: "ແຊັດບັອດ & AI",
      desc: "ເປີດໃຊ້ AI, ຖານຂໍ້ມູນ ແລະ ປະຫວັດ",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Sidebar Navigation */}
      <aside className="flex flex-col">
        {/* Mobile horizontal pill navigation */}
        <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-slate-100 p-1 text-[11px] lg:hidden print:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[90px] rounded-xl py-2 text-center font-bold transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label.split(" ")[0]} {/* Show short label on mobile */}
            </button>
          ))}
        </div>

        {/* Desktop vertical sidebar navigation */}
        <div className="hidden space-y-1 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm lg:block print:hidden">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left rounded-xl p-3 flex gap-3 items-start transition-all duration-250 cursor-pointer ${
                  isActive
                    ? "bg-orange-50/70 text-orange-700 border-l-2 border-orange-600 pl-2.5"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={`rounded-lg p-1.5 border transition-all ${
                  isActive ? "bg-white border-orange-200/50" : "bg-slate-50 border-slate-100"
                }`}>
                  {tab.icon}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <span className={`block text-xs font-black ${isActive ? "text-orange-950" : "text-slate-700"}`}>
                    {tab.label}
                  </span>
                  <span className="mt-1 block text-[10px] text-slate-450 font-semibold truncate">
                    {tab.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Settings Forms Body Content */}
      <main className="space-y-6">
        {/* GENERAL SETTINGS */}
        {activeTab === "general" && (
          <>
            <Card>
              <CardTitle hint="ສະແດງແຈ້ງເຕືອນ pop-up ຢູ່ໜ້າຫຼັກຂອງຮ້ານເພື່ອແຈ້ງໃຫ້ລູກຄ້າຮູ້ວ່າລະບົບກຳລັງທົດລອງ.">
                ໂໝດພັດທະນາ
              </CardTitle>
              <DevNoticeForm initial={notice} />
            </Card>

            <Card>
              <CardTitle hint="ແຖບບາງໆເທິງສຸດຂອງໜ້າຮ້ານ (ເຊັ່ນ: ໂປຣໂມຊັນ ຫຼື ແຈ້ງການຈັດສົ່ງ).">
                ແຖບປະກາດໜ້າຮ້ານ
              </CardTitle>
              <AnnouncementForm initial={announcement} />
            </Card>

            <Card>
              <CardTitle hint="ຂໍ້ຄວາມຄາດການຈັດສົ່ງ ສະແດງໃນໜ້າຢືນຢັນຄຳສັ່ງຊື້.">
                ຄາດການຈັດສົ່ງ
              </CardTitle>
              <DeliveryConfigForm initial={deliveryConfig} />
            </Card>
          </>
        )}

        {/* PAYMENTS SETTINGS */}
        {activeTab === "payments" && (
          <>
            <Card className="border-orange-100/50">
              <CardTitle hint="ເປີດ/ປິດ ການເກັບເງິນປາຍທາງ (COD) ຢູ່ໜ້າຊຳລະ.">
                ການຊຳລະ — ເກັບເງິນປາຍທາງ (COD)
              </CardTitle>
              <CodToggleForm initial={codEnabled} />
            </Card>

            <Card className="border-amber-100/50">
              <CardTitle hint="ສຳລັບທົດສອບ QR ດ້ວຍຍອດນ້ອຍ; ຄ່າເລີ່ມຕົ້ນ 1 ₭.">
                OnePay — ໂໝດທົດສອບ
              </CardTitle>
              <OnepayTestForm initial={onepay} />
            </Card>

            <Card>
              <CardTitle hint="ສະແດງໃຫ້ລູກຄ້າທີ່ເລືອກ “ໂອນເງິນ” ຫຼັງສັ່ງຊື້ສຳເລັດ.">
                ບັນຊີໂອນເງິນ & BCEL QR
              </CardTitle>
              <BankTransferForm initial={bank} />
            </Card>
          </>
        )}

        {/* CATALOG SETTINGS */}
        {activeTab === "catalog" && (
          <Card>
            <CardTitle hint="ເລືອກກຸ່ມສິນຄ້າ ERP ທີ່ຈະເປີດຂາຍໃນ web (storefront + ລາຍການສິນຄ້າ admin).">
              ກຸ່ມສິນຄ້າທີ່ຂາຍໃນ web
            </CardTitle>
            <WebGroupsForm options={webGroups} />
          </Card>
        )}

        {/* AI CHATBOT SETTINGS */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <Card>
              <CardTitle hint="ຜູ້ຊ່ວຍ AI ຕອບລູກຄ້າໃນແຊັດຈາກຂໍ້ມູນ DB (ຕັ້ງ OPENAI_API_KEY; Anthropic ເປັນ fallback).">
                ແຊັດ — ຜູ້ຊ່ວຍ AI
              </CardTitle>
              <ChatBotToggleForm initial={chatBot} />
            </Card>

            <Card>
              <CardTitle hint="ຖານຂໍ້ມູນຄວາມຮູ້ສຳລັບ AI ຕອບລູກຄ້າ.">
                ຖານຂໍ້ມູນຄວາມຮູ້ AI
              </CardTitle>
              <AiKnowledgeForm initial={aiKnowledge} />
            </Card>

            <Card>
              <CardTitle hint="ຈັດການ ແລະ ຣີເຊັດສະຖານະການສົນທະນາທີ່ພະນັກງານຮັບຊ່ວງ.">
                ຈັດການສະຖານະ Handovers
              </CardTitle>
              <ChatBotMaintenanceForm handoffCount={chatHandoffs} />
            </Card>

            <Card>
              <CardTitle hint="ລອງຖາມຖາມ-ຕອບກັບ AI ເພື່ອທົດສອບຄວາມຖືກຕ້ອງ.">
                ທົດສອບແຊັດບັອດ
              </CardTitle>
              <ChatBotTestForm />
            </Card>

            <Card>
              <CardTitle hint="ປະຫວັດການເອີ້ນໃຊ້ງານ AI ຫຼ້າສຸດໃນລະບົບ.">
                ປະຫວັດການເຮັດວຽກຂອງ AI (Logs)
              </CardTitle>
              <ChatBotLogs logs={aiLogs} />
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
