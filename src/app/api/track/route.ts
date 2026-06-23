import { NextResponse } from "next/server";
import { recordVisit } from "@/lib/analytics";

// First-party visit beacon. The client posts { vid, path, view } on navigation
// and a periodic heartbeat (view=false). Best-effort — never throws to the client.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const vid = typeof body?.vid === "string" ? body.vid : "";
    const path = typeof body?.path === "string" ? body.path : null;
    const view = body?.view !== false; // default to a view unless explicitly a ping
    if (vid) await recordVisit(vid, path, view);
  } catch {
    // swallow — analytics must never break navigation
  }
  return NextResponse.json({ ok: true });
}
