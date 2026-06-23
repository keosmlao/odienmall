import { verifyOnepayCallback } from "@/lib/onepay-store";

export const dynamic = "force-dynamic";

/** Public health check used when registering/testing the callback URL with BCEL. */
export async function GET() {
  return Response.json({
    ok: true,
    service: "BCEL OnePay callback",
    path: "/api/payments/onepay/callback",
  });
}

function callbackUuid(body: Record<string, unknown>): string {
  const data =
    body.data && typeof body.data === "object"
      ? (body.data as Record<string, unknown>)
      : {};
  const value =
    body.uuid ??
    body.UUID ??
    body.transactionUuid ??
    body.transaction_uuid ??
    data.uuid ??
    data.UUID;
  return typeof value === "string" ? value.trim() : "";
}

async function callbackBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const value = await request.json();
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  }
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

/**
 * BCEL callback target:
 *   https://<SITE_URL>/api/payments/onepay/callback
 *
 * The callback payload is treated only as a notification. Payment is accepted
 * after a server-to-server /checkonepayqr call confirms the UUID and amount.
 */
export async function POST(request: Request) {
  try {
    const body = await callbackBody(request);
    const uuid = callbackUuid(body);
    if (!uuid) {
      return Response.json(
        { result: 1, message: "UUID missing" },
        { status: 400 },
      );
    }

    const status = await verifyOnepayCallback(uuid);
    if (status.state !== "paid") {
      return Response.json({
        result: 1,
        message: status.message || "Payment not confirmed",
        status: status.state,
      });
    }
    return Response.json({ result: 0, message: "Operation success" });
  } catch (error) {
    console.error("OnePay callback failed:", error);
    return Response.json(
      {
        result: 1,
        message: error instanceof Error ? error.message : "Callback failed",
      },
      { status: 400 },
    );
  }
}
