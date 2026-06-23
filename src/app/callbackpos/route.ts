import {
  logBcelCallback,
  parseBcelCallbackBody,
  verifyBcelCallbackSignature,
} from "@/lib/bcel-callback";
import { confirmPaymentByCallback } from "@/lib/onepay-store";

// BCEL OnePay signed callback:
//   POST https://www.odienmall.com/callbackpos
// The RSA-SHA256 signature is verified against the exact raw request bytes
// before any callback field is parsed or trusted.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CallbackData = Record<string, unknown>;

function asRecord(value: unknown): CallbackData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as CallbackData;
}

function callbackScopes(body: CallbackData): CallbackData[] {
  const scopes = [body];
  const data = body.data;
  if (typeof data === "string") {
    try {
      scopes.push(asRecord(JSON.parse(data)));
    } catch {
      // Not an embedded JSON object.
    }
  } else {
    scopes.push(asRecord(data));
  }
  scopes.push(asRecord(body.transaction));
  scopes.push(asRecord(body.payment));
  return scopes;
}

function pick(scopes: CallbackData[], keys: string[]): string | undefined {
  for (const scope of scopes) {
    for (const key of keys) {
      const value = scope[key];
      if (value != null && String(value).trim() !== "") return String(value).trim();
    }
  }
  return undefined;
}

function callbackAmount(scopes: CallbackData[]): number | undefined {
  const raw = pick(scopes, [
    "LAKAMOUNT",
    "lakAmount",
    "lakamount",
    "AMOUNT",
    "amount",
    "transactionAmount",
    "transaction_amount",
  ]);
  if (!raw) return undefined;
  const amount = Number(raw.replaceAll(",", ""));
  return Number.isFinite(amount) ? amount : Number.NaN;
}

function response(status: "0" | "1", message: string, extra?: CallbackData) {
  return Response.json({ status, message, ...extra }, { status: 200 });
}

export async function POST(request: Request) {
  const signature = request.headers.get("Signature")?.trim() ?? "";
  const rawBody = Buffer.from(await request.arrayBuffer());

  if (rawBody.length === 0 || !signature) {
    await logBcelCallback("missing_signature_or_data", {
      hasSignature: !!signature,
      bodyBytes: rawBody.length,
    });
    return response("1", "Signature or data is missing");
  }

  if (!verifyBcelCallbackSignature(rawBody, signature)) {
    await logBcelCallback("invalid_signature", {
      signaturePrefix: signature.slice(0, 16),
      bodyBytes: rawBody.length,
    });
    return response("1", "Signature is invalid or Error verifying signature");
  }

  // Optional second factor. Signature verification is always mandatory.
  const token = process.env.ONEPAY_CALLBACK_TOKEN?.trim();
  if (token) {
    const url = new URL(request.url);
    const provided =
      url.searchParams.get("token") ??
      request.headers.get("x-callback-token") ??
      "";
    if (provided !== token) {
      await logBcelCallback("invalid_callback_token", { bodyBytes: rawBody.length });
      return response("1", "Unauthorized callback");
    }
  }

  const body = parseBcelCallbackBody(
    rawBody,
    request.headers.get("content-type") ?? "",
  );
  const scopes = callbackScopes(body);
  const uuid = pick(scopes, [
    "uuid",
    "UUID",
    "Uuid",
    "txnUuid",
    "transactionUuid",
    "transaction_uuid",
  ]);
  const invoiceId = pick(scopes, [
    "invoiceid",
    "invoiceId",
    "INVOICEID",
    "invoice",
    "billnumber",
    "bill_number",
    "billNumber",
    "BILLNUMBER",
    "orderNo",
    "order_no",
  ]);
  const amount = callbackAmount(scopes);
  const ticket = pick(scopes, ["TICKET", "ticket", "transactionId", "transaction_id"]);
  const fccRef = pick(scopes, ["FCCREF", "fccRef", "fcc_ref", "reference", "ref"]);
  const payerName = pick(scopes, ["NAME", "name", "payerName", "payer_name"]);

  await logBcelCallback("signature_verified", {
    uuid,
    invoiceId,
    amount,
    ticket,
    fccRef,
    payerName,
    body,
  });

  if (!uuid && !invoiceId) {
    return response("1", "UUID or invoice ID is missing");
  }

  const result = await confirmPaymentByCallback({
    uuid,
    invoiceId,
    amount,
    trustedCallback: true,
    info: { ticket, fccRef, payerName },
  });

  if (!result.ok) {
    await logBcelCallback("payment_not_saved", {
      uuid,
      invoiceId,
      reason: result.reason,
    });
    return response("1", `Transaction not saved: ${result.reason}`);
  }

  await logBcelCallback("transaction_saved", {
    uuid,
    invoiceId,
    orderNo: result.orderNo,
    alreadyPaid: result.alreadyPaid,
  });
  return response("0", "transaction saved.", {
    orderNo: result.orderNo,
    alreadyPaid: result.alreadyPaid,
  });
}

export async function GET() {
  return Response.json({
    status: "0",
    message: "BCEL signed callback ready",
    signature: "RSA-SHA256 / PKCS#1 v1.5",
  });
}
