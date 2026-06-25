"use server";

import { isAdmin } from "@/lib/auth";
import {
  listThreads,
  getThreadMessages,
  postMessage,
  markRead,
  setHumanTaken,
  releaseHumanTaken,
  type ChatMessage,
  type ChatThreadRow,
} from "@/lib/chat";
import { botReply } from "@/lib/chatbot";

export async function adminListThreads(search?: string): Promise<ChatThreadRow[]> {
  if (!(await isAdmin())) return [];
  return listThreads(search);
}

/** Messages newer than `afterId` for a thread; marks customer messages read. */
export async function adminGetMessages(
  threadId: number,
  afterId = 0,
): Promise<ChatMessage[]> {
  if (!(await isAdmin())) return [];
  const msgs = await getThreadMessages(threadId, afterId);
  await markRead(threadId, "admin");
  return msgs;
}

export type AdminReplyResult = { ok: true; message: ChatMessage } | { ok: false; error: string };

export async function adminReply(threadId: number, body: string): Promise<AdminReplyResult> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  const text = (body ?? "").trim();
  if (!text) return { ok: false, error: "ກະລຸນາພິມຂໍ້ຄວາມ" };
  try {
    const message = await postMessage(threadId, "admin", text);
    if (!message) return { ok: false, error: "ສົ່ງບໍ່ສຳເລັດ" };
    // A human admin has taken over → silence the AI assistant on this thread.
    await setHumanTaken(threadId).catch(() => {});
    return { ok: true, message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}

export type ResumeBotResult = { ok: true } | { ok: false; error: string };

/** Allow AI to answer a thread again. Only fires a bot reply if the latest
 *  customer message has not yet received a bot response (avoids duplicates). */
export async function adminResumeBot(threadId: number): Promise<ResumeBotResult> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  try {
    await releaseHumanTaken(threadId);
    const msgs = await getThreadMessages(threadId, 0);
    // Find the latest customer message index.
    const lastCustIdx = [...msgs].reverse().findIndex((m) => m.sender === "customer");
    if (lastCustIdx === -1) return { ok: true };
    const latestCustomer = [...msgs].reverse()[lastCustIdx];
    // Check whether a bot reply already exists AFTER that customer message.
    const msgsAfterCustomer = [...msgs].reverse().slice(0, lastCustIdx);
    const alreadyAnswered = msgsAfterCustomer.some((m) => m.isBot);
    if (!alreadyAnswered) {
      // Only fire the bot if the customer question is unanswered.
      botReply(threadId, latestCustomer.body).catch(() => {});
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ຜິດພາດ" };
  }
}
