import { NextRequest, NextResponse } from "next/server";
import { authenticateLineCustomer, setSessionCookie } from "@/lib/auth";
import { signPayload } from "@/lib/session";

export const dynamic = "force-dynamic";

const PENDING_COOKIE = "om_line_pending";

interface VerifyResponse {
  sub?: string;
  name?: string;
  picture?: string;
  email?: string;
  error?: string;
  error_description?: string;
}

export async function POST(req: NextRequest) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim();
  if (!channelId) {
    return NextResponse.json({ ok: false, error: "line_config" }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as { idToken?: unknown } | null;
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  if (!idToken) {
    return NextResponse.json({ ok: false, error: "line_token" }, { status: 400 });
  }

  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: channelId,
    }),
    cache: "no-store",
  });
  const verified = (await verifyRes.json().catch(() => ({}))) as VerifyResponse;
  if (!verifyRes.ok || !verified.sub) {
    console.error("LIFF id token verify failed", verifyRes.status, verified);
    return NextResponse.json({ ok: false, error: "line_token" }, { status: 401 });
  }

  const lineIdentity = {
    lineUserId: verified.sub,
    displayName: verified.name ?? null,
    pictureUrl: verified.picture ?? null,
    email: verified.email ?? null,
  };
  const sess = await authenticateLineCustomer(lineIdentity);
  if (!sess) {
    // Not yet linked → stash the verified identity + tell the client to go link.
    const res = NextResponse.json({ ok: false, error: "line_unlinked", link: "/login/line/link" }, { status: 403 });
    res.cookies.set(PENDING_COOKIE, signPayload(lineIdentity), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 60,
    });
    return res;
  }

  await setSessionCookie(sess);
  return NextResponse.json({ ok: true });
}
