"use server";

import { isAdmin } from "@/lib/auth";
import {
  listThreads,
  getThreadMessages,
  postMessage,
  markRead,
  setHumanTaken,
  type ChatMessage,
  type ChatThreadRow,
} from "@/lib/chat";

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
