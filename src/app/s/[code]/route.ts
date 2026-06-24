import { NextResponse, type NextRequest } from "next/server";
import { resolveSalespersonCode } from "@/lib/auth";
import { recordSalesClick } from "@/lib/sales-link";

// Salesperson attribution entry point: /s/<employee_code>
//   (or /s/<code>?to=/product/XYZ for a deep link).
// Sets the `om_sale` cookie (30 days, last-click) for a VALID active salesperson,
// then redirects to a validated internal path. At checkout the cookie is read
// server-side and stamped onto the order as sale_code → SML ic_trans.sale_code.
const SALE_COOKIE = "om_sale";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function GET(req: NextRequest, ctx: RouteContext<"/s/[code]">) {
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
  const sale = await resolveSalespersonCode(code);
  if (sale) {
    res.cookies.set(SALE_COOKIE, sale, {
      maxAge: MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    await recordSalesClick(sale, dest);
  }
  return res;
}
