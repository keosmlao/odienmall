import { NextResponse } from "next/server";
import { checkAlerts } from "@/lib/product-alerts";
import { syncDeliveryNotifications } from "@/lib/orders";
import { checkAbandonedCarts } from "@/lib/cart-recovery";
import { syncAffiliateCommissions } from "@/lib/affiliates";

export const dynamic = "force-dynamic";

// Periodic background jobs (call from a scheduler / cron, e.g. every few minutes):
//   GET /api/cron?token=CRON_TOKEN          — generic schedulers
//   Authorization: Bearer CRON_TOKEN        — Vercel Cron (set CRON_TOKEN = the
//                                             Vercel CRON_SECRET; see vercel.json)
// Runs: stock/price alerts + delivery notifications + abandoned carts + affiliate
// commission sync. Protect with CRON_TOKEN in production (no token set ⇒ open, dev only).
export async function GET(req: Request) {
  const token = process.env.CRON_TOKEN?.trim();
  if (token) {
    const got =
      new URL(req.url).searchParams.get("token") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      "";
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
