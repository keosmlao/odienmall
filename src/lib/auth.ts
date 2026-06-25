import "server-only";
import { cookies } from "next/headers";
import { query } from "./db";
import { verifyPassword, timingEq } from "./password";
import {
  signSession,
  verifyToken,
  SESSION_MAX_AGE,
  type Session,
} from "./session";

// Customer auth against the ERP's ar_customer table. READ-ONLY: we only SELECT
// the matched account at login time and verify the password. Sessions are
// stateless signed cookies — nothing is written to any database.

export type { Session };

const COOKIE = "om_session";

// ---- cookie helpers (server) ----------------------------------------------

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? verifyToken(token) : null;
}

export async function setSessionCookie(sess: Session): Promise<void> {
  (await cookies()).set(COOKIE, signSession(sess), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

// ---- admin (passcode-gated) -----------------------------------------------

const ADMIN_COOKIE = "om_admin";
const ADMIN_MARKER = "__admin__";

// ---- roles / access control -----------------------------------------------
// Roles are configured via env (the ERP's `app_role` is unset). Two tiers:
//   manager — full access incl. money/config (affiliates, rates, payouts,
//             report, settings); staff — operational only (orders, products,
//             reviews). Both lists are comma-separated employee_codes.
//
//   ADMIN_EMPLOYEE_CODES  — access allowlist. EMPTY ⇒ any ACTIVE employee may
//                           sign in (current behaviour). SET ⇒ only listed
//                           codes (+ break-glass passcode) may sign in.
//   ADMIN_MANAGER_CODES   — manager set.       EMPTY ⇒ every signed-in admin is
//                           a manager (non-breaking). SET ⇒ only listed codes
//                           (+ break-glass) are managers; everyone else is staff.
export type AdminRole = "manager" | "staff";

function envCodes(name: "ADMIN_EMPLOYEE_CODES" | "ADMIN_MANAGER_CODES"): string[] {
  return (process.env[name] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

function isAllowedAdmin(code: string): boolean {
  const allow = envCodes("ADMIN_EMPLOYEE_CODES");
  return allow.length === 0 || allow.includes(code);
}

function roleFor(code: string): AdminRole {
  if (code === ADMIN_MARKER) return "manager";
  const mgr = envCodes("ADMIN_MANAGER_CODES");
  return mgr.length === 0 || mgr.includes(code) ? "manager" : "staff";
}

/**
 * Admin auth against the ERP `odg_employee` table: username = `employee_code`,
 * password verified format-agnostically (plaintext / md5 / sha / bcrypt). Only
 * ACTIVE employees on the access allowlist may sign in. An optional
 * `ADMIN_PASSCODE` env still works as a break-glass master (manager) login.
 * READ-ONLY on the ERP.
 */
export async function authenticateAdmin(
  username: string,
  password: string,
): Promise<Session | null> {
  const u = username.trim();
  if (u && password) {
    const rows = await query<{ employee_code: string; name: string; password: string | null }>(
      `select employee_code,
              coalesce(nullif(fullname_lo,''), nullif(fullname_en,''), employee_code) as name,
              password
         from public.odg_employee
        where employee_code = $1
          and upper(coalesce(employment_status,'')) = 'ACTIVE'
        limit 1`,
      [u],
    );
    const e = rows[0];
    if (e && verifyPassword(password, e.password) && isAllowedAdmin(e.employee_code)) {
      return { code: e.employee_code, name: e.name, role: roleFor(e.employee_code) };
    }
  }
  // Break-glass master passcode (optional) — always a manager.
  const master = process.env.ADMIN_PASSCODE;
  if (master && password && timingEq(password, master)) {
    return { code: ADMIN_MARKER, name: "admin", role: "manager" };
  }
  return null;
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token ? verifyToken(token) != null : false;
}

/** True when the signed-in admin is a manager. Legacy tokens (no role) and the
 *  break-glass login count as manager, so existing sessions keep full access. */
export async function isManager(): Promise<boolean> {
  const sess = await getAdminSession();
  return sess != null && sess.role !== "staff";
}

/** The signed-in admin's identity (employee_code + name + role), or null. */
export async function getAdminSession(): Promise<Session | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return token ? verifyToken(token) : null;
}

export async function setAdminCookie(sess: Session): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, signSession(sess), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearAdminCookie(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

// ---- salespeople (ພະນັກງານຂາຍ) --------------------------------------------
// Admins ARE salespeople. The selectable salesperson pool is the admin allowlist
// (ADMIN_EMPLOYEE_CODES); when that's empty (any active employee may sign in),
// it falls back to every ACTIVE odg_employee. A sale_code stamped on an order is
// always validated against this pool before it's persisted.

export interface Salesperson {
  code: string;
  name: string;
}

/** The selectable salespeople (admin allowlist, else all ACTIVE employees). */
export async function listSalespeople(): Promise<Salesperson[]> {
  const allow = envCodes("ADMIN_EMPLOYEE_CODES");
  if (allow.length > 0) {
    const rows = await query<{ code: string; name: string }>(
      `select employee_code as code,
              coalesce(nullif(fullname_lo,''), nullif(fullname_en,''), employee_code) as name
         from public.odg_employee
        where employee_code = any($1)
          and upper(coalesce(employment_status,'')) = 'ACTIVE'
        order by name`,
      [allow],
    );
    return rows;
  }
  const rows = await query<{ code: string; name: string }>(
    `select employee_code as code,
            coalesce(nullif(fullname_lo,''), nullif(fullname_en,''), employee_code) as name
       from public.odg_employee
      where upper(coalesce(employment_status,'')) = 'ACTIVE'
      order by name
      limit 500`,
  );
  return rows;
}

/** Validate a salesperson code: returns the trimmed code if it's a real ACTIVE
 *  employee on the allowlist (the break-glass marker passes through), else null. */
export async function resolveSalespersonCode(code: string | null | undefined): Promise<string | null> {
  const c = (code ?? "").trim();
  if (!c) return null;
  if (c === ADMIN_MARKER) return c;
  if (!isAllowedAdmin(c)) return null;
  const rows = await query<{ employee_code: string }>(
    `select employee_code from public.odg_employee
      where employee_code = $1 and upper(coalesce(employment_status,'')) = 'ACTIVE' limit 1`,
    [c],
  );
  return rows[0] ? c : null;
}

/**
 * Order-visibility scope for the signed-in admin. Managers (and legacy/break-glass
 * sessions) see everything; a configured staff salesperson sees only their own
 * orders. Non-breaking: with ADMIN_MANAGER_CODES empty every admin is a manager,
 * so scoping only kicks in once managers are explicitly listed.
 */
export async function getSalesScope(): Promise<{ all: boolean; saleCode: string | null }> {
  const sess = await getAdminSession();
  if (!sess) return { all: false, saleCode: null };
  if (sess.role !== "staff") return { all: true, saleCode: null };
  return { all: false, saleCode: sess.code };
}

/** Display name for an employee code (for showing the salesperson on an order). */
export async function getEmployeeName(code: string | null | undefined): Promise<string | null> {
  const c = (code ?? "").trim();
  if (!c) return null;
  if (c === ADMIN_MARKER) return "admin";
  const rows = await query<{ name: string }>(
    `select coalesce(nullif(fullname_lo,''), nullif(fullname_en,''), employee_code) as name
       from public.odg_employee where employee_code = $1 limit 1`,
    [c],
  );
  return rows[0]?.name ?? c;
}

// ---- authentication --------------------------------------------------------

interface CustRow {
  code: string;
  name: string;
  password: string | null;
}

/** Look up a customer by code, phone or email and verify the password. */
export async function authenticate(
  identifier: string,
  password: string,
): Promise<Session | null> {
  const id = identifier.trim();
  if (!id || !password) return null;
  const rows = await query<CustRow>(
    `select code,
            coalesce(nullif(name_1,''), code) as name,
            password
       from public.ar_customer
      where coalesce(password,'') <> ''
        and (code = $1 or telephone = $1 or sms_phonenumber = $1 or lower(email) = lower($1))
      limit 1`,
    [id],
  );
  const c = rows[0];
  if (!c) return null;
  if (!verifyPassword(password, c.password)) return null;
  return { code: c.code, name: c.name };
}

export interface LineCustomerInput {
  lineUserId: string;
  displayName?: string | null;
  pictureUrl?: string | null;
  email?: string | null;
}

/** Resolve a LINE Login identity to an existing ERP customer. No ERP writes:
 *  a LINE id can log in if it was linked before, or if LINE email matches
 *  public.ar_customer.email exactly. The app-owned link is then upserted. */
export async function authenticateLineCustomer(input: LineCustomerInput): Promise<Session | null> {
  const lineUserId = input.lineUserId.trim();
  if (!lineUserId) return null;

  const linked = await query<{
    code: string;
    name: string;
  }>(
    `select c.code, coalesce(nullif(c.name_1,''), c.code) as name
       from odg_ecom.customer_line_accounts l
       join public.ar_customer c on c.code = l.customer_code
      where l.line_user_id = $1
      limit 1`,
    [lineUserId],
  );
  if (linked[0]) {
    await query(
      `update odg_ecom.customer_line_accounts
          set display_name = coalesce($2, display_name),
              picture_url = coalesce($3, picture_url),
              email = coalesce($4, email),
              last_login_at = now()
        where line_user_id = $1`,
      [lineUserId, input.displayName ?? null, input.pictureUrl ?? null, input.email ?? null],
    ).catch(() => {});
    return { code: linked[0].code, name: linked[0].name };
  }

  const email = input.email?.trim().toLowerCase();
  if (!email) return null;
  const rows = await query<{
    code: string;
    name: string;
  }>(
    `select code, coalesce(nullif(name_1,''), code) as name
       from public.ar_customer
      where lower(email) = $1
      order by code
      limit 1`,
    [email],
  );
  const c = rows[0];
  if (!c) return null;

  await query(
    `insert into odg_ecom.customer_line_accounts
       (line_user_id, customer_code, display_name, picture_url, email, last_login_at)
     values ($1,$2,$3,$4,$5,now())
     on conflict (line_user_id) do update set
       customer_code = excluded.customer_code,
       display_name = excluded.display_name,
       picture_url = excluded.picture_url,
       email = excluded.email,
       last_login_at = now()`,
    [lineUserId, c.code, input.displayName ?? null, input.pictureUrl ?? null, email],
  );
  return { code: c.code, name: c.name };
}

// ---- profile ---------------------------------------------------------------

export interface CustomerProfile {
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  pointBalance: number;
}

export async function getCustomerProfile(code: string): Promise<CustomerProfile | null> {
  const rows = await query<{
    code: string;
    name: string;
    phone: string | null;
    email: string | null;
    point_balance: string | null;
  }>(
    `select code,
            coalesce(nullif(name_1,''), code) as name,
            nullif(telephone,'') as phone,
            nullif(email,'') as email,
            point_balance
       from public.ar_customer where code = $1`,
    [code],
  );
  const c = rows[0];
  if (!c) return null;
  return {
    code: c.code,
    name: c.name,
    phone: c.phone,
    email: c.email,
    pointBalance: c.point_balance == null ? 0 : Number(c.point_balance),
  };
}
