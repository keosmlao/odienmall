import { NextResponse, type NextRequest } from "next/server";
import { resolveActiveAffiliate, recordClick } from "@/lib/affiliates";

// Referral entry point: /r/<code>  (or /r/<code>?to=/product/XYZ for a deep link).
// Sets the `om_ref` attribution cookie (30 days, last-click) for an *active*
// affiliate, logs the click, then redirects to a validated internal path.
const REF_COOKIE = "om_ref";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function GET(req: NextRequest, ctx: RouteContext<"/r/[code]">) {
  const { code } = await ctx.params;
  const to = req.nextUrl.searchParams.get("to");
  // Only allow a same-origin absolute path. Backslashes are rejected because
  // URL parsing normalises `/\evil.example` into an external host.
  let dest = "/";
  if (to?.startsWith("/") && !to.startsWith("//") && !to.includes("\\")) {
    const target = new URL(to, req.nextUrl.origin);
    if (target.origin === req.nextUrl.origin) {
      dest = `${target.pathname}${target.search}${target.hash}`;
    }
  }

  const res = NextResponse.redirect(new URL(dest, req.url));
  const aff = await resolveActiveAffiliate(code);
  if (aff) {
    res.cookies.set(REF_COOKIE, code, {
      maxAge: MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    await recordClick(code, dest);
  }
  return res;
}
