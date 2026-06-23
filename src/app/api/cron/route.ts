import { NextResponse } from "next/server";
import { checkAlerts } from "@/lib/product-alerts";
import { syncDeliveryNotifications } from "@/lib/orders";
import { checkAbandonedCarts } from "@/lib/cart-recovery";
import { syncAffiliateCommissions } from "@/lib/affiliates";

export const dynamic = "force-dynamic";

// Periodic background jobs (call from a scheduler / cron, e.g. every few minutes):
//   GET /api/cron?token=CRON_TOKEN
// Runs: back-in-stock / price-drop alerts + delivery-status notifications.
// Protect with CRON_TOKEN in production (no token set ⇒ open, dev only).
export async function GET(req: Request) {
  const token = process.env.CRON_TOKEN?.trim();
  if (token) {
    const got = new URL(req.url).searchParams.get("token");
    if (got !== token) return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const [alerts, delivery, carts, commissions] = await Promise.all([
      checkAlerts(),
      syncDeliveryNotifications(),
      checkAbandonedCarts(),
      syncAffiliateCommissions(),
    ]);
    return NextResponse.json({ ok: true, alerts, delivery, carts, commissions });
  } catch (e) {
    console.error("cron failed:", e);
    return NextResponse.json({ ok: false, error: "cron failed" }, { status: 500 });
  }
}
