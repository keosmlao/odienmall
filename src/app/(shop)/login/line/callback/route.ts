import { NextRequest, NextResponse } from "next/server";
import { authenticateLineCustomer, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "om_line_state";
const REDIRECT_COOKIE = "om_line_redirect";

interface TokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface IdTokenVerifyResponse {
  sub?: string;
  name?: string;
  picture?: string;
  email?: string;
  error?: string;
  error_description?: string;
}

interface ProfileResponse {
  userId?: string;
  displayName?: string;
  pictureUrl?: string;
}

function safeRedirect(value: string | undefined): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

function loginUrl(req: NextRequest, error: string) {
  return new URL(`/login?error=${encodeURIComponent(error)}`, req.url);
}

export async function GET(req: NextRequest) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim();
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET?.trim();
  if (!channelId || !channelSecret) {
    return NextResponse.redirect(loginUrl(req, "line_config"));
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expected = req.cookies.get(STATE_COOKIE)?.value;
  const redirectTo = safeRedirect(req.cookies.get(REDIRECT_COOKIE)?.value);
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(loginUrl(req, "line_state"));
  }

  const redirectUri = process.env.LINE_LOGIN_CALLBACK_URL?.trim() || new URL("/login/line/callback", req.url).toString();

  try {
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: channelId,
        client_secret: channelSecret,
      }),
      cache: "no-store",
    });
    const token = (await tokenRes.json().catch(() => ({}))) as TokenResponse;
    if (!tokenRes.ok || !token.access_token) {
      console.error("LINE token failed", tokenRes.status, token);
      return NextResponse.redirect(loginUrl(req, "line_token"));
    }

    let verified: IdTokenVerifyResponse = {};
    if (token.id_token) {
      const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          id_token: token.id_token,
          client_id: channelId,
        }),
        cache: "no-store",
      });
      verified = (await verifyRes.json().catch(() => ({}))) as IdTokenVerifyResponse;
      if (!verifyRes.ok) console.error("LINE id token verify failed", verifyRes.status, verified);
    }

    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });
    const profile = (await profileRes.json().catch(() => ({}))) as ProfileResponse;
    const lineUserId = verified.sub || profile.userId;
    if (!lineUserId) {
      console.error("LINE profile missing user id", { verified, profile });
      return NextResponse.redirect(loginUrl(req, "line_profile"));
    }

    const sess = await authenticateLineCustomer({
      lineUserId,
      displayName: verified.name || profile.displayName || null,
      pictureUrl: verified.picture || profile.pictureUrl || null,
      email: verified.email || null,
    });
    if (!sess) {
      return NextResponse.redirect(loginUrl(req, "line_unlinked"));
    }

    const res = NextResponse.redirect(new URL(redirectTo, req.url));
    res.cookies.delete(STATE_COOKIE);
    res.cookies.delete(REDIRECT_COOKIE);
    await setSessionCookie(sess);
    return res;
  } catch (e) {
    console.error("LINE login callback failed:", e);
    return NextResponse.redirect(loginUrl(req, "line_failed"));
  }
}
