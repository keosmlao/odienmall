import "server-only";
import { query } from "./db";
import { onepayEnabled, onepayMerchantConfigured } from "./onepay";
import { smlDirectWriteEnabled } from "./sml-sale-order";
import { countPendingCommissionSync } from "./affiliates";

// Read-only deployment-readiness checks for the admin "System status" page.
// NEVER returns secret values — only whether each gate is configured + a hint.
export type StatusLevel = "ok" | "warn" | "info";

export interface StatusItem {
  label: string;
  level: StatusLevel;
  value: string;
  hint?: string;
}

const INSECURE_SECRET = "dev-insecure-secret-change-me";

export async function getSystemStatus(): Promise<StatusItem[]> {
  const items: StatusItem[] = [];

  // 1. Session secret — required in production (session.ts throws otherwise).
  const secret = process.env.SESSION_SECRET;
  const secretOk = !!secret && secret !== INSECURE_SECRET;
  items.push({
    label: "SESSION_SECRET",
    level: secretOk ? "ok" : "warn",
    value: secretOk ? "ຕັ້ງແລ້ວ" : "ຍັງບໍ່ໄດ້ຕັ້ງ / ໃຊ້ຄ່າ default",
    hint: secretOk ? undefined : "ຈຳເປັນຕອນ production — cookie admin ປອມໄດ້ຖ້າໃຊ້ default",
  });

  // 2. Admin role separation — only active once managers are listed.
  const managerCodes = (process.env.ADMIN_MANAGER_CODES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const allowCodes = (process.env.ADMIN_EMPLOYEE_CODES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  items.push({
    label: "ການແບ່ງສິດ admin (manager/staff)",
    level: managerCodes.length > 0 ? "ok" : "info",
    value: managerCodes.length > 0 ? `${managerCodes.length} manager codes` : "ທຸກຄົນເປັນ manager",
    hint: managerCodes.length > 0 ? undefined : "ຕັ້ງ ADMIN_MANAGER_CODES ເພື່ອເປີດການແບ່ງສິດ staff/ພະນັກງານຂາຍ",
  });
  items.push({
    label: "ALLOWLIST ເຂົ້າ admin",
    level: allowCodes.length > 0 ? "ok" : "info",
    value: allowCodes.length > 0 ? `${allowCodes.length} codes` : "ພະນັກງານ ACTIVE ທຸກຄົນເຂົ້າໄດ້",
    hint: allowCodes.length > 0 ? undefined : "ຕັ້ງ ADMIN_EMPLOYEE_CODES ເພື່ອຈຳກັດຜູ້ເຂົ້າ",
  });

  // 3. SML direct write — writes to production ic_trans when on.
  items.push({
    label: "SML_DIRECT_WRITE",
    level: smlDirectWriteEnabled() ? "warn" : "info",
    value: smlDirectWriteEnabled() ? "ເປີດ (ຂຽນ ic_trans ຈິງ)" : "ປິດ (ບໍ່ຂຽນ public.*)",
    hint: smlDirectWriteEnabled() ? "ກວດໃຫ້ແນ່ໃຈ — ຂຽນລົງ ERP ການຜະລິດ" : undefined,
  });

  // 4. OnePay / BCEL payment.
  const payLevel = onepayEnabled() ? "ok" : onepayMerchantConfigured() ? "info" : "warn";
  items.push({
    label: "ການຊຳລະ BCEL OnePay",
    level: payLevel,
    value: onepayEnabled() ? "live API" : onepayMerchantConfigured() ? "QR ທ້ອງຖິ່ນ (ບໍ່ມີ API)" : "ຍັງບໍ່ຕັ້ງ MCID",
    hint: onepayMerchantConfigured() ? undefined : "ຕັ້ງ ONEPAY_MCID ເພື່ອສ້າງ QR",
  });

  // 5. Cron / scheduled jobs (affiliate commission, alerts, abandoned carts).
  const cronOk = !!(process.env.CRON_TOKEN ?? "").trim();
  items.push({
    label: "CRON_TOKEN (job ຕັ້ງເວລາ)",
    level: cronOk ? "ok" : "warn",
    value: cronOk ? "ຕັ້ງແລ້ວ" : "ຍັງບໍ່ໄດ້ຕັ້ງ",
    hint: cronOk ? "ກວດໃຫ້ scheduler ເອີ້ນ /api/cron" : "ຄອມນາຍໜ້າ/ແຈ້ງເຕືອນ ບໍ່ແລ່ນອັດຕະໂນມັດ — ໃຊ້ປຸ່ມ sync ດ້ວຍມື",
  });

  // 6. Public site URL (used by sitemap, QR links, share links).
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  items.push({
    label: "NEXT_PUBLIC_SITE_URL",
    level: siteUrl ? "ok" : "info",
    value: siteUrl || "ໃຊ້ default https://odienmall.com",
    hint: siteUrl ? undefined : "ຕັ້ງໃຫ້ກົງ domain ຈິງ (sitemap, ລິ້ງແບ່ງປັນ)",
  });

  // 7. Database connectivity.
  const uploadDir = process.env.UPLOADS_DIR?.trim() || "";
  const uploadBase = (process.env.UPLOADS_PUBLIC_BASE?.trim() || "/uploads").replace(/\/$/, "");
  const likelyServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  items.push({
    label: "Upload storage",
    level: "ok",
    value: "DB bytea (odg_ecom.upload_blobs)",
    hint: uploadDir || likelyServerless || uploadBase ? "upload ໃໝ່ເກັບໃນ DB; URL /uploads ເກົ່າຍັງອ່ານໄດ້" : undefined,
  });

  const openAiOk = !!process.env.OPENAI_API_KEY?.trim();
  const anthropicOk = !!process.env.ANTHROPIC_API_KEY?.trim();
  items.push({
    label: "AI chatbot",
    level: openAiOk || anthropicOk ? "ok" : "info",
    value: openAiOk ? "OpenAI / ChatGPT" : anthropicOk ? "Anthropic fallback" : "human-only",
    hint: openAiOk
      ? "chatbot ຕອບຈາກ DB context ຜ່ານ OPENAI_API_KEY"
      : anthropicOk
        ? "ຖ້າ Anthropic credit ໝົດ ໃຫ້ຕັ້ງ OPENAI_API_KEY"
        : "ຕັ້ງ OPENAI_API_KEY ເພື່ອໃຫ້ bot ຕອບອັດຕະໂນມັດ",
  });

  items.push({
    label: "NODE_ENV",
    level: process.env.NODE_ENV === "production" ? "ok" : "info",
    value: process.env.NODE_ENV || "development",
    hint: process.env.NODE_ENV === "production" ? undefined : "ຕອນ deploy ຄວນເປັນ production",
  });

  // 8. Database connectivity.
  try {
    await query(`select 1`);
    items.push({ label: "ຖານຂໍ້ມູນ (PostgreSQL)", level: "ok", value: "ເຊື່ອມຕໍ່ໄດ້" });
  } catch {
    items.push({ label: "ຖານຂໍ້ມູນ (PostgreSQL)", level: "warn", value: "ເຊື່ອມຕໍ່ບໍ່ໄດ້", hint: "ກວດ DATABASE_URL" });
  }

  // 9. Pending affiliate-commission sync (ties to CRON_TOKEN above).
  try {
    const pending = await countPendingCommissionSync();
    items.push({
      label: "ຄອມນາຍໜ້າລໍຖ້າຄິດໄລ່",
      level: pending > 0 ? "warn" : "ok",
      value: pending > 0 ? `${pending} ອໍເດີ` : "ບໍ່ມີຄ້າງ",
      hint: pending > 0 ? "ກົດ ‘ຄິດໄລ່ຄອມມິສຊັນ’ ໃນໜ້ານາຍໜ້າ ຫຼື ຕັ້ງ cron" : undefined,
    });
  } catch {
    // best-effort — skip if the affiliate tables are unavailable
  }

  return items;
}
