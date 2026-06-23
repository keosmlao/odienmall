import "server-only";

// BCEL OnePay service API client (Generate dynamic QR + check payment status).
// Server-only. All calls are server→BCEL with a JWT obtained from /authen.
// Gated by ONEPAY_ENABLED — when off (or creds missing) the storefront falls
// back to the static bank-transfer block.

const BASE_URL = (process.env.ONEPAY_BASE_URL || "https://bcel.la:8093/onepayservice").replace(/\/$/, "");
const USERNAME = process.env.ONEPAY_USERNAME || "";
const PASSWORD = process.env.ONEPAY_PASSWORD || "";
const FIXED_JWT = process.env.ONEPAY_JWT?.trim() || "";
const MCID = process.env.ONEPAY_MCID || "";
const SHOPCODE = process.env.ONEPAY_SHOPCODE || "";
const MC_NAME = process.env.ONEPAY_MC_NAME || "ODIEN";
const MCC = process.env.ONEPAY_MCC || "5732";
const CITY = process.env.ONEPAY_CITY || "VT";

/** API mode: live JWT calls (generate dynamic QR + check payment) are available. */
export function onepayEnabled(): boolean {
  return (
    process.env.ONEPAY_ENABLED === "1" &&
    (!!FIXED_JWT || (!!USERNAME && !!PASSWORD))
  );
}

/** Local mode: we at least know the MCID, so we can build a payable QR offline. */
export function onepayMerchantConfigured(): boolean {
  return !!MCID;
}

// ---- JWT token cache (module-scoped; refreshed shortly before expiry) -------
let tokenCache: { jwt: string; expMs: number } | null = null;

async function postJson(path: string, body: unknown, jwt?: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json;charset=utf-8",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  // BCEL returns JSON for both success and failure.
  return (await res.json()) as Record<string, unknown>;
}

async function getToken(): Promise<string> {
  if (FIXED_JWT) return FIXED_JWT;

  const now = Date.now();
  if (tokenCache && tokenCache.expMs - 60_000 > now) return tokenCache.jwt;

  const json = await postJson("/authen", { username: USERNAME, password: PASSWORD });
  const jwt = json.jwt as string | undefined;
  if (!jwt) {
    throw new Error(`OnePay auth failed: ${(json.message as string) ?? "no token"}`);
  }
  const expIso = json.expire as string | undefined;
  const expMs = expIso ? Date.parse(expIso) : now + 50 * 60_000;
  tokenCache = { jwt, expMs: Number.isFinite(expMs) ? expMs : now + 50 * 60_000 };
  return jwt;
}

/** How long a generated QR stays valid before the customer must regenerate. */
export const QR_EXPIRE_MINUTES = 3;

/** Format a Date as yyyymmddHHMMSS in Asia/Vientiane (UTC+7) for OnePay `expire`. */
function formatExpire(at: Date): string {
  const v = new Date(at.getTime() + 7 * 60 * 60_000); // shift to UTC+7
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${v.getUTCFullYear()}${p(v.getUTCMonth() + 1)}${p(v.getUTCDate())}` +
    `${p(v.getUTCHours())}${p(v.getUTCMinutes())}${p(v.getUTCSeconds())}`
  );
}

export interface GenerateQrInput {
  amount: number;
  uuid: string;
  invoiceId: string;
  desc: string;
  /** Absolute expiry time for the QR (sent to OnePay as tag 33.03). */
  expireAt?: Date;
}

export interface GeneratedQr {
  qrc: string;
  expireAt: Date;
}

/** Generate a dynamic OnePay QR string (EMVco payload) for an amount. */
export async function generateQr(input: GenerateQrInput): Promise<GeneratedQr> {
  const jwt = await getToken();
  const expireAt = input.expireAt ?? new Date(Date.now() + QR_EXPIRE_MINUTES * 60_000);
  const json = await postJson(
    "/genonepayqr",
    {
      amount: input.amount,
      uuid: input.uuid,
      invoiceid: input.invoiceId.slice(0, 15),
      desc: input.desc.slice(0, 25),
      expire: formatExpire(expireAt),
      ...(SHOPCODE ? { shopcode: SHOPCODE } : {}),
    },
    jwt,
  );
  if (json.result !== 0) {
    throw new Error(`OnePay genqr failed: ${(json.message as string) ?? "unknown"}`);
  }
  const qrc = (json.data as { qrc?: string } | undefined)?.qrc;
  if (!qrc) throw new Error("OnePay genqr: missing qrc");
  return { qrc, expireAt };
}

export type PaymentState = "paid" | "scanned" | "generated" | "notfound";

export interface PaymentStatus {
  state: PaymentState;
  message: string;
  /** Present when paid. */
  amount?: string;
  ticket?: string;
  fccRef?: string;
  payerName?: string;
  txTime?: string;
}

/** Check payment status for a previously generated QR (by uuid). */
export async function checkPayment(uuid: string): Promise<PaymentStatus> {
  const jwt = await getToken();
  const json = await postJson(
    "/checkonepayqr",
    { uuid, ...(SHOPCODE ? { shopcode: SHOPCODE } : {}) },
    jwt,
  );
  const message = (json.message as string) ?? "";

  if (json.result === 0) {
    const d = (json.data ?? {}) as Record<string, string>;
    return {
      state: "paid",
      message,
      amount: d.LAKAMOUNT ?? d.AMOUNT,
      ticket: d.TICKET,
      fccRef: d.FCCREF,
      payerName: d.NAME,
      txTime: d.TXTIME,
    };
  }
  // result == 1: either still pending (Generated QR / Scanned) or not found.
  const status = ((json.data as { STATUS?: string } | undefined)?.STATUS ?? "").toLowerCase();
  if (status.includes("scan")) return { state: "scanned", message };
  if (status.includes("generat")) return { state: "generated", message };
  return { state: "notfound", message };
}

export const onepayConfig = { mcid: MCID, shopcode: SHOPCODE };

// --------------------------------------------------------------------------
// Local (offline) BCEL OnePay QR builder — EMVco TLV + CRC16. Lets us show a
// payable merchant QR (MCID + amount + bill + expire) WITHOUT the JWT API.
// Payment auto-confirmation still needs the API; without it, confirm manually.
// --------------------------------------------------------------------------

/** EMVco tag: id + 2-digit length + value. */
function tlv(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), uppercase 4-hex — EMVco tag 63. */
function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function fmtExpireLocal(at: Date): string {
  const v = new Date(at.getTime() + 7 * 60 * 60_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${v.getUTCFullYear()}${p(v.getUTCMonth() + 1)}${p(v.getUTCDate())}` +
    `${p(v.getUTCHours())}${p(v.getUTCMinutes())}${p(v.getUTCSeconds())}`
  );
}

/** Build a scannable BCEL OnePay QR payload string locally (no API call). */
export function buildLocalQr(opts: { amount: number; billNo: string; expireAt: Date }): string {
  const merchantBlock =
    tlv("00", "BCEL") +
    tlv("01", "ONEPAY") +
    tlv("02", MCID) +
    tlv("03", fmtExpireLocal(opts.expireAt));

  let s =
    tlv("00", "01") + // payload format indicator
    tlv("01", "12") + // dynamic QR (amount present)
    tlv("33", merchantBlock) +
    tlv("52", MCC) +
    tlv("53", "418") + // LAK
    tlv("54", String(Math.round(opts.amount))) +
    tlv("58", "LA") +
    tlv("59", MC_NAME.slice(0, 25)) +
    tlv("60", CITY) +
    tlv("62", tlv("01", opts.billNo.slice(0, 25)));

  s += "6304"; // CRC tag id + length, value computed over everything incl. this
  return s + crc16(s);
}
