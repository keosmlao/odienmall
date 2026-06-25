import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { lineNotifyAdmin } from "@/lib/line-notify";

export const dynamic = "force-dynamic";

let lastDbDown = 0; // Throttle: notify at most once per 10 min per process.
const NOTIFY_THROTTLE_MS = 10 * 60 * 1000;

// Lightweight health check for uptime monitors / load balancers. Verifies the
// process is up and the database is reachable. No auth, no secrets.
export async function GET() {
  try {
    await query("select 1");
    return NextResponse.json({ ok: true, db: "up" });
  } catch (e) {
    const now = Date.now();
    if (now - lastDbDown > NOTIFY_THROTTLE_MS) {
      lastDbDown = now;
      lineNotifyAdmin(`\n[OdienMall] ⚠️ DB ລົງ!\nHealth check ລົ້ມເຫລວ: ${e instanceof Error ? e.message : "unknown"}`).catch(() => {});
    }
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
