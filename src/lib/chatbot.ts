import "server-only";
import { query } from "./db";
import { aiCompleteDetailed, aiConfigured, type AiMessage } from "./ai";
import { postMessage, getThreadMessages, getThreadCustomerCode, countBotReplies } from "./chat";
import { getOrdersByCustomer, getOrderByNo, getOrderNosByPhone, getOrderTms } from "./orders";
import { STATUS_LABEL, type OrderStatus } from "./order-constants";
import { getAiKnowledge, getChatBotEnabled } from "./settings";
import { activeFlashMap } from "./flash";
import { FAQS, POLICIES } from "./pages-content";
import { logAiChat } from "./ai-logs";

export { aiConfigured };

// Max AI replies per thread per 24h — a cost/abuse guard. Beyond this the bot
// hands the thread to a human instead of answering.
const BOT_DAILY_CAP = 40;

function statusLabel(s: string): string {
  return STATUS_LABEL[s as OrderStatus] ?? s;
}

const SHOP_INFO = `ຮ້ານ OdienMall (ODG) — ຮ້ານຄ້າອອນລາຍຂາຍເຄື່ອງໃຊ້ໄຟຟ້າ, ແອ, ອຸປະກອນກໍ່ສ້າງ ແລະ ອື່ນໆ.
ໂທ: +856 20 5992 9992 · ທີ່ຢູ່: ບ້ານ ຂົວຫຼວງ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ.
ການຊຳລະ: ໂອນຜ່ານ BCEL One (QR) ຫຼື ເກັບເງິນປາຍທາງ (COD). ຈັດສົ່ງ: ໂອດ້ຽນຂົນສົ່ງ / ຂົນສົ່ງທັນໃຈ.`;

// Sentinel the model emits when it cannot help and a human should take over.
const HANDOFF = "<<HANDOFF>>";

/** Top web products matching the question (name / code / brand / category). */
async function findProducts(text: string): Promise<string> {
  const words = text
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 4);
  if (words.length === 0) return "";
  const likes = words.map(
    (_, i) =>
      `(i.name_1 ilike $${i + 1} or i.name_eng_1 ilike $${i + 1} or i.code ilike $${i + 1}
        or br.name_1 ilike $${i + 1} or ca.name_1 ilike $${i + 1})`,
  );
  const params = words.map((w) => `%${w}%`);
  const rows = await query<{ code: string; name: string; brand: string | null; price: string | null; stock: number }>(
    `select i.code,
            coalesce(nullif(i.name_1,''), nullif(i.name_eng_1,''), i.code) as name,
            nullif(br.name_1,'') as brand,
            (select min(b.price) from public.ic_inventory_barcode b where b.ic_code = i.code and b.price > 0) as price,
            coalesce(i.balance_qty,0)::int as stock
       from public.ic_inventory i
       left join public.ic_brand    br on br.code = i.item_brand
       left join public.ic_category ca on ca.code = i.item_category
      where i.is_eordershow = 1
        and i.group_main in (select group_main from odg_ecom.web_groups)
        and coalesce(i.balance_qty,0) > 0
        and (${likes.join(" or ")})
      order by (i.item_promote = 1) desc, i.balance_qty desc
      limit 8`,
    params,
  );
  if (rows.length === 0) return "";
  const flash = await activeFlashMap().catch(() => new Map<string, number>());
  return rows
    .map((r) => {
      const deal = flash.get(r.code);
      const priceTxt = r.price
        ? deal != null && deal < Number(r.price)
          ? `${deal.toLocaleString("en-US")} ກີບ (FLASH SALE! ປົກກະຕິ ${Number(r.price).toLocaleString("en-US")})`
          : `${Number(r.price).toLocaleString("en-US")} ກີບ`
        : "ສອບຖາມລາຄາ";
      return `- ${r.name}${r.brand ? ` [${r.brand}]` : ""} (ລະຫัด ${r.code}): ${priceTxt}, ມີ ${r.stock} ໃນສະຕັອກ`;
    })
    .join("\n");
}

export interface ChatBotTestResult {
  ok: boolean;
  provider: "openai" | "anthropic" | "none";
  model: string | null;
  botEnabled: boolean;
  hasDbContext: boolean;
  reply: string | null;
  error: string | null;
}

function activeProvider(): Pick<ChatBotTestResult, "provider" | "model"> {
  const openAiModel = process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";
  const anthropicModel = process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001";
  if (process.env.OPENAI_API_KEY?.trim()) return { provider: "openai", model: openAiModel };
  if (process.env.ANTHROPIC_API_KEY?.trim()) return { provider: "anthropic", model: anthropicModel };
  return { provider: "none", model: null };
}

const ORDER_RE = /\b((?:OM|CAE)[A-Z0-9@]+)\b/i;
const PHONE_RE = /(\d[\d\s-]{6,}\d)/;

/** Delivery (TMS) note for a shipping/completed order, if any. */
async function deliveryNote(orderNo: string): Promise<string> {
  const tms = await getOrderTms(orderNo).catch(() => null);
  if (!tms) return "";
  if (tms.sentEnd) return ` (ຈັດສົ່ງສຳເລັດ ${new Date(tms.sentEnd).toLocaleDateString("lo-LA")})`;
  if (tms.sentStart) return ` (ກຳລັງຈັດສົ່ງ ຕັ້ງແຕ່ ${new Date(tms.sentStart).toLocaleDateString("lo-LA")})`;
  if (tms.dateLogistic) return ` (ນັດສົ່ງ ${new Date(tms.dateLogistic).toLocaleDateString("lo-LA")})`;
  return " (ຮັບເຂົ້າລະບົບຂົນສົ່ງແລ້ວ)";
}

/** The customer's orders from DB — logged-in account, an order number, or a phone
 *  number they provide (guest tracking) — with live delivery status. */
async function findOrders(threadId: number, text: string): Promise<string> {
  const custCode = await getThreadCustomerCode(threadId);
  const lines: string[] = [];
  const seen = new Set<string>();
  const add = async (o: { orderNo: string; status: string; subtotal: number; itemCount?: number; createdAt?: string }) => {
    if (seen.has(o.orderNo)) return;
    seen.add(o.orderNo);
    const tail = o.status === "shipping" || o.status === "completed" ? await deliveryNote(o.orderNo) : "";
    lines.push(
      `- ອໍເດີ ${o.orderNo}: ${statusLabel(o.status)}${tail} · ${o.subtotal.toLocaleString("en-US")} ກີບ${o.createdAt ? ` · ${new Date(o.createdAt).toLocaleDateString("lo-LA")}` : ""}`,
    );
  };

  if (custCode) {
    const orders = await getOrdersByCustomer(custCode).catch(() => []);
    for (const o of orders.slice(0, 5)) await add(o);
  }

  // Order number mentioned — only reveal if it belongs to this customer (privacy).
  const m = text.match(ORDER_RE);
  if (m) {
    const ord = await getOrderByNo(m[1]).catch(() => null);
    if (ord && (!custCode || ord.customerCode === custCode)) {
      await add({ orderNo: ord.orderNo, status: ord.status, subtotal: ord.subtotal });
    }
  }

  // Guest tracking by phone (public, like the /track page) when not logged in.
  if (!custCode && lines.length === 0) {
    const pm = text.match(PHONE_RE);
    const digits = pm?.[1].replace(/\D/g, "");
    if (digits && digits.length >= 8) {
      const nos = await getOrderNosByPhone(digits).catch(() => []);
      for (const no of nos.slice(0, 5)) {
        const ord = await getOrderByNo(no).catch(() => null);
        if (ord) await add({ orderNo: ord.orderNo, status: ord.status, subtotal: ord.subtotal });
      }
    }
  }
  return lines.join("\n");
}

async function getExtraKnowledge(): Promise<string> {
  const k = await getAiKnowledge().catch(() => null);
  if (!k?.enabled) return "";
  return k.content.trim().slice(0, 8000);
}

function buildSystem(productContext: string, orderContext: string, extraKnowledge = ""): string {
  const faq = FAQS.map((f) => `ຖາມ: ${f.q}\nຕอບ: ${f.a}`).join("\n\n");
  const policies = Object.values(POLICIES)
    .map((p) => `${p.title}:\n${p.body.join("\n")}`)
    .join("\n\n");
  return `ເຈົ້າແມ່ນ "ຜູ້ຊ່ວຍ AI" ຂອງຮ້ານ OdienMall. ຕອບລູກຄ້າເປັນພາສາລາວ ສຸພາບ, ສັ້ນ ແລະ ກົງຈຸດ.

ກົດລະບຽບ:
- ຕອບໂດຍອີງຕາມຂໍ້ມູນທີ່ໃຫ້ລຸ່ມນີ້ເທົ່ານັ້ນ. ຫ້າມแต่ງລາຄາ ຫຼື ຂໍ້ມູນເອງ.
- ເລື່ອງ "ສະຖານะອໍເດີ": ຖ້າມີຂໍ້ມູນອໍເດີລຸ່ມນີ້ ໃຫ້ຕอບຈາກນັ້ນໂດຍກົງ. ຖ້າບໍ່ມີ (ລູກຄ້າຍັງບໍ່ login ຫຼື ບໍ່ພົບອໍເດີ) ໃຫ້ຂໍໃຫ້ login ຫຼື ສົ່ງເລກອໍເດີ; ຖ້າຍັງບໍ່ໄດ້ ໃຫ້ສົ່ງຕໍ່ພະນັກງານ (${HANDOFF}).
- ການຮ້ອງຮຽນ, ຄືນ/ຄືນເງິນສະເພาະบุคคล, ຫຼື ເລື່ອງທີ່ບໍ່ມີໃນຂໍ້ມູນ — ຫຼື ລູກຄ້າຂໍລົມກັບพนักงาน — ໃຫ້ຕอບສັ້ນໆ ແລ້ວຕໍ່ທ້າຍດ້ວຍ ${HANDOFF}
- ບໍ່ຮູ້ ກໍບອກວ່າບໍ່ຮູ້ ແລ້ວສົ່ງຕໍ່ພະນັກງານ (${HANDOFF}).

- ຫ້າມສັນຍາສ່ວນຫຼຸດ/ລາຄາພິເສດ/ຂອງແຖມ ຖ້າບໍ່ມີໃນຂໍ້ມູນ.
- ຫ້າມຢືນຢັນວັນຈັດສົ່ງ, ການຮັບປະກັນສະເພາະ, ຫຼື ການຄືນເງິນແທນພະນັກງານ.
- ຫ້າມຂໍ ຫຼື ສະແດງຂໍ້ມູນລັບ: password, OTP, ເລກບັດ, token, API key.
- ຖ້າລູກຄ້າສົ່ງເລກໂທ ຫຼື ເລກອໍເດີ ໃຫ້ໃຊ້ເພື່ອຕິດຕາມເທົ່ານັ້ນ; ຢ່າເປີດເຜີຍຂໍ້ມູນສ່ວນຕົວອື່ນ.

ຂໍ້ມູນຮ້ານ:
${SHOP_INFO}

${orderContext ? `ອໍເດີຂອງລູກຄ້າຄົນນີ້ (ຈາກລະບົບ):\n${orderContext}\n` : ""}
${productContext ? `ສິນຄ້າທີ່ກ່ຽວຂ້ອງກັບຄຳຖາມ (ຈາກລະບົບ):\n${productContext}\n` : ""}
${extraKnowledge ? `ຄວາມຮູ້/FAQ ພິເສດຈາກ admin:\n${extraKnowledge}\n` : ""}
ຄຳຖາມ-ຄຳຕອບ ທີ່ພົບເລື້ອຍ:
${faq}

ນະໂຍບາຍ:
${policies}`;
}

/** Manager-facing smoke test for /admin/settings: validates toggle, provider,
 * DB grounding and the actual AI API in one call. */
export async function testChatBot(question: string): Promise<ChatBotTestResult> {
  const provider = activeProvider();
  const botEnabled = await getChatBotEnabled().catch(() => true);
  const text = question.trim() || "ມີຕູ້ເຢັນຫຍັງແນະນຳແດ່";
  if (!aiConfigured()) {
    return {
      ok: false,
      ...provider,
      botEnabled,
      hasDbContext: false,
      reply: null,
      error: "ຍັງບໍ່ມີ OPENAI_API_KEY ຫຼື ANTHROPIC_API_KEY",
    };
  }
  if (!botEnabled) {
    return {
      ok: false,
      ...provider,
      botEnabled,
      hasDbContext: false,
      reply: null,
      error: "bot ຖືກປິດໃນ /admin/settings",
    };
  }

  try {
    const productContext = await findProducts(text);
    const system = buildSystem(productContext, "", await getExtraKnowledge());
    const ai = await aiCompleteDetailed(system, [{ role: "user", content: text }], {
      maxTokens: 350,
      temperature: 0.2,
    });
    const reply = ai.text;
    await logAiChat({
      event: "settings.test",
      provider: ai.provider,
      model: ai.model,
      ok: !!reply,
      hasDbContext: !!productContext,
      latencyMs: ai.latencyMs,
      prompt: text,
      reply,
      error: ai.error,
    });
    if (!reply) {
      return {
        ok: false,
        provider: ai.provider,
        model: ai.model,
        botEnabled,
        hasDbContext: !!productContext,
        reply: null,
        error: ai.error ?? "AI API ບໍ່ສົ່ງຄຳຕອບກັບມາ",
      };
    }
    return {
      ok: true,
      provider: ai.provider,
      model: ai.model,
      botEnabled,
      hasDbContext: !!productContext,
      reply: reply.replaceAll(HANDOFF, "").trim() || reply,
      error: null,
    };
  } catch (e) {
    return {
      ok: false,
      ...provider,
      botEnabled,
      hasDbContext: false,
      reply: null,
      error: e instanceof Error ? e.message : "ທົດສອບ AI ບໍ່ສຳເລັດ",
    };
  }
}

async function setHumanTaken(threadId: number): Promise<void> {
  await query(`update odg_ecom.chat_threads set human_taken = true where id = $1`, [threadId]).catch(() => {});
}

/**
 * Generate + post the AI assistant's reply to the latest customer message.
 * Best-effort: never throws. Hands off to a human (sets human_taken) when the
 * model emits the handoff sentinel or the AI is unavailable.
 */
export async function botReply(threadId: number, latestText: string): Promise<void> {
  if (!aiConfigured()) return; // no key → leave it for a human admin
  try {
    if (!(await getChatBotEnabled())) return; // manager switched the bot off

    // Once a human admin has taken over the thread, the bot stays quiet.
    const t = await query<{ human_taken: boolean }>(
      `select human_taken from odg_ecom.chat_threads where id = $1`,
      [threadId],
    );
    if (t[0]?.human_taken) return;

    // Cost/abuse guard — beyond the daily cap, hand off to a human.
    if ((await countBotReplies(threadId, 24)) >= BOT_DAILY_CAP) {
      await postMessage(threadId, "admin", "ກຳລັງສົ່ງຕໍ່ໃຫ້ພະນັກງານຊ່ວຍທ່ານ — ກະລຸນາລໍຖ້າ 🙏", true);
      await setHumanTaken(threadId);
      return;
    }

    const history = await getThreadMessages(threadId, 0);
    const recent = history.slice(-10);
    const [productContext, orderContext] = await Promise.all([
      findProducts(latestText),
      findOrders(threadId, latestText),
    ]);
    const system = buildSystem(productContext, orderContext, await getExtraKnowledge());
    const messages: AiMessage[] = recent.map((m) => ({
      role: m.sender === "customer" ? "user" : "assistant",
      content: m.body,
    }));
    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      messages.push({ role: "user", content: latestText });
    }

    const ai = await aiCompleteDetailed(system, messages);
    const reply = ai.text;
    await logAiChat({
      threadId,
      event: "bot.reply",
      provider: ai.provider,
      model: ai.model,
      ok: !!reply,
      hasDbContext: !!productContext || !!orderContext,
      latencyMs: ai.latencyMs,
      prompt: latestText,
      reply,
      error: ai.error,
    });
    if (!reply) {
      // Transient AI outage (no credits / timeout / rate limit). Do NOT mark the
      // thread human_taken — that would permanently silence the bot even after the
      // outage clears. Post a brief notice at most once (skip if the last message
      // is already that notice) so it doesn't spam during an outage.
      const last = recent[recent.length - 1];
      const prev = recent[recent.length - 2];
      const NOTE = "ຂໍໂທດ ຕອນນີ້ຕອບອັດຕະໂນມັດບໍ່ໄດ້ຊົ່ວຄາວ — ພະນັກງານຈະຕອບໃຫ້ໄວໆ ຫຼື ລອງພິມໃໝ່ອີກຄັ້ງ 🙏";
      const alreadyNoted = (last?.isBot && last.body === NOTE) || (prev?.isBot && prev.body === NOTE);
      if (!alreadyNoted) await postMessage(threadId, "admin", NOTE, true);
      return;
    }

    const handoff = reply.includes(HANDOFF);
    const clean = reply.replaceAll(HANDOFF, "").trim();
    if (clean) await postMessage(threadId, "admin", clean, true);
    if (handoff) {
      await postMessage(threadId, "admin", "ກຳລັງສົ່ງຕໍ່ໃຫ້ພະນັກງານຊ່ວຍເພີ່ມເຕີມ — ກະລຸນາລໍຖ້າສັກครู่ 🙏", true);
      await setHumanTaken(threadId);
    }
  } catch (e) {
    console.error("botReply failed:", e);
  }
}
