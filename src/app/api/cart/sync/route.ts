import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSavedCart } from "@/lib/cart-recovery";

export const dynamic = "force-dynamic";

// Returns the server-saved cart for the current session user.
// Used by CartSyncClient to seed localStorage after login.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ items: [] });
  const items = await getSavedCart(session.code);
  return NextResponse.json({ items });
}
