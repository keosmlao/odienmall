"use server";

import { isAdmin } from "@/lib/auth";
import { getOnlineCount } from "@/lib/analytics";

/** Live "online now" count for the admin analytics widget (polled). */
export async function refreshOnline(): Promise<number> {
  if (!(await isAdmin())) return 0;
  return getOnlineCount();
}
