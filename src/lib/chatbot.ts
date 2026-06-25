import "server-only";
import { query } from "./db";
import { aiCompleteDetailed, aiConfigured, type AiMessage, type AiProvider } from "./ai";
import { postMessage, getThreadMessages, getThreadCustomerCode, countBotReplies } from "./chat";
import { getOrdersByCustomer, getTrackOrderByNo, getOrderNosByPhone, getOrderTms } from "./orders";
import { STATUS_LABEL, type OrderStatus } from "./order-constants";
import { getAiKnowledge, getChatBotEnabled } from "./settings";
import { activeFlashMap } from "./flash";
import { logAiChat } from "./ai-logs";

export { aiConfigured };

// Max AI replies per thread per 24h — a cost/abuse guard. Beyond this the bot
// hands the thread to a human instead of answering.
const BOT_DAILY_CAP = 200;

function statusLabel(s: string): string {
  return STATUS_LABEL[s as OrderStatus] ?? s;
}

const SHOP_INFO = `ຮ້ານ OdienMall (ODG) — ເຄື່ອງໃຊ້ໄຟຟ້າ, ແອ, ອຸປະກອນກໍ່ສ້າງ.
ໂທ: +856 20 5992 9992 · ບ້ານຂົວຫຼວງ, ຈັນທະບູລີ, ວຽງຈັນ.
ຊຳລະ: BCEL One QR ຫຼື COD. ຈັດສົ່ງ: ໂອດ້ຽນຂົນສົ່ງ / ຂົນສົ່ງທັນໃຈ (ຟຣີ).
ວຽງຈັນ 1-2 ມື້, ຕ່າງແຂວງ 2-5 ມື້. ຄືນສິນຄ້າ: 7 ມື້ (ສະພາບເດີມ).`;

// Sentinel the model emits when it cannot help and a human should take over.
const HANDOFF = "<<HANDOFF>>";

function directPolicyReply(text: string): string | null {
  const q = text.toLowerCase();
  const compact = q.replace(/\s+/g, "");
  const asksShipping =
    compact.includes("ຂົນສົ່ງ") ||
    compact.includes("ຈັດສົ່ງ") ||
    compact.includes("ຄ່າສົ່ງ") ||
    compact.includes("ສົ່ງຂອງ") ||
    compact.includes("ສົ່ງເຄື່ອງ") ||
    q.includes("delivery") ||
    q.includes("shipping");
  if (asksShipping) {
    return [
      "ການຈັດສົ່ງຂອງ OdienMall ມີ 2 ທາງເລືອກ: ໂອດ້ຽນຂົນສົ່ງ ແລະ ຂົນສົ່ງທັນໃຈ.",
      "ຄ່າສົ່ງຕອນນີ້ແມ່ນຟຣີ 0 ກີບ ທັງ 2 ວິທີ.",
      "ໂດຍປົກກະຕິ ວຽງຈັນ 1-2 ມື້, ຕ່າງແຂວງ 2-5 ມື້.",
    ].join("\n");
  }
  return null;
}

const PRODUCT_STOP_WORDS = new Set([
  // Lao filler
  "ມີ", "ຫຍັງ", "ແນະນຳ", "ແນະນໍາ", "ລາຄາ", "ເທົ່າໃດ", "ສິນຄ້າ",
  "ຢາກ", "ຊື້", "ເບິ່ງ", "ຂໍ", "ສະບາຍດີ", "ບໍ", "ໄດ້", "ຢູ່",
  // English greetings / filler (also blocks short noise like "hi")
  "hi", "hello", "hey", "ok", "okay", "yes", "no", "please",
  "price", "product", "recommend", "thanks", "thank",
]);

function productSearchWords(text: string): string[] {
  const seen = new Set<string>();
  const words = text
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !PRODUCT_STOP_WORDS.has(w.toLowerCase()));
  const unique: string[] = [];
  for (const w of words) {
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(w);
    if (unique.length >= 6) break;
  }
  return unique;
}


/** Top web products matching the question (name / code / brand / category). */
async function findProducts(text: string): Promise<string> {
  const words = productSearchWords(text);
  if (words.length === 0) return "";
  const minMatchWords = words.length >= 3 ? 2 : 1;
  const hiddenSql = `not exists (
    select 1 from odg_ecom.product_overlays h
     where h.product_code = i.code and h.is_hidden
  )`;
  const likes = words.map(
    (_, i) =>
      `(i.name_1 ilike $${i + 1} or i.name_2 ilike $${i + 1} or i.name_eng_1 ilike $${i + 1}
        or i.code ilike $${i + 1} or br.name_1 ilike $${i + 1} or ca.name_1 ilike $${i + 1}
        or gm.name_1 ilike $${i + 1} or gs.name_1 ilike $${i + 1}
        or ov.description ilike $${i + 1} or i.description ilike $${i + 1})`,
  );
  const matchScoreSql = words
    .map(
      (_, i) =>
        `(case when ${likes[i]} then 1 else 0 end)`,
    )
    .join(" + ");
  const nameScoreSql = words
    .map(
      (_, i) =>
        `(case when i.code ilike $${i + 1}
             or i.name_1 ilike $${i + 1}
             or i.name_2 ilike $${i + 1}
             or i.name_eng_1 ilike $${i + 1}
          then 1 else 0 end)`,
    )
    .join(" + ");
  const params = words.map((w) => `%${w}%`);
  const whereSql = `
      i.is_eordershow = 1
      and i.group_main in (select group_main from odg_ecom.web_groups)
      and coalesce(i.balance_qty,0) > 0
      and ${hiddenSql}
      and (${matchScoreSql}) >= ${minMatchWords}`;
  const [rows, facets] = await Promise.all([
    query<{
      code: string;
      name: string;
      description: string | null;
      brand: string | null;
      category: string | null;
      groupName: string | null;
      price: string | null;
      rating: string | null;
      reviewCount: number;
      soldCount: string | null;
      isPromo: boolean;
      isNew: boolean;
    }>(
      `select i.code,
              coalesce(nullif(i.name_1,''), nullif(i.name_2,''), nullif(i.name_eng_1,''), i.code) as name,
              coalesce(nullif(ov.description,''), nullif(i.description,'')) as description,
              nullif(br.name_1,'') as brand,
              nullif(ca.name_1,'') as category,
              coalesce(nullif(gs.name_1,''), nullif(gm.name_1,'')) as "groupName",
              (select min(b.price) from public.ic_inventory_barcode b where b.ic_code = i.code and b.price > 0) as price,
              rt.rating::text as rating,
              coalesce(rt.review_count, 0)::int as "reviewCount",
              sold.sold::text as "soldCount",
              (i.item_promote = 1) as "isPromo",
              (i.is_new_item = 1) as "isNew",
              (${matchScoreSql}) as "matchScore",
              (${nameScoreSql}) as "nameScore"
       from public.ic_inventory i
       left join public.ic_brand    br on br.code = i.item_brand
       left join public.ic_category ca on ca.code = i.item_category
       left join public.ic_group gm on gm.code = i.group_main
       left join public.ic_group_sub gs on gs.code = i.group_sub
       left join odg_ecom.product_overlays ov on ov.product_code = i.code
       left join lateral (
         select avg(rv.rating)::numeric(3,2) as rating, count(*)::int as review_count
           from odg_ecom.reviews rv
          where rv.product_code = i.code and not rv.is_hidden
       ) rt on true
       left join lateral (
         select coalesce(sum(d.qty),0)::float8 as sold
           from public.ic_trans_detail d
           join public.ic_trans t
             on t.doc_no = d.doc_no and t.trans_flag = 44 and coalesce(t.is_cancel,0) = 0
          where d.item_code = i.code
       ) sold on true
      where ${whereSql}
      order by "matchScore" desc,
               "nameScore" desc,
               (i.item_promote = 1) desc,
               (i.is_new_item = 1) desc,
               rt.rating desc nulls last,
               sold.sold desc nulls last,
               i.balance_qty desc,
               i.code
      limit 5`,
      params,
    ),
    query<{ kind: string; name: string; n: number }>(
      `with matched as (
         select i.code, i.item_brand, i.item_category, i.group_main
           from public.ic_inventory i
           left join public.ic_brand    br on br.code = i.item_brand
           left join public.ic_category ca on ca.code = i.item_category
           left join public.ic_group gm on gm.code = i.group_main
           left join public.ic_group_sub gs on gs.code = i.group_sub
           left join odg_ecom.product_overlays ov on ov.product_code = i.code
          where ${whereSql}
       )
       select 'category' as kind, coalesce(nullif(c.name_1,''), m.item_category) as name, count(*)::int as n
         from matched m left join public.ic_category c on c.code = m.item_category
        where coalesce(nullif(m.item_category,''), '') <> ''
        group by c.name_1, m.item_category
       union all
       select 'brand' as kind, coalesce(nullif(b.name_1,''), m.item_brand) as name, count(*)::int as n
         from matched m left join public.ic_brand b on b.code = m.item_brand
        where coalesce(nullif(m.item_brand,''), '') <> ''
        group by b.name_1, m.item_brand
       union all
       select 'group' as kind, coalesce(nullif(g.name_1,''), m.group_main) as name, count(*)::int as n
         from matched m left join public.ic_group g on g.code = m.group_main
        where coalesce(nullif(m.group_main,''), '') <> ''
        group by g.name_1, m.group_main
       order by n desc, name
       limit 6`,
      params,
    ).catch(() => []),
  ]);
  if (rows.length === 0) return "";
  const flash = await activeFlashMap().catch(() => new Map<string, number>());
  const productLines = rows
    .map((r) => {
      const deal = flash.get(r.code);
      const priceTxt = r.price
        ? deal != null && deal < Number(r.price)
          ? `${deal.toLocaleString("en-US")} ກີບ (FLASH SALE! ປົກກະຕິ ${Number(r.price).toLocaleString("en-US")})`
          : `${Number(r.price).toLocaleString("en-US")} ກີບ`
        : "ສອບຖາມລາຄາ";
      // NB: stock count is intentionally NOT exposed to customers — only an
      // in-stock/out-of-stock signal. The query already filters balance_qty > 0,
      // so every row here is available.
      const tags = [
        r.brand ?? "",
        r.isPromo ? "ໂປຣໂມຊັນ" : r.isNew ? "ສິນຄ້າໃໝ່" : "",
      ].filter(Boolean);
      return `- ${r.name}: ${priceTxt}, ມີສິນຄ້າ${tags.length ? ` [${tags.join(", ")}]` : ""} → /product/${encodeURIComponent(r.code)}`;
    })
    .join("\n");
  const facetLines = facets.length
    ? `\nກຸ່ມ/ໝວດ/ຍີ່ຫໍ້ທີ່ກ່ຽວຂ້ອງ:\n${facets
        .map((f) => `- ${f.kind}: ${f.name} (${f.n.toLocaleString("en-US")} ລາຍການ)`)
        .join("\n")}`
    : "";
  return `${productLines}${facetLines}`;
}

export interface ChatBotTestResult {
  ok: boolean;
  provider: AiProvider;
  model: string | null;
  botEnabled: boolean;
  hasDbContext: boolean;
  reply: string | null;
  error: string | null;
}

function activeProvider(): Pick<ChatBotTestResult, "provider" | "model"> {
  const openAiModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const anthropicModel = process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001";
  if (process.env.LOCAL_AI_BASE_URL?.trim()) {
    return { provider: "local", model: process.env.LOCAL_AI_MODEL?.trim() || "llama3.1" };
  }
  if (process.env.OPENAI_API_KEY?.trim()) return { provider: "openai", model: openAiModel };
  if (process.env.ANTHROPIC_API_KEY?.trim()) return { provider: "anthropic", model: anthropicModel };
  return { provider: "none", model: null };
}

const ORDER_RE = /\b((?:OM|CAE|CA[A-Z]{2,})[A-Z0-9@]+)\b/i;
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
    const ord = await getTrackOrderByNo(m[1]).catch(() => null);
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
        const ord = await getTrackOrderByNo(no).catch(() => null);
        if (ord) await add({ orderNo: ord.orderNo, status: ord.status, subtotal: ord.subtotal });
      }
    }
  }
  return lines.join("\n");
}

async function getExtraKnowledge(): Promise<string> {
  const k = await getAiKnowledge().catch(() => null);
  if (!k?.enabled) return "";
  return k.content.trim().slice(0, 2000);
}

function directContextReply(productContext: string, orderContext: string): string | null {
  if (orderContext.trim()) {
    return `ພົບຂໍ້ມູນອໍເດີ:\n${orderContext.trim()}`;
  }
  if (productContext.trim()) {
    const productLines = productContext
      .split("\nກຸ່ມ/ໝວດ/ຍີ່ຫໍ້ທີ່ກ່ຽວຂ້ອງ:")[0]
      .split("\n")
      .filter((line) => line.trim().startsWith("- "))
      .slice(0, 3);
    if (productLines.length > 0) return productLines.join("\n");
  }
  return null;
}

function buildSystem(productContext: string, orderContext: string, extraKnowledge = ""): string {
  return `ເຈົ້າແມ່ນຜູ້ຊ່ວຍ AI ຂອງຮ້ານ OdienMall. ຕອບລູກຄ້າເປັນພາສາລາວ ສຸພາບ ສັ້ນ ກົງຈຸດ.

ກົດ:
- ຕອບຄຳຖາມລ່າສຸດຂອງລູກຄ້າເທົ່ານັ້ນ. ຖ້າ topic ປ່ຽນ ໃຫ້ຕອບ topic ໃໝ່ ຢ່າໃຊ້ topic ເກົ່າ.
- ຕອບຈາກຂໍ້ມູນລຸ່ມນີ້ເທົ່ານັ້ນ. ຫ້າມແຕ່ງລາຄາ/ຂໍ້ມູນເອງ.
- ຕອບບໍ່ເກີນ 3 ປະໂຫຍກ ຫຼື 3 bullet; ເນັ້ນຊື່ສິນຄ້າ, ລາຄາ, link.
- ຖ້າພົບສິນຄ້າ ຕ້ອງໃສ່ link ສິນຄ້າທຸກຄັ້ງ (ຮູບແບບ /product/ລະຫັດ). ຢ່າຕັດ link ອອກ.
- ສະຖານະອໍເດີ: ຕອບຈາກຂໍ້ມູນອໍເດີລຸ່ມ; ຖ້າບໍ່ມີໃຫ້ຂໍເລກອໍເດີ/login; ຍັງບໍ່ໄດ້ → ${HANDOFF}
- ຄືນ/ຮ້ອງຮຽນ/ຂໍລົມພະນັກງານ → ຕອບສັ້ນ + ${HANDOFF}
- ບໍ່ຮູ້ → ບອກ + ${HANDOFF}
- ຫ້າມ: ສັນຍາສ່ວນຫຼຸດ, ຢືນຢັນວັນສົ່ງ, ຂໍ password/OTP/token, ບອກຕົວເລກ stock.
- ສິນຄ້າ: ບອກໄດ້ "ມີສິນຄ້າ" ຫຼື "ສິນຄ້າໝົດ" ເທົ່ານັ້ນ.

ຂໍ້ມູນຮ້ານ:
${SHOP_INFO}

ຂໍ້ມູນທີ່ລູກຄ້າຖາມເລື້ອຍ:
- ວິທີສັ່ງ: ເລືອກສິນຄ້າ → ໃສ່ກະຕ່າ → ກົດສັ່ງຊື້ → ໃສ່ທີ່ຢູ່ → ຊຳລະ BCEL QR ຫຼື COD
- ຊຳລະ: BCEL One (ສະແກນ QR, ຍອດ+ເລກອໍເດີຕິດໃນ QR) ຫຼື ເກັບເງິນປາຍທາງ (COD)
- ຕິດຕາມ: ກົດ "ຕິດຕາມຄຳສັ່ງຊື້" ໃສ່ເລກອໍເດີ+ເບີໂທ, ຫຼື login ເບິ່ງໃນ "ບັນຊີ"
- ຄ່າສົ່ງ: ຟຣີ (ທັງ ໂອດ້ຽນຂົນສົ່ງ ແລະ ຂົນສົ່ງທັນໃຈ)
- ເວລາສົ່ງ: ວຽງຈັນ 1-2 ມື້, ຕ່າງແຂວງ 2-5 ມື້
- ຮັບປະກັນ: ສິນຄ້າສ່ວນໃຫຍ່ມີຮັບປະກັນໂຮງງານ — ກວດລາຍລະອຽດໃນໜ້າສິນຄ້າ
- ຄືນສິນຄ້າ: 7 ມື້ (ສິນຄ້າຊຳລຸດ/ຜິດ/ເສຍຫາຍ, ຢູ່ສະພາບເດີມ) — ຮ້ອງຂໍໃນໜ້າອໍເດີ
- ແຕ້ມ/ສ່ວນຫຼຸດ: ສະມາຊິກສະສົມແຕ້ມທຸກຄັ້ງທີ່ຊື້, ແລກສ່ວນຫຼຸດໄດ້; gold/platinum/black ໄດ້ລາຄາພິເສດ
${orderContext ? `\nອໍເດີລູກຄ້າ:\n${orderContext}` : ""}${productContext ? `\nສິນຄ້າທີ່ກ່ຽວຂ້ອງ:\n${productContext}` : ""}${extraKnowledge ? `\nຂໍ້ມູນພິເສດ:\n${extraKnowledge}` : ""}`;
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
    const direct = directPolicyReply(text);
    if (direct) {
      await logAiChat({
        event: "settings.test",
        provider: provider.provider,
        model: provider.model,
        ok: true,
        hasDbContext: true,
        latencyMs: 0,
        prompt: text,
        reply: direct,
        error: null,
      });
      return {
        ok: true,
        ...provider,
        botEnabled,
        hasDbContext: true,
        reply: direct,
        error: null,
      };
    }
    const productContext = await findProducts(text);
    const dbReply = directContextReply(productContext, "");
    if (dbReply) {
      await logAiChat({
        event: "settings.test",
        provider: provider.provider,
        model: provider.model,
        ok: true,
        hasDbContext: true,
        latencyMs: 0,
        prompt: text,
        reply: dbReply,
        error: null,
      });
      return {
        ok: true,
        ...provider,
        botEnabled,
        hasDbContext: true,
        reply: dbReply,
        error: null,
      };
    }
    const system = buildSystem(productContext, "", await getExtraKnowledge());
    const ai = await aiCompleteDetailed(system, [{ role: "user", content: text }], {
      maxTokens: 180,
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

/** Atomically sets human_taken. Returns true only for the one caller that
 *  flipped it false→true, preventing duplicate handoff messages on concurrent calls. */
async function setHumanTaken(threadId: number): Promise<boolean> {
  const r = await query(
    `update odg_ecom.chat_threads set human_taken = true where id = $1 and not human_taken returning id`,
    [threadId],
  ).catch(() => []);
  return r.length > 0;
}

/**
 * Generate + post the AI assistant's reply to the latest customer message.
 * Best-effort: never throws. Hands off to a human (sets human_taken) when the
 * model emits the handoff sentinel or the AI is unavailable.
 */
export async function botReply(threadId: number, latestText: string): Promise<void> {
  try {
    if (!(await getChatBotEnabled())) return; // manager switched the bot off

    const direct = directPolicyReply(latestText);
    const provider = activeProvider();
    if (direct) {
      await postMessage(threadId, "admin", direct, true);
      await logAiChat({
        threadId,
        event: "bot.reply",
        provider: provider.provider,
        model: provider.model,
        ok: true,
        hasDbContext: true,
        latencyMs: 0,
        prompt: latestText,
        reply: direct,
        error: null,
      });
      return;
    }

    if (!aiConfigured()) return; // no key → leave it for a human admin

    // Once a human admin has taken over the thread, the bot stays quiet.
    const t = await query<{ human_taken: boolean }>(
      `select human_taken from odg_ecom.chat_threads where id = $1`,
      [threadId],
    );
    if (t[0]?.human_taken) return;

    // Cost/abuse guard — beyond the daily cap, hand off to a human.
    if ((await countBotReplies(threadId, 24)) >= BOT_DAILY_CAP) {
      const took = await setHumanTaken(threadId);
      if (took) await postMessage(threadId, "admin", "ກຳລັງສົ່ງຕໍ່ໃຫ້ພະນັກງານຊ່ວຍທ່ານ — ກະລຸນາລໍຖ້າ 🙏", true);
      return;
    }

    const history = await getThreadMessages(threadId, 0);
    const [productContext, orderContext] = await Promise.all([
      findProducts(latestText),
      findOrders(threadId, latestText),
    ]);
    const dbReply = directContextReply(productContext, orderContext);
    if (dbReply) {
      await postMessage(threadId, "admin", dbReply, true);
      await logAiChat({
        threadId,
        event: "bot.reply",
        provider: provider.provider,
        model: provider.model,
        ok: true,
        hasDbContext: true,
        latencyMs: 0,
        prompt: latestText,
        reply: dbReply,
        error: null,
      });
      return;
    }
    const system = buildSystem(productContext, orderContext, await getExtraKnowledge());
    // Start fresh (no history) when:
    // 1. There is no prior bot message (first reply).
    // 2. Last bot message was a handoff — old topic should not bleed in.
    // 3. Current question is NOT about products — prevents product links from
    //    leaking into shipping / policy / order answers.
    const HANDOFF_PHRASE = "ກຳລັງສົ່ງຕໍ່ໃຫ້ພະນັກງານ";
    const lastBotMsg = [...history].reverse().find((m) => m.sender === "admin" && m.isBot);
    const isProductQuestion = !!productContext;
    const startFresh =
      !lastBotMsg ||
      lastBotMsg.body.includes(HANDOFF_PHRASE) ||
      !isProductQuestion;
    const messages: AiMessage[] = startFresh
      ? [{ role: "user", content: latestText }]
      : (() => {
          // Product follow-up: include 1 prior exchange so the AI can refer back.
          const prior = history.slice(-3).filter((m) => m.body !== latestText || m.sender !== "customer");
          const ctx: AiMessage[] = prior.slice(-2).map((m) => ({
            role: m.sender === "customer" ? "user" : "assistant",
            content: m.body,
          }));
          ctx.push({ role: "user", content: latestText });
          return ctx;
        })();

    const ai = await aiCompleteDetailed(system, messages, { maxTokens: 180, temperature: 0.2 });
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
      const last = history[history.length - 1];
      const prev = history[history.length - 2];
      const NOTE = "ຂໍໂທດ ຕອນນີ້ຕອບອັດຕະໂນມັດບໍ່ໄດ້ຊົ່ວຄາວ — ພະນັກງານຈະຕອບໃຫ້ໄວໆ ຫຼື ລອງພິມໃໝ່ອີກຄັ້ງ 🙏";
      const alreadyNoted = (last?.isBot && last.body === NOTE) || (prev?.isBot && prev.body === NOTE);
      if (!alreadyNoted) await postMessage(threadId, "admin", NOTE, true);
      return;
    }

    const HANDOFF_MSG = "ກຳລັງສົ່ງຕໍ່ໃຫ້ພະນັກງານຊ່ວຍເພີ່ມເຕີມ — ກະລຸນາລໍຖ້າສັກຄູ່ 🙏";
    const handoff = reply.includes(HANDOFF);
    const clean = reply.replaceAll(HANDOFF, "").trim();
    if (handoff) {
      const took = await setHumanTaken(threadId);
      if (took) {
        // One combined message: bot's text + handoff notice
        const msg = clean ? `${clean}\n\n${HANDOFF_MSG}` : HANDOFF_MSG;
        await postMessage(threadId, "admin", msg, true);
      } else if (clean) {
        // Another concurrent call already set human_taken; just post the text.
        await postMessage(threadId, "admin", clean, true);
      }
    } else if (clean) {
      await postMessage(threadId, "admin", clean, true);
    }
  } catch (e) {
    console.error("botReply failed:", e);
  }
}
