import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = typeof body?.code === "string" ? body.code.trim() : null;
    if (!code) return NextResponse.json({ ok: false }, { status: 400 });

    await pool.query(
      `insert into odg_ecom.product_views (product_code) values ($1)`,
      [code],
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
