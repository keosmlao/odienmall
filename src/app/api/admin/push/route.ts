import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { savePushSubscription, removePushSubscription, pushConfigured, type PushSub } from "@/lib/push";

const ADMIN_KEY = "__admin__";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  const body = (await req.json()) as PushSub;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  await savePushSubscription(ADMIN_KEY, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as { endpoint?: string };
  if (body?.endpoint) await removePushSubscription(body.endpoint);
  return NextResponse.json({ ok: true });
}
