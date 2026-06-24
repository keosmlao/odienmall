import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// Lightweight health check for uptime monitors / load balancers. Verifies the
// process is up and the database is reachable. No auth, no secrets.
export async function GET() {
  try {
    await query("select 1");
    return NextResponse.json({ ok: true, db: "up" });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
