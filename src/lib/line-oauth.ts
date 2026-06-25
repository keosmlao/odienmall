import type { NextRequest } from "next/server";

// The LINE redirect_uri must be IDENTICAL in the authorize request and the token
// exchange, and must exactly match a callback URL registered in the LINE console.
//
// In production we use the configured LINE_LOGIN_CALLBACK_URL. On localhost (next
// dev) we ignore it and derive the callback from the request origin, so you can
// test without editing .env — just register http://localhost:3000/login/line/callback
// in the LINE console as an additional callback URL.
export function lineCallbackUrl(req: NextRequest): string {
  const origin = req.nextUrl.origin;
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const configured = process.env.LINE_LOGIN_CALLBACK_URL?.trim();
  if (configured && !isLocal) return configured;
  return `${origin}/login/line/callback`;
}
