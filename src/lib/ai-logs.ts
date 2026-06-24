import "server-only";
import { query, queryOne } from "./db";

const MAX_TEXT = 4000;

export interface AiLogInput {
  threadId?: number | null;
  event: string;
  provider?: string | null;
  model?: string | null;
  ok: boolean;
  hasDbContext?: boolean;
  latencyMs?: number | null;
  prompt?: string | null;
  reply?: string | null;
  error?: string | null;
}

export interface AiLogRow {
  id: number;
  threadId: number | null;
  event: string;
  provider: string | null;
  model: string | null;
  ok: boolean;
  hasDbContext: boolean;
  latencyMs: number | null;
  prompt: string | null;
  reply: string | null;
  error: string | null;
  createdAt: string;
}

function clip(text?: string | null): string | null {
  const s = text?.trim();
  if (!s) return null;
  return redactSensitive(s).slice(0, MAX_TEXT);
}

/** Keep AI diagnostics useful without storing obvious customer secrets/PII. */
export function redactSensitive(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:\+?856)?[\s-]?(?:20|30)?[\s-]?\d(?:[\s-]?\d){6,10}\b/g, "[phone]")
    .replace(/\b(?:otp|password|pass|token|api[_ -]?key)\s*[:=]?\s*\S+/gi, "$1=[redacted]")
    .replace(/\b((?:OM|CAE)[A-Z0-9@-]{5,})\b/gi, "[order]");
}

/** Best-effort: AI diagnostics must never break the chat flow. */
export async function logAiChat(input: AiLogInput): Promise<void> {
  try {
    await query(
      `insert into odg_ecom.ai_chat_logs
         (thread_id, event, provider, model, ok, has_db_context, latency_ms, prompt, reply, error)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        input.threadId ?? null,
        input.event,
        input.provider ?? null,
        input.model ?? null,
        input.ok,
        input.hasDbContext ?? false,
        input.latencyMs ?? null,
        clip(input.prompt),
        clip(input.reply),
        clip(input.error),
      ],
    );
  } catch {
    // swallow — logging cannot break customer chat
  }
}

export async function getRecentAiLogs(limit = 10): Promise<AiLogRow[]> {
  const rows = await query<{
    id: string;
    thread_id: string | null;
    event: string;
    provider: string | null;
    model: string | null;
    ok: boolean;
    has_db_context: boolean;
    latency_ms: number | null;
    prompt: string | null;
    reply: string | null;
    error: string | null;
    created_at: Date;
  }>(
    `select id, thread_id, event, provider, model, ok, has_db_context,
            latency_ms, prompt, reply, error, created_at
       from odg_ecom.ai_chat_logs
      order by created_at desc
      limit $1`,
    [Math.max(1, Math.min(50, Math.trunc(limit)))],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    threadId: r.thread_id == null ? null : Number(r.thread_id),
    event: r.event,
    provider: r.provider,
    model: r.model,
    ok: r.ok,
    hasDbContext: r.has_db_context,
    latencyMs: r.latency_ms,
    prompt: r.prompt,
    reply: r.reply,
    error: r.error,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function countRecentAiFailures(hours = 24): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `select count(*)::text as n
       from odg_ecom.ai_chat_logs
      where ok = false and created_at >= now() - ($1 || ' hours')::interval`,
    [String(Math.max(1, Math.min(168, Math.trunc(hours))))],
  );
  return Number(r?.n ?? 0);
}

export async function deleteAiLogsOlderThan(days = 30): Promise<number> {
  const safeDays = Math.max(1, Math.min(365, Math.trunc(days)));
  const r = await queryOne<{ n: string }>(
    `with deleted as (
       delete from odg_ecom.ai_chat_logs
        where created_at < now() - ($1 || ' days')::interval
        returning 1
     )
     select count(*)::text as n from deleted`,
    [String(safeDays)],
  );
  return Number(r?.n ?? 0);
}
