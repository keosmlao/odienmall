import "server-only";
import webpush from "web-push";
import { query } from "./db";

// Web Push (optional). Active only when VAPID keys are set. Generate a keypair
// once with:  npx web-push generate-vapid-keys  → put into .env:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@domain)
// The public key is exposed to the browser via NEXT_PUBLIC_VAPID_PUBLIC_KEY.

const PUBLIC = process.env.VAPID_PUBLIC_KEY?.trim() || "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY?.trim() || "";
const SUBJECT = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@odienmall.com";

export function pushConfigured(): boolean {
  return !!(PUBLIC && PRIVATE);
}

let ready = false;
function init() {
  if (ready || !pushConfigured()) return;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  ready = true;
}

export interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Save (upsert) a browser push subscription for a customer/guest key. */
export async function savePushSubscription(customerKey: string, sub: PushSub): Promise<void> {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return;
  await query(
    `insert into odg_ecom.push_subscriptions (customer_key, endpoint, p256dh, auth)
     values ($1, $2, $3, $4)
     on conflict (endpoint) do update set customer_key = excluded.customer_key,
        p256dh = excluded.p256dh, auth = excluded.auth`,
    [customerKey, sub.endpoint, sub.keys.p256dh, sub.keys.auth],
  );
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await query(`delete from odg_ecom.push_subscriptions where endpoint = $1`, [endpoint]);
}

/** Send a push to every subscription for a customer. No-op unless configured. */
export async function sendPushToCustomer(
  customerKey: string,
  payload: { title: string; body: string; link?: string },
): Promise<void> {
  if (!pushConfigured()) return;
  init();
  const subs = await query<{ endpoint: string; p256dh: string; auth: string }>(
    `select endpoint, p256dh, auth from odg_ecom.push_subscriptions where customer_key = $1`,
    [customerKey],
  );
  const data = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
      } catch (e: unknown) {
        // 404/410 → subscription gone; clean it up.
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) await removePushSubscription(s.endpoint).catch(() => {});
      }
    }),
  );
}

export const VAPID_PUBLIC_KEY = PUBLIC;
