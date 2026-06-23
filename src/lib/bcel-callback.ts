import "server-only";

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createPublicKey, constants, verify } from "node:crypto";

// BCEL OnePay callback public key (DER SubjectPublicKeyInfo, hex encoded).
// It can be replaced without a deployment by setting ONEPAY_CALLBACK_PUBLIC_KEY_HEX.
export const DEFAULT_BCEL_CALLBACK_PUBLIC_KEY_HEX =
  "30820122300D06092A864886F70D01010105000382010F003082010A0282010100BB8E71F82ACF2D48010D9E728D9B9512E8D6F024E4CE305462B8D652345A044A59A587590E9BEAC3AE40BC5B0FC5B078E4C9C3B10514D81A2DE37B32590F3CDB4EE7852296D177FF9BB3473E611FD219B96180B77804542C7D569A320FAD9B8EA84A5D5AB8A058693428A35E7E45FBBAAB419B0133B16A8D5FC1989B7FADB5D65D336A94C5FCAC3E29E8AEB71C9037AB154E8A727328A6A02E15499EFD91291D960AC3C22AAF7E8FEC82553CE4547E18304F910D12182B793B00FAC6D322956E75BE921860B0CFD76817DE6B267D5BE75734F9F468573FA20D6869DD821C103EC4F45B14A70F2248194F1E4D6FB736BB58B92F15321D91C2F82867AC06C3C1D70203010001";

function cleanHex(value: string): string {
  return value.trim().replace(/^0x/i, "").replace(/\s+/g, "");
}

export function verifyBcelCallbackSignature(
  rawBody: Buffer,
  signatureHex: string,
  publicKeyHex = process.env.ONEPAY_CALLBACK_PUBLIC_KEY_HEX?.trim() ||
    DEFAULT_BCEL_CALLBACK_PUBLIC_KEY_HEX,
): boolean {
  try {
    const signature = cleanHex(signatureHex);
    const keyHex = cleanHex(publicKeyHex);
    if (
      !signature ||
      signature.length % 2 !== 0 ||
      !/^[0-9a-f]+$/i.test(signature) ||
      keyHex.length % 2 !== 0 ||
      !/^[0-9a-f]+$/i.test(keyHex)
    ) {
      return false;
    }
    const publicKey = createPublicKey({
      key: Buffer.from(keyHex, "hex"),
      format: "der",
      type: "spki",
    });
    return verify(
      "RSA-SHA256",
      rawBody,
      { key: publicKey, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

export function parseBcelCallbackBody(
  rawBody: Buffer,
  contentType: string,
): Record<string, unknown> {
  const text = rawBody.toString("utf8");
  if (!text) return {};

  if (contentType.toLowerCase().includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(text));
  }

  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function safeLogValue(value: unknown): unknown {
  if (typeof value === "string") return value.slice(0, 500);
  if (Array.isArray(value)) return value.slice(0, 20).map(safeLogValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, item]) => [key, safeLogValue(item)]),
    );
  }
  return value;
}

/** Best-effort self-hosted callback audit log. Never blocks the webhook. */
export async function logBcelCallback(
  event: string,
  detail: Record<string, unknown>,
): Promise<void> {
  const entry = `${new Date().toISOString()} ${event} ${JSON.stringify(safeLogValue(detail))}\n`;
  console.log(`[BCEL callback] ${event}`, safeLogValue(detail));
  try {
    const dir = path.join(process.cwd(), "logs");
    await mkdir(dir, { recursive: true });
    const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    await appendFile(path.join(dir, `callback_${day}.log`), entry, "utf8");
  } catch {
    // Ephemeral/serverless filesystems may reject writes; console logging remains.
  }
}
