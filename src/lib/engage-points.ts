import "server-only";
import { pool, query, queryOne } from "./db";

// Engagement points: customers earn points for completing their profile, a daily
// "collect" tap, and sharing to Facebook. Points are added to the ERP
// public.ar_customer.point_balance (the unified balance) and mirrored to
// odg_ecom.point_events for idempotency + audit. All rules are admin-configurable.

export interface PointRules {
  addressEnabled: boolean;
  addressPoints: number;
  birthdayEnabled: boolean;
  birthdayPoints: number;
  collectEnabled: boolean;
  collectPoints: number;
  collectMaxPerDay: number;
  shareEnabled: boolean;
  sharePoints: number;
  shareMaxPerDay: number;
}

const DEFAULTS: PointRules = {
  addressEnabled: true, addressPoints: 0.5,
  birthdayEnabled: true, birthdayPoints: 0.5,
  collectEnabled: true, collectPoints: 0.1, collectMaxPerDay: 3,
  shareEnabled: true, sharePoints: 0.2, shareMaxPerDay: 1,
};

export async function getPointRules(): Promise<PointRules> {
  try {
    const r = await queryOne<{
      address_enabled: boolean; address_points: string;
      birthday_enabled: boolean; birthday_points: string;
      collect_enabled: boolean; collect_points: string; collect_max_per_day: number;
      share_enabled: boolean; share_points: string; share_max_per_day: number;
    }>(`select * from odg_ecom.point_rules where id = 1`);
    if (!r) return DEFAULTS;
    return {
      addressEnabled: r.address_enabled, addressPoints: Number(r.address_points),
      birthdayEnabled: r.birthday_enabled, birthdayPoints: Number(r.birthday_points),
      collectEnabled: r.collect_enabled, collectPoints: Number(r.collect_points), collectMaxPerDay: r.collect_max_per_day,
      shareEnabled: r.share_enabled, sharePoints: Number(r.share_points), shareMaxPerDay: r.share_max_per_day,
    };
  } catch {
    return DEFAULTS; // table missing → safe defaults, storefront never 500s
  }
}

export async function savePointRules(r: PointRules, updatedBy?: string): Promise<void> {
  await query(
    `insert into odg_ecom.point_rules
       (id, address_enabled, address_points, birthday_enabled, birthday_points,
        collect_enabled, collect_points, collect_max_per_day,
        share_enabled, share_points, share_max_per_day, updated_by, updated_at)
     values (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
     on conflict (id) do update set
       address_enabled=excluded.address_enabled, address_points=excluded.address_points,
       birthday_enabled=excluded.birthday_enabled, birthday_points=excluded.birthday_points,
       collect_enabled=excluded.collect_enabled, collect_points=excluded.collect_points,
       collect_max_per_day=excluded.collect_max_per_day,
       share_enabled=excluded.share_enabled, share_points=excluded.share_points,
       share_max_per_day=excluded.share_max_per_day,
       updated_by=excluded.updated_by, updated_at=now()`,
    [
      r.addressEnabled, r.addressPoints, r.birthdayEnabled, r.birthdayPoints,
      r.collectEnabled, r.collectPoints, r.collectMaxPerDay,
      r.shareEnabled, r.sharePoints, r.shareMaxPerDay, updatedBy ?? null,
    ],
  );
}

// ── Award engine ─────────────────────────────────────────────────────────────

/** Atomically credit ERP point_balance + record the ledger row. `onceOnly` uses
 *  the partial unique index (profile_*); for daily kinds the caller pre-checks the
 *  per-day count. Returns the points actually awarded (0 if a duplicate). */
async function credit(customerCode: string, kind: string, points: number): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const ins = await client.query(
      `insert into odg_ecom.point_events (customer_code, kind, points)
       values ($1,$2,$3)
       on conflict do nothing
       returning id`,
      [customerCode, kind, points],
    );
    if (ins.rowCount === 0) {
      // Duplicate (profile_* already awarded) — nothing credited.
      await client.query("rollback");
      return 0;
    }
    await client.query(
      `update public.ar_customer set point_balance = coalesce(point_balance,0) + $2 where code = $1`,
      [customerCode, points],
    );
    await client.query("commit");
    return points;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    console.error(`credit(${kind}) failed:`, e);
    return 0;
  } finally {
    client.release();
  }
}

async function countToday(customerCode: string, kind: string): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `select count(*)::text as n from odg_ecom.point_events
      where customer_code = $1 and kind = $2 and event_date = current_date`,
    [customerCode, kind],
  );
  return Number(r?.n ?? 0);
}

async function awardedOnce(customerCode: string, kind: string): Promise<boolean> {
  const r = await queryOne<{ x: number }>(
    `select 1 as x from odg_ecom.point_events where customer_code = $1 and kind = $2 limit 1`,
    [customerCode, kind],
  );
  return !!r;
}

/** Award profile-address points once, if the customer's village/district/province
 *  are all filled and the rule is enabled. Returns points awarded (0 if not). */
export async function awardProfileAddress(customerCode: string): Promise<number> {
  if (!customerCode) return 0;
  const rules = await getPointRules();
  if (!rules.addressEnabled) return 0;
  if (await awardedOnce(customerCode, "profile_address")) return 0;
  const c = await queryOne<{ tambon: string | null; amper: string | null; province: string | null }>(
    `select nullif(trim(tambon),'') as tambon, nullif(trim(amper),'') as amper, nullif(trim(province),'') as province
       from public.ar_customer where code = $1`,
    [customerCode],
  );
  if (!c || !c.tambon || !c.amper || !c.province) return 0;
  return credit(customerCode, "profile_address", rules.addressPoints);
}

/** Award profile-birthday points once, if birth_day + sex are set and enabled. */
export async function awardProfileBirthday(customerCode: string): Promise<number> {
  if (!customerCode) return 0;
  const rules = await getPointRules();
  if (!rules.birthdayEnabled) return 0;
  if (await awardedOnce(customerCode, "profile_birthday")) return 0;
  const c = await queryOne<{ has_bday: boolean; has_sex: boolean }>(
    `select birth_day is not null as has_bday, coalesce(sex,0) <> 0 as has_sex
       from public.ar_customer where code = $1`,
    [customerCode],
  );
  if (!c || !c.has_bday || !c.has_sex) return 0;
  return credit(customerCode, "profile_birthday", rules.birthdayPoints);
}

export interface CollectResult {
  ok: boolean;
  awarded: number;
  usedToday: number;
  maxPerDay: number;
  remaining: number;
  reason?: "disabled" | "limit";
}

/** Daily collect tap — awards collect_points up to collect_max_per_day. */
export async function collectDaily(customerCode: string): Promise<CollectResult> {
  const rules = await getPointRules();
  const max = rules.collectMaxPerDay;
  if (!customerCode || !rules.collectEnabled) {
    return { ok: false, awarded: 0, usedToday: 0, maxPerDay: max, remaining: 0, reason: "disabled" };
  }
  const used = await countToday(customerCode, "daily_collect");
  if (used >= max) {
    return { ok: false, awarded: 0, usedToday: used, maxPerDay: max, remaining: 0, reason: "limit" };
  }
  const awarded = await credit(customerCode, "daily_collect", rules.collectPoints);
  const usedNow = used + (awarded > 0 ? 1 : 0);
  return { ok: awarded > 0, awarded, usedToday: usedNow, maxPerDay: max, remaining: Math.max(0, max - usedNow) };
}

/** Facebook share — awards share_points up to share_max_per_day. */
export async function awardFacebookShare(customerCode: string): Promise<CollectResult> {
  const rules = await getPointRules();
  const max = rules.shareMaxPerDay;
  if (!customerCode || !rules.shareEnabled) {
    return { ok: false, awarded: 0, usedToday: 0, maxPerDay: max, remaining: 0, reason: "disabled" };
  }
  const used = await countToday(customerCode, "facebook_share");
  if (used >= max) {
    return { ok: false, awarded: 0, usedToday: used, maxPerDay: max, remaining: 0, reason: "limit" };
  }
  const awarded = await credit(customerCode, "facebook_share", rules.sharePoints);
  const usedNow = used + (awarded > 0 ? 1 : 0);
  return { ok: awarded > 0, awarded, usedToday: usedNow, maxPerDay: max, remaining: Math.max(0, max - usedNow) };
}

/** Whether the one-time profile points were already awarded (for UI badges). */
export async function getProfilePointStatus(customerCode: string): Promise<{ addressAwarded: boolean; birthdayAwarded: boolean }> {
  if (!customerCode) return { addressAwarded: false, birthdayAwarded: false };
  const rows = await query<{ kind: string }>(
    `select kind from odg_ecom.point_events
      where customer_code = $1 and kind in ('profile_address','profile_birthday')`,
    [customerCode],
  );
  const set = new Set(rows.map((r) => r.kind));
  return { addressAwarded: set.has("profile_address"), birthdayAwarded: set.has("profile_birthday") };
}

/** Today's collect status for UI (how many taps left). */
export async function getCollectStatus(customerCode: string): Promise<{ usedToday: number; maxPerDay: number; remaining: number; points: number; enabled: boolean }> {
  const rules = await getPointRules();
  if (!customerCode) return { usedToday: 0, maxPerDay: rules.collectMaxPerDay, remaining: 0, points: rules.collectPoints, enabled: false };
  const used = await countToday(customerCode, "daily_collect");
  return {
    usedToday: used,
    maxPerDay: rules.collectMaxPerDay,
    remaining: Math.max(0, rules.collectMaxPerDay - used),
    points: rules.collectPoints,
    enabled: rules.collectEnabled,
  };
}
