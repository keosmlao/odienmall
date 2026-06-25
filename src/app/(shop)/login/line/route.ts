import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "om_line_state";
const REDIRECT_COOKIE = "om_line_redirect";

function safeRedirect(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export async function GET(req: NextRequest) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim();
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET?.trim();
  if (!channelId || !channelSecret) {
    return NextResponse.redirect(new URL("/login?error=line_config", req.url));
  }

  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(16).toString("base64url");
  const redirectUri = process.env.LINE_LOGIN_CALLBACK_URL?.trim() || new URL("/login/line/callback", req.url).toString();
  const redirectTo = safeRedirect(req.nextUrl.searchParams.get("redirect"));

  const auth = new URL("https://access.line.me/oauth2/v2.1/authorize");
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("client_id", channelId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("state", state);
  auth.searchParams.set("scope", "profile openid email");
  auth.searchParams.set("nonce", nonce);
  auth.searchParams.set("bot_prompt", "normal");

  const res = NextResponse.redirect(auth);
  const cookie = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  };
  res.cookies.set(STATE_COOKIE, state, cookie);
  res.cookies.set(REDIRECT_COOKIE, redirectTo, cookie);
  return res;
}
