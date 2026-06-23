"use server";

import { getSession } from "@/lib/auth";
import { saveCart, type SavedCartItem } from "@/lib/cart-recovery";

/** Sync the cart snapshot for the logged-in customer (no-op for guests). */
export async function syncCart(items: SavedCartItem[]): Promise<void> {
  const session = await getSession();
  if (!session?.code) return;
  await saveCart(session.code, items).catch(() => {});
}
