"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { throttle } from "@/lib/rate-limit";
import { collectDaily, awardFacebookShare, type CollectResult } from "@/lib/engage-points";

export async function collectPointAction(): Promise<CollectResult> {
  const session = await getSession();
  if (!session?.code) return { ok: false, awarded: 0, usedToday: 0, maxPerDay: 0, remaining: 0, reason: "disabled" };
  // Light anti-spam (the per-day cap is the real limit).
  if (!throttle(`collect:${session.code}`, 20, 60 * 1000)) {
    return { ok: false, awarded: 0, usedToday: 0, maxPerDay: 0, remaining: 0, reason: "limit" };
  }
  const res = await collectDaily(session.code);
  if (res.awarded > 0) revalidatePath("/account");
  return res;
}

export async function facebookShareAction(): Promise<CollectResult> {
  const session = await getSession();
  if (!session?.code) return { ok: false, awarded: 0, usedToday: 0, maxPerDay: 0, remaining: 0, reason: "disabled" };
  if (!throttle(`fbshare:${session.code}`, 20, 60 * 1000)) {
    return { ok: false, awarded: 0, usedToday: 0, maxPerDay: 0, remaining: 0, reason: "limit" };
  }
  const res = await awardFacebookShare(session.code);
  if (res.awarded > 0) revalidatePath("/account");
  return res;
}
