import "server-only";
import { query, queryOne } from "./db";

// Live chat (customer ↔ admin), app-owned in the `ecom` schema. One thread per
// customer (logged-in: customer_code; guest: a cookie token). Both sides poll.

export interface ChatMessage {
  id: number;
  sender: "customer" | "admin";
  /** True when authored by the AI assistant (a special kind of admin message). */
  isBot: boolean;
  body: string;
  createdAt: string;
}

export interface ChatThreadRow {
  id: number;
  custKey: string;
  customerCode: string | null;
  name: string;
  phone: string | null;
  /** True after a human admin replies or the bot hands off; AI stays quiet until reset. */
  humanTaken: boolean;
  lastMessageAt: string;
  lastSender: string | null;
  lastBody: string | null;
  unread: number; // unread-by-admin count
}

const MAX_BODY = 2000;

function clean(body: string): string {
  return body.replace(/\s+$/g, "").slice(0, MAX_BODY).trim();
}

/** Find or create the thread for a chat key (idempotent). */
export async function getOrCreateThread(
  custKey: string,
  opts: { name?: string; phone?: string; customerCode?: string | null } = {},
): Promise<number> {
  const existing = await queryOne<{ id: string }>(
    `select id from odg_ecom.chat_threads where cust_key = $1`,
    [custKey],
  );
  if (existing) {
    // keep the display name / customer link fresh when known
    if (opts.name || opts.customerCode || opts.phone) {
      await query(
        `update odg_ecom.chat_threads
            set name = coalesce(nullif($2,''), name),
                customer_code = coalesce($3, customer_code),
                phone = coalesce(nullif($4,''), phone)
          where id = $1`,
        [existing.id, opts.name ?? "", opts.customerCode ?? null, opts.phone ?? ""],
      );
    }
    return Number(existing.id);
  }
  const row = await queryOne<{ id: string }>(
    `insert into odg_ecom.chat_threads (cust_key, customer_code, name, phone)
     values ($1, $2, coalesce(nullif($3,''),'ລູກຄ້າ'), nullif($4,''))
     returning id`,
    [custKey, opts.customerCode ?? null, opts.name ?? "", opts.phone ?? ""],
  );
  return Number(row!.id);
}

/** Thread id for a chat key without creating one (null if none yet). */
export async function getThreadIdByKey(custKey: string): Promise<number | null> {
  const r = await queryOne<{ id: string }>(
    `select id from odg_ecom.chat_threads where cust_key = $1`,
    [custKey],
  );
  return r ? Number(r.id) : null;
}

/** Append a message to a thread and bump its activity; returns the new message. */
export async function postMessage(
  threadId: number,
  sender: "customer" | "admin",
  body: string,
  isBot = false,
): Promise<ChatMessage | null> {
  const text = clean(body);
  if (!text) return null;
  const row = await queryOne<{ id: string; created_at: Date }>(
    `insert into odg_ecom.chat_messages (thread_id, sender, body, is_bot, read_by_admin, read_by_customer)
     values ($1, $2, $3, $4, $5, $6)
     returning id, created_at`,
    [threadId, sender, text, isBot, sender === "admin", sender === "customer"],
  );
  if (!row) return null;
  await query(
    `update odg_ecom.chat_threads set last_message_at = now(), last_sender = $2 where id = $1`,
    [threadId, sender],
  );
  return { id: Number(row.id), sender, isBot, body: text, createdAt: row.created_at.toISOString() };
}

/** Messages in a thread, optionally only those newer than `afterId` (polling). */
export async function getThreadMessages(threadId: number, afterId = 0): Promise<ChatMessage[]> {
  const rows = await query<{ id: string; sender: string; is_bot: boolean; body: string; created_at: Date }>(
    `select id, sender, is_bot, body, created_at
       from odg_ecom.chat_messages
      where thread_id = $1 and id > $2
      order by id asc
      limit 200`,
    [threadId, afterId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    sender: r.sender as "customer" | "admin",
    isBot: r.is_bot,
    body: r.body,
    createdAt: r.created_at.toISOString(),
  }));
}

/** Count AI-assistant replies in a thread within the last `hours` (rate limit). */
export async function countBotReplies(threadId: number, hours: number): Promise<number> {
  const r = await query<{ n: number }>(
    `select count(*)::int as n from odg_ecom.chat_messages
      where thread_id = $1 and is_bot = true and created_at >= now() - ($2 || ' hours')::interval`,
    [threadId, String(hours)],
  );
  return r[0]?.n ?? 0;
}

/** Mark a thread's messages from the other party as read. */
export async function markRead(threadId: number, reader: "customer" | "admin"): Promise<void> {
  const col = reader === "admin" ? "read_by_admin" : "read_by_customer";
  const other = reader === "admin" ? "customer" : "admin";
  await query(
    `update odg_ecom.chat_messages set ${col} = true
      where thread_id = $1 and sender = $2 and ${col} = false`,
    [threadId, other],
  );
}

/** Mark a thread as taken over by a human admin (silences the AI assistant). */
export async function setHumanTaken(threadId: number): Promise<void> {
  await query(`update odg_ecom.chat_threads set human_taken = true where id = $1`, [threadId]);
}

/** Let the AI assistant answer this thread again after a human/admin handoff. */
export async function releaseHumanTaken(threadId: number): Promise<void> {
  await query(`update odg_ecom.chat_threads set human_taken = false where id = $1`, [threadId]);
}

/** Manager dashboard metric: threads where AI is currently silenced. */
export async function countHumanTakenThreads(): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `select count(*)::text as n from odg_ecom.chat_threads where human_taken = true`,
  );
  return Number(r?.n ?? 0);
}

/** Bulk reset — useful after an AI outage or after enabling a new provider key. */
export async function releaseAllHumanTaken(): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `with updated as (
       update odg_ecom.chat_threads
          set human_taken = false
        where human_taken = true
        returning 1
     )
     select count(*)::text as n from updated`,
  );
  return Number(r?.n ?? 0);
}

/** The logged-in customer_code linked to a thread (null for guests). */
export async function getThreadCustomerCode(threadId: number): Promise<string | null> {
  const r = await query<{ customer_code: string | null }>(
    `select customer_code from odg_ecom.chat_threads where id = $1`,
    [threadId],
  );
  return r[0]?.customer_code ?? null;
}

/** Customer: unread admin replies for a single thread. */
export async function getCustomerUnread(threadId: number): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `select count(*)::text as n from odg_ecom.chat_messages
      where thread_id = $1
        and sender = 'admin'
        and read_by_customer = false`,
    [threadId],
  );
  return Number(r?.n ?? 0);
}

/** Admin: all threads, newest activity first, with unread-by-admin counts. */
export async function listThreads(search?: string): Promise<ChatThreadRow[]> {
  const params: unknown[] = [];
  let where = "";
  const s = search?.trim();
  if (s) {
    params.push(`%${s}%`);
    where = `where t.name ilike $1 or t.phone ilike $1 or t.customer_code ilike $1`;
  }
  const rows = await query<{
    id: string;
    cust_key: string;
    customer_code: string | null;
    name: string;
    phone: string | null;
    human_taken: boolean;
    last_message_at: Date;
    last_sender: string | null;
    last_body: string | null;
    unread: string;
  }>(
    `select t.id, t.cust_key, t.customer_code, t.name, t.phone, t.human_taken,
            t.last_message_at, t.last_sender,
            (select body from odg_ecom.chat_messages m where m.thread_id = t.id order by m.id desc limit 1) as last_body,
            (select count(*) from odg_ecom.chat_messages m
               where m.thread_id = t.id and m.sender = 'customer' and m.read_by_admin = false)::text as unread
       from odg_ecom.chat_threads t
       ${where}
      order by t.last_message_at desc
      limit 200`,
    params,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    custKey: r.cust_key,
    customerCode: r.customer_code,
    name: r.name,
    phone: r.phone,
    humanTaken: r.human_taken,
    lastMessageAt: r.last_message_at.toISOString(),
    lastSender: r.last_sender,
    lastBody: r.last_body,
    unread: Number(r.unread),
  }));
}

/** Admin: total unread customer messages across all threads (nav badge). */
export async function getTotalUnread(): Promise<number> {
  const r = await queryOne<{ n: string }>(
    `select count(*)::text as n from odg_ecom.chat_messages
      where sender = 'customer' and read_by_admin = false`,
  );
  return Number(r?.n ?? 0);
}

/** Admin: a single thread header (for the conversation view). */
export async function getThread(threadId: number): Promise<ChatThreadRow | null> {
  const all = await listThreads();
  return all.find((t) => t.id === threadId) ?? null;
}
