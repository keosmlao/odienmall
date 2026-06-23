"use server";

import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { listNotifications, countUnread, markAllRead, type Notification } from "@/lib/notifications";
import { savePushSubscription, removePushSubscription, type PushSub } from "@/lib/push";

/** Current customer's notifications (empty for guests). */
export async function getMyNotifications(): Promise<{ items: Notification[]; unread: number }> {
  const session = await getSession();
  if (!session?.code) return { items: [], unread: 0 };
  const [items, unread] = await Promise.all([
    listNotifications(session.code),
    countUnread(session.code),
  ]);
  return { items, unread };
}

export async function getMyUnread(): Promise<number> {
  const session = await getSession();
  return session?.code ? countUnread(session.code) : 0;
}

export async function markMyNotificationsRead(): Promise<void> {
  const session = await getSession();
  if (session?.code) await markAllRead(session.code);
}

// Resolve a push key: customer_code if logged in, else the guest chat token.
async function pushKey(): Promise<string> {
  const session = await getSession();
  if (session?.code) return session.code;
  const token = (await cookies()).get("om_chat")?.value;
  return token ? `guest:${token}` : "guest:anon";
}

export async function subscribePush(sub: PushSub): Promise<{ ok: boolean }> {
  try {
    await savePushSubscription(await pushKey(), sub);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await removePushSubscription(endpoint).catch(() => {});
}
