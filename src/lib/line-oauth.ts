import type { NextRequest } from "next/server";

// The LINE redirect_uri must be IDENTICAL in the authorize request and the token
// exchange, and must exactly match a callback URL registered in the LINE console.
//
// Always prefer the configured URL, including in `next dev` behind a public
// reverse proxy, because Next.js may only see the proxy's internal localhost
// origin. To test LINE Login against localhost directly, set this env value to
// http://localhost:3006/login/line/callback (and register that callback in LINE).
export function lineCallbackUrl(req: NextRequest): string {
  const origin = req.nextUrl.origin;
  const configured = process.env.LINE_LOGIN_CALLBACK_URL?.trim();
  if (configured) return configured;
  return `${origin}/login/line/callback`;
}

/** Build a browser-facing OdienMall URL from the same trusted origin as the
 * LINE callback. This avoids leaking a reverse proxy's localhost origin into
 * post-login and error redirects. */
export function lineAppUrl(req: NextRequest, path: string): URL {
  return new URL(path, lineCallbackUrl(req));
}
