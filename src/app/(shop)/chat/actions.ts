"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import {
  getOrCreateThread,
  getThreadIdByKey,
  postMessage,
  getThreadMessages,
  markRead,
  getCustomerUnread,
  type ChatMessage,
} from "@/lib/chat";
import { botReply } from "@/lib/chatbot";
import { checkAndRecordChatMessage } from "@/lib/chat-rate-limit";

const GUEST_COOKIE = "om_chat";

// Resolve the chat identity for the current visitor. Logged-in customers key on
// their customer_code; guests get a random token persisted in an httpOnly cookie.
async function identity(): Promise<{ custKey: string; name: string; customerCode: string | null }> {
  const session = await getSession();
  if (session?.code) {
    return { custKey: session.code, name: session.name || "ລູກຄ້າ", customerCode: session.code };
  }
  const jar = await cookies();
  let token = jar.get(GUEST_COOKIE)?.value;
  if (!token) {
    token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    jar.set(GUEST_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90, // 90 days
      path: "/",
    });
  }
  return { custKey: `guest:${token}`, name: "ລູກຄ້າ", customerCode: null };
}

export type SendResult = { ok: true; message: ChatMessage } | { ok: false; error: string };
export interface ChatPollResult {
  messages: ChatMessage[];
  unread: number;
}

/** Customer sends a message (creates the thread on first send). */
export async function sendChatMessage(body: string, name?: string): Promise<SendResult> {
  const text = (body ?? "").trim();
  if (!text) return { ok: false, error: "ກະລຸນາພິມຂໍ້ຄວາມ" };
  try {
    const id = await identity();
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip")?.trim() ||
      "unknown";
    const rate = checkAndRecordChatMessage(`${id.custKey}:${ip}`);
    if (!rate.allowed) {
      return {
        ok: false,
        error: `ສົ່ງຖີ່ເກີນໄປ ກະລຸນາລໍຖ້າ ${Math.ceil(rate.retryAfterSec / 60)} ນາທີ`,
      };
    }
    const threadId = await getOrCreateThread(id.custKey, {
      name: name?.trim() || id.name,
      customerCode: id.customerCode,
    });
    const message = await postMessage(threadId, "customer", text);
    if (!message) return { ok: false, error: "ສົ່ງບໍ່ສຳເລັດ" };
    // AI assistant answers first (best-effort; no-op without an API key, and stays
    // quiet once a human admin has taken over the thread). Awaited so the reply is
    // ready by the customer's next poll.
    await botReply(threadId, text).catch(() => {});
    return { ok: true, message };
  } catch (e) {
    console.error("sendChatMessage failed:", e);
    return { ok: false, error: "ເກີດຂໍ້ຜິດພາດ ລອງໃໝ່" };
  }
}

/**
 * Customer polls for messages newer than `afterId`.
 * Read state is persisted only while the conversation is visibly open.
 */
export async function fetchChatMessages(
  afterId = 0,
  markAsRead = false,
): Promise<ChatPollResult> {
  try {
    const id = await identity();
    const threadId = await getThreadIdByKey(id.custKey);
    if (!threadId) return { messages: [], unread: 0 };
    const msgs = await getThreadMessages(threadId, afterId);
    if (markAsRead) await markRead(threadId, "customer");
    const unread = await getCustomerUnread(threadId);
    return { messages: msgs, unread };
  } catch (e) {
    console.error("fetchChatMessages failed:", e);
    return { messages: [], unread: 0 };
  }
}

/** Persist that the customer opened and viewed the conversation. */
export async function markChatRead(): Promise<void> {
  try {
    const id = await identity();
    const threadId = await getThreadIdByKey(id.custKey);
    if (threadId) await markRead(threadId, "customer");
  } catch (e) {
    console.error("markChatRead failed:", e);
  }
}
