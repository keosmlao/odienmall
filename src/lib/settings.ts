import "server-only";
import { query, queryOne, pool } from "./db";

// ---------------------------------------------------------------------------
// App-owned site settings (schema ecom — the ERP stays READ-ONLY).
//
// Currently holds the "dev notice": a warning modal shown on the home page
// while the site is under development. Admin toggles it on/off and edits the
// text at /admin/settings; the storefront reads it on every home visit.
//
// Stored as a singleton row (id = 1) in odg_ecom.dev_notice.
// ---------------------------------------------------------------------------

export interface DevNotice {
  enabled: boolean;
  title: string;
  message: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

// Used when the table is missing (migration not yet run) or empty. The notice
// stays OFF by default so a fresh deploy never surprises visitors.
const DEFAULTS: DevNotice = {
  enabled: false,
  title: "ເວັບໄຊຢູ່ໃນລະຫວ່າງການພັດທະນາ",
  message:
    "ຂະນະນີ້ເວັບໄຊກຳລັງຢູ່ໃນລະຫວ່າງການພັດທະນາ — ຂໍ້ມູນສິນຄ້າ ແລະ ລາຄາ ອາດຍັງບໍ່ສົມບູນ ຫຼື ປ່ຽນແປງໄດ້.",
  updatedAt: null,
  updatedBy: null,
};

/**
 * Read the dev-notice settings. Never throws — if the odg_ecom.dev_notice table
 * does not exist yet (migration not run), returns the OFF default so the
 * storefront home page keeps rendering.
 */
export async function getDevNotice(): Promise<DevNotice> {
  try {
    const row = await queryOne<DevNotice>(
      `select enabled, title, message,
              updated_at as "updatedAt", updated_by as "updatedBy"
         from odg_ecom.dev_notice where id = 1`,
    );
    return row ?? DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

/** Upsert the singleton dev-notice row (admin only — caller re-checks isAdmin). */
export async function setDevNotice(
  next: { enabled: boolean; title: string; message: string },
  by?: string,
): Promise<void> {
  await query(
    `insert into odg_ecom.dev_notice (id, enabled, title, message, updated_by, updated_at)
       values (1, $1, $2, $3, $4, now())
     on conflict (id) do update
       set enabled    = excluded.enabled,
           title      = excluded.title,
           message    = excluded.message,
           updated_by = excluded.updated_by,
           updated_at = now()`,
    [next.enabled, next.title, next.message, by ?? null],
  );
}

// ---------------------------------------------------------------------------
// Announcement bar — a thin persistent notice across the storefront (distinct
// from the dev-notice modal). Singleton row (id = 1) in odg_ecom.announcement.
// ---------------------------------------------------------------------------

export interface Announcement {
  enabled: boolean;
  message: string;
  /** Optional internal link the bar points to (e.g. /products). */
  link: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

const ANNOUNCEMENT_DEFAULT: Announcement = {
  enabled: false,
  message: "",
  link: null,
  updatedAt: null,
  updatedBy: null,
};

/** Read the announcement bar. Never throws — OFF default if the table is absent. */
export async function getAnnouncement(): Promise<Announcement> {
  try {
    const row = await queryOne<Announcement>(
      `select enabled, message, nullif(link,'') as link,
              updated_at as "updatedAt", updated_by as "updatedBy"
         from odg_ecom.announcement where id = 1`,
    );
    return row ?? ANNOUNCEMENT_DEFAULT;
  } catch {
    return ANNOUNCEMENT_DEFAULT;
  }
}

/** Upsert the singleton announcement row (admin only — caller re-checks). */
export async function setAnnouncement(
  next: { enabled: boolean; message: string; link?: string | null },
  by?: string,
): Promise<void> {
  await query(
    `insert into odg_ecom.announcement (id, enabled, message, link, updated_by, updated_at)
       values (1, $1, $2, $3, $4, now())
     on conflict (id) do update
       set enabled    = excluded.enabled,
           message    = excluded.message,
           link       = excluded.link,
           updated_by = excluded.updated_by,
           updated_at = now()`,
    [next.enabled, next.message, next.link?.trim() || null, by ?? null],
  );
}

// ---------------------------------------------------------------------------
// Homepage Flash Sale — controls the promo-product rail and its real end time.
// ---------------------------------------------------------------------------

export interface HomePromotion {
  enabled: boolean;
  title: string;
  endsAt: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

const HOME_PROMOTION_DEFAULT: HomePromotion = {
  enabled: false,
  title: "FLASH SALE",
  endsAt: null,
  updatedAt: null,
  updatedBy: null,
};

export async function getHomePromotion(): Promise<HomePromotion> {
  try {
    const row = await queryOne<{
      enabled: boolean;
      title: string;
      endsAt: Date | null;
      updatedAt: Date | null;
      updatedBy: string | null;
    }>(
      `select enabled,title,ends_at as "endsAt",
              updated_at as "updatedAt",updated_by as "updatedBy"
         from odg_ecom.home_promotion where id=1`,
    );
    return row
      ? {
          ...row,
          endsAt: row.endsAt?.toISOString() ?? null,
          updatedAt: row.updatedAt?.toISOString() ?? null,
        }
      : HOME_PROMOTION_DEFAULT;
  } catch {
    return HOME_PROMOTION_DEFAULT;
  }
}

export async function setHomePromotion(
  next: { enabled: boolean; title: string; endsAt: string | null },
  by?: string,
): Promise<void> {
  await query(
    `insert into odg_ecom.home_promotion(id,enabled,title,ends_at,updated_by,updated_at)
       values(1,$1,$2,$3,$4,now())
     on conflict(id) do update
       set enabled=excluded.enabled,title=excluded.title,ends_at=excluded.ends_at,
           updated_by=excluded.updated_by,updated_at=now()`,
    [next.enabled, next.title, next.endsAt, by ?? null],
  );
}

// ---------------------------------------------------------------------------
// Bank-transfer details — shown to the customer on a "transfer" order so they
// know where to send the money. Singleton (id = 1) in odg_ecom.bank_transfer.
// ---------------------------------------------------------------------------

export interface BankTransfer {
  bankName: string;
  accountName: string;
  accountNo: string;
  note: string | null;
  /** Uploaded BCEL / bank QR image (public/uploads/bank/...), or null. */
  qrUrl: string | null;
}

const BANK_DEFAULT: BankTransfer = {
  bankName: "",
  accountName: "",
  accountNo: "",
  note: null,
  qrUrl: null,
};

/** True when enough is filled in to actually display transfer instructions —
 *  a QR alone is enough, or a bank name + account number. */
export function bankConfigured(b: BankTransfer): boolean {
  return !!b.qrUrl || (b.accountNo.trim() !== "" && b.bankName.trim() !== "");
}

/** Read the bank-transfer details. Never throws (empty default if table absent). */
export async function getBankTransfer(): Promise<BankTransfer> {
  try {
    const row = await queryOne<BankTransfer>(
      `select bank_name as "bankName", account_name as "accountName",
              account_no as "accountNo", nullif(note,'') as note,
              nullif(qr_url,'') as "qrUrl"
         from odg_ecom.bank_transfer where id = 1`,
    );
    return row ?? BANK_DEFAULT;
  } catch {
    return BANK_DEFAULT;
  }
}

/** Set (or clear) just the QR image URL. */
export async function setBankQr(url: string | null, by?: string): Promise<void> {
  await query(
    `insert into odg_ecom.bank_transfer (id, qr_url, updated_by, updated_at)
       values (1, $1, $2, now())
     on conflict (id) do update
       set qr_url = excluded.qr_url, updated_by = excluded.updated_by, updated_at = now()`,
    [url, by ?? null],
  );
}

/** Upsert the singleton bank-transfer row (admin only — caller re-checks). */
export async function setBankTransfer(
  next: { bankName: string; accountName: string; accountNo: string; note?: string | null },
  by?: string,
): Promise<void> {
  await query(
    `insert into odg_ecom.bank_transfer (id, bank_name, account_name, account_no, note, updated_by, updated_at)
       values (1, $1, $2, $3, $4, $5, now())
     on conflict (id) do update
       set bank_name    = excluded.bank_name,
           account_name = excluded.account_name,
           account_no   = excluded.account_no,
           note         = excluded.note,
           updated_by   = excluded.updated_by,
           updated_at   = now()`,
    [next.bankName.trim(), next.accountName.trim(), next.accountNo.trim(), next.note?.trim() || null, by ?? null],
  );
}

// ---------------------------------------------------------------------------
// OnePay test mode — app-owned runtime setting. The order amount is untouched;
// only the amount encoded into newly generated OnePay QR codes is overridden.
// ---------------------------------------------------------------------------

export interface OnepayRuntimeConfig {
  testMode: boolean;
  testAmount: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

const ONEPAY_DEFAULT: OnepayRuntimeConfig = {
  testMode: false,
  testAmount: 1,
  updatedAt: null,
  updatedBy: null,
};

export async function getOnepayRuntimeConfig(): Promise<OnepayRuntimeConfig> {
  try {
    const row = await queryOne<{
      testMode: boolean;
      testAmount: string;
      updatedAt: string | null;
      updatedBy: string | null;
    }>(
      `select test_mode as "testMode", test_amount::text as "testAmount",
              updated_at as "updatedAt", updated_by as "updatedBy"
         from odg_ecom.onepay_config where id = 1`,
    );
    return row
      ? { ...row, testAmount: Number(row.testAmount) }
      : ONEPAY_DEFAULT;
  } catch {
    return ONEPAY_DEFAULT;
  }
}

export async function setOnepayRuntimeConfig(
  next: { testMode: boolean; testAmount: number },
  by?: string,
): Promise<void> {
  await query(
    `insert into odg_ecom.onepay_config (id, test_mode, test_amount, updated_by, updated_at)
       values (1,$1,$2,$3,now())
     on conflict (id) do update
       set test_mode=excluded.test_mode, test_amount=excluded.test_amount,
           updated_by=excluded.updated_by, updated_at=now()`,
    [next.testMode, next.testAmount, by ?? null],
  );
}

// ---------------------------------------------------------------------------
// Cash-on-delivery toggle — manager-controlled. Stored on the onepay_config
// singleton (shared payment-config row). Default ON, error-safe.
// ---------------------------------------------------------------------------

export async function getCodEnabled(): Promise<boolean> {
  try {
    const row = await queryOne<{ codEnabled: boolean }>(
      `select cod_enabled as "codEnabled" from odg_ecom.onepay_config where id = 1`,
    );
    return row?.codEnabled ?? true;
  } catch {
    return true;
  }
}

export async function setCodEnabled(enabled: boolean, by?: string): Promise<void> {
  await query(
    `insert into odg_ecom.onepay_config (id, cod_enabled, updated_by, updated_at)
       values (1,$1,$2,now())
     on conflict (id) do update
       set cod_enabled=excluded.cod_enabled, updated_by=excluded.updated_by, updated_at=now()`,
    [enabled, by ?? null],
  );
}

// ---------------------------------------------------------------------------
// Web product groups (odg_ecom.web_groups): which ERP group_main are sold on the web.
// Storefront + admin product list filter on this set. Manager-editable.
// ---------------------------------------------------------------------------
export interface WebGroupOption {
  code: string;
  name: string;
  count: number;
  enabled: boolean;
}

/** Enabled web group_main codes (storefront-visible groups). */
export async function getWebGroups(): Promise<string[]> {
  try {
    const rows = await query<{ group_main: string }>(`select group_main from odg_ecom.web_groups`);
    return rows.map((r) => r.group_main);
  } catch {
    return [];
  }
}

/** All web-eligible ERP groups (is_eordershow) with name + count + enabled flag. */
export async function listWebGroupOptions(): Promise<WebGroupOption[]> {
  const rows = await query<{ code: string; name: string; count: number; enabled: boolean }>(
    `select i.group_main as code,
            coalesce(nullif(gm.name_1,''), i.group_main) as name,
            count(*)::int as count,
            exists (select 1 from odg_ecom.web_groups w where w.group_main = i.group_main) as enabled
       from public.ic_inventory i
       left join public.ic_group gm on gm.code = i.group_main
      where i.is_eordershow = 1 and coalesce(nullif(i.group_main,''),'') <> ''
      group by i.group_main, gm.name_1
      order by i.group_main`,
  );
  return rows;
}

/** Replace the enabled web-group set (manager-only caller). */
export async function setWebGroups(codes: string[], by?: string): Promise<void> {
  const clean = [...new Set(codes.map((c) => String(c).trim()).filter(Boolean))];
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`delete from odg_ecom.web_groups`);
    if (clean.length > 0) {
      await client.query(
        `insert into odg_ecom.web_groups (group_main) select unnest($1::text[]) on conflict do nothing`,
        [clean],
      );
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  void by;
}

// ---------------------------------------------------------------------------
// AI chat assistant on/off (odg_ecom.chat_config singleton). Lets a manager disable
// the bot without removing provider API keys.
// ---------------------------------------------------------------------------
export async function getChatBotEnabled(): Promise<boolean> {
  try {
    const r = await queryOne<{ bot_enabled: boolean }>(
      `select bot_enabled from odg_ecom.chat_config where id = 1`,
    );
    return r?.bot_enabled ?? true;
  } catch {
    return true;
  }
}

export async function setChatBotEnabled(enabled: boolean, by?: string): Promise<void> {
  await query(
    `insert into odg_ecom.chat_config (id, bot_enabled, updated_by, updated_at)
       values (1, $1, $2, now())
     on conflict (id) do update
       set bot_enabled = excluded.bot_enabled, updated_by = excluded.updated_by, updated_at = now()`,
    [enabled, by ?? null],
  );
}
