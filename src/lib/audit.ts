import "server-only";
import { query } from "./db";
import { getAdminSession } from "./auth";

// ---------------------------------------------------------------------------
// Admin audit log (odg_ecom.audit_log, app-owned). Records who changed what.
// BEST-EFFORT: a logging failure must never break the action it accompanies, so
// every write is wrapped in try/catch. Call from admin server actions AFTER the
// real mutation succeeds.
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  actorCode: string | null;
  actorName: string | null;
  action: string;
  entity: string | null;
  detail: string | null;
  createdAt: string;
}

/**
 * Append an audit entry. The actor is taken from the current admin session
 * unless overridden. Never throws.
 */
export async function logAudit(input: {
  action: string;
  entity?: string | null;
  detail?: string | null;
  actorCode?: string | null;
  actorName?: string | null;
}): Promise<void> {
  try {
    let { actorCode, actorName } = input;
    if (actorCode === undefined || actorName === undefined) {
      const sess = await getAdminSession();
      actorCode = actorCode ?? sess?.code ?? null;
      actorName = actorName ?? sess?.name ?? null;
    }
    await query(
      `insert into odg_ecom.audit_log (actor_code, actor_name, action, entity, detail)
       values ($1, $2, $3, $4, $5)`,
      [actorCode ?? null, actorName ?? null, input.action, input.entity ?? null, input.detail ?? null],
    );
  } catch {
    // swallow — audit logging is never allowed to break the main action
  }
}

export interface AuditPage {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Paginated recent audit entries, optionally filtered by action prefix / search. */
export async function getAuditLog(opts: {
  search?: string;
  action?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<AuditPage> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 50));
  const conds: string[] = [];
  const params: unknown[] = [];

  const s = opts.search?.trim();
  if (s) {
    params.push(`%${s}%`);
    const p = `$${params.length}`;
    conds.push(`(actor_code ilike ${p} or actor_name ilike ${p} or entity ilike ${p} or detail ilike ${p})`);
  }
  if (opts.action) {
    params.push(`${opts.action}%`);
    conds.push(`action ilike $${params.length}`);
  }
  const where = conds.length ? `where ${conds.join(" and ")}` : "";

  const totalRow = await query<{ n: number }>(
    `select count(*)::int as n from odg_ecom.audit_log ${where}`,
    params,
  );
  const total = totalRow[0]?.n ?? 0;

  params.push(pageSize, (page - 1) * pageSize);
  const rows = await query<{
    id: string;
    actor_code: string | null;
    actor_name: string | null;
    action: string;
    entity: string | null;
    detail: string | null;
    created_at: Date;
  }>(
    `select id, actor_code, actor_name, action, entity, detail, created_at
       from odg_ecom.audit_log
       ${where}
      order by created_at desc, id desc
      limit $${params.length - 1} offset $${params.length}`,
    params,
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      actorCode: r.actor_code,
      actorName: r.actor_name,
      action: r.action,
      entity: r.entity,
      detail: r.detail,
      createdAt: r.created_at.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Distinct action prefixes present (for the filter dropdown). */
export async function getAuditActions(): Promise<string[]> {
  const rows = await query<{ prefix: string }>(
    `select distinct split_part(action, '.', 1) as prefix
       from odg_ecom.audit_log order by 1`,
  );
  return rows.map((r) => r.prefix).filter(Boolean);
}
