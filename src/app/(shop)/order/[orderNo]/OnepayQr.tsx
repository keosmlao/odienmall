"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatKip } from "@/lib/format";
import { checkOrderPayment, regenerateOrderQr, confirmOrderPaid } from "./actions";

// BCEL's official client lib (public/onepay.js) + PubNub SDK — loaded on demand.
const PUBNUB_SRC = "https://cdn.pubnub.com/sdk/javascript/pubnub.4.37.0.min.js";
const ONEPAY_SRC = "/onepay.js";
const ONEPAY_MCID = process.env.NEXT_PUBLIC_ONEPAY_MCID || "";
const ONEPAY_SHOPCODE = process.env.NEXT_PUBLIC_ONEPAY_SHOPCODE || "";
// PubNub subscribe key — same one hard-coded inside BCEL's public/onepay.js.
const PUBNUB_SUBKEY = "sub-c-91489692-fa26-11e9-be22-ea7c5aada356";

type PubNubMessage = { channel?: string; message?: unknown };
interface PubNubClient {
  addListener: (h: { message?: (m: PubNubMessage) => void; status?: (s: unknown) => void }) => void;
  subscribe: (o: { channels: string[]; withPresence?: boolean }) => void;
  unsubscribeAll: () => void;
}

declare global {
  interface Window {
    OnePay?: new (mcid: string) => {
      getCode: (params: Record<string, unknown>, cb: (qr: string) => void) => void;
      subscribe: (params: Record<string, unknown>, onpaid: (res: unknown) => void) => void;
      stop: () => void;
    };
    PubNub?: new (cfg: { subscribeKey: string; ssl?: boolean }) => PubNubClient;
  }
}

let scriptsPromise: Promise<void> | null = null;
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(s);
  });
}
function loadOnepayLib(): Promise<void> {
  if (!scriptsPromise) {
    scriptsPromise = loadScript(PUBNUB_SRC).then(() => loadScript(ONEPAY_SRC));
  }
  return scriptsPromise;
}

type QrData = {
  qrDataUrl: string;
  qrString?: string;
  amount?: number;
  expiresAt: string | null;
  status: string;
};

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Open BCEL One app using the official custom URL scheme (bcelone://?qrc=…).
// Waits 2 s then falls back to the relevant app-store page if the app is not installed.
function openBcelOne(qrString: string) {
  window.location.href = `bcelone://?qrc=${encodeURIComponent(qrString)}`;
  setTimeout(() => {
    if (document.hidden) return; // app opened → page went to background
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    window.location.href = isIOS
      ? "https://apps.apple.com/la/app/bcel-one/id1455826426"
      : "https://play.google.com/store/apps/details?id=la.bcel.bcelone";
  }, 2000);
}

// BCEL OnePay payment UI. The QR always shows inside a **modal** overlay.
//  - variant "page": renders an inline "ລໍຖ້າຊຳລະ + ຊຳລະເງິນ" card; the Pay
//    button opens the QR modal. Closing / expiry returns to the card.
//  - variant "modal" (checkout): opens straight into the QR modal; closing or
//    expiry calls onClose / onExpire (the checkout navigates to the order page).
export default function OnepayQr({
  orderNo,
  amount,
  initialQr = null,
  initialStatus = "generated",
  tracked = true,
  variant = "page",
  onExpire,
  onClose,
  onPaid,
}: {
  orderNo: string;
  amount: number;
  initialQr?: QrData | null;
  initialStatus?: string;
  tracked?: boolean;
  variant?: "modal" | "page";
  onExpire?: () => void;
  onClose?: () => void;
  onPaid?: () => void;
}) {
  const [qr, setQr] = useState<QrData | null>(initialQr);
  const [open, setOpen] = useState(variant === "modal");
  const [status, setStatus] = useState(initialQr?.status ?? initialStatus);
  const [displayAmount, setDisplayAmount] = useState(initialQr?.amount ?? amount);
  const [now, setNow] = useState(() => Date.now());
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clientQr, setClientQr] = useState<string | null>(null);
  const [clientQrString, setClientQrString] = useState<string | null>(null);
  const [mobile] = useState(() => isMobile());
  const triesRef = useRef(0);
  const paidFiredRef = useRef(false);

  const paid = status === "paid";
  const submitted = status === "submitted";
  const expiresAt = qr?.expiresAt ?? null;
  const remainingMs = expiresAt ? Date.parse(expiresAt) - now : null;
  const expired = remainingMs !== null && remainingMs <= 0;
  const mmss = (() => {
    const s = Math.max(0, Math.ceil((remainingMs ?? 0) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  })();

  const generate = useCallback(async () => {
    setBusy(true);
    try {
      const res = await regenerateOrderQr(orderNo);
      if (res.ok) {
        setQr({
          qrDataUrl: res.qrDataUrl,
          qrString: res.qrString,
          amount: res.amount,
          expiresAt: res.expiresAt,
          status: res.status,
        });
        setDisplayAmount(res.amount);
        setStatus(res.status);
        setNow(Date.now());
        triesRef.current = 0;
      }
    } finally {
      setBusy(false);
    }
  }, [orderNo]);

  function openPay() {
    setOpen(true);
    if (!qr || (qr.expiresAt && Date.parse(qr.expiresAt) <= Date.now())) generate();
  }

  // When opened straight as a modal with no QR yet (e.g. the account "ຊຳລະເງິນ"
  // button), generate one. Guarded so a failed attempt doesn't loop.
  const autoGenRef = useRef(false);
  useEffect(() => {
    if (open && !qr && variant === "modal" && !autoGenRef.current) {
      autoGenRef.current = true;
      generate();
    }
  }, [open, qr, variant, generate]);

  function close() {
    if (variant === "modal") onClose?.();
    else setOpen(false);
  }

  // Fire onPaid once when the order becomes paid (any confirmation path).
  useEffect(() => {
    if (paid && !paidFiredRef.current) {
      paidFiredRef.current = true;
      onPaid?.();
    }
  }, [paid, onPaid]);

  async function check() {
    setChecking(true);
    try {
      const res = await checkOrderPayment(orderNo);
      setStatus(res.status);
    } finally {
      setChecking(false);
    }
  }

  // 1-second clock while the modal is open; on expiry close (page) / leave (modal).
  useEffect(() => {
    if (!open || paid || submitted || !qr) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (expiresAt && Date.parse(expiresAt) <= t) {
        clearInterval(id);
        if (variant === "modal") onExpire?.();
        else setOpen(false);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [open, paid, submitted, qr, expiresAt, variant, onExpire]);

  // Poll BCEL payment status while the modal is live. Callback remains the
  // fastest path, but polling ensures the order still updates if callback
  // delivery/proxying is delayed or unavailable.
  useEffect(() => {
    if (!open || !tracked || paid || submitted || !qr || expired) return;
    const id = setInterval(async () => {
      if (triesRef.current >= 90) {
        clearInterval(id);
        return;
      }
      triesRef.current += 1;
      const res = await checkOrderPayment(orderNo);
      setStatus(res.status);
      if (res.paid) clearInterval(id);
    }, 2000);
    return () => clearInterval(id);
  }, [orderNo, open, tracked, paid, submitted, qr, expired]);

  // BCEL One realtime via onepay.js + PubNub: build the official QR (it carries
  // the transactionid the PubNub channel is keyed on) and subscribe — the moment
  // the customer pays, BCEL pushes to the browser and we mark the order paid.
  // Works from localhost (no inbound webhook needed).
  useEffect(() => {
    // Local mode only. When the API is on, the server QR (genonepayqr) is already
    // registered with BCEL under uuid = order_no, and polling confirms it — so we
    // don't build a client QR or subscribe PubNub.
    if (!open || paid || submitted || !qr || expired || !ONEPAY_MCID || tracked) return;
    let pn: PubNubClient | null = null;
    let cancelled = false;
    let confirmedLocal = false;

    const markPaid = async (why: string, msg?: unknown) => {
      if (confirmedLocal || cancelled) return;
      confirmedLocal = true;
      // Pull the bank transfer reference out of the BCEL push (field names vary).
      let info: { ticket?: string; fccRef?: string; payerName?: string } | undefined;
      try {
        const o = (typeof msg === "string" ? JSON.parse(msg) : msg) as Record<string, string> | null;
        if (o) {
          info = {
            ticket: o.TICKET ?? o.ticket,
            fccRef: o.FCCREF ?? o.fccRef ?? o.reference ?? o.REFERENCE ?? o.refNo,
            payerName: o.NAME ?? o.name ?? o.payerName ?? o.FROMNAME,
          };
        }
      } catch {
        /* ignore */
      }
      console.log("[onepay] payment matched →", why, info);
      await confirmOrderPaid(orderNo, info);
      setStatus("paid");
    };

    (async () => {
      try {
        await loadOnepayLib();
        if (cancelled || !window.OnePay || !window.PubNub) {
          console.warn("[onepay] lib not loaded", { OnePay: !!window.OnePay, PubNub: !!window.PubNub });
          return;
        }
        // Build the official BCEL QR (carries transactionid for the txn channel).
        const op = new window.OnePay(ONEPAY_MCID);
        op.getCode(
          {
            amount: displayAmount,
            invoiceid: orderNo,
            transactionid: orderNo,
            // ASCII only — BCEL's crc16 throws on chars > 255 (no Lao text here).
            description: `Order ${orderNo}`,
            expiretime: 3,
          },
          async (qrStr) => {
            if (cancelled) return;
            if (!cancelled) setClientQrString(qrStr);
            const QR = (await import("qrcode")).default;
            const url = await QR.toDataURL(qrStr, { width: 280, margin: 1 });
            if (!cancelled) setClientQr(url);
          },
        );

        // Subscribe to BOTH the order-specific channel AND the shop-wide channel
        // (we don't know which one BCEL publishes to for a given setup).
        const txnChannel = `uuid-${ONEPAY_MCID}-${orderNo}`;
        const shopChannel = ONEPAY_SHOPCODE ? `mcid-${ONEPAY_MCID}-${ONEPAY_SHOPCODE}` : "";
        pn = new window.PubNub({ subscribeKey: PUBNUB_SUBKEY, ssl: true });
        pn.addListener({
          message: (m) => {
            console.log("[onepay] pubnub message", m.channel, m.message);
            // Order-specific channel → always ours.
            if (m.channel === txnChannel) return void markPaid("txn channel", m.message);
            // Shop-wide channel → only ours if the message references this order.
            const ref = typeof m.message === "string" ? m.message : JSON.stringify(m.message ?? "");
            if (ref.includes(orderNo)) void markPaid("shop channel + ref", m.message);
          },
        });
        pn.subscribe({ channels: [txnChannel, ...(shopChannel ? [shopChannel] : [])] });
        console.log("[onepay] subscribed channels", [txnChannel, shopChannel].filter(Boolean));
      } catch (e) {
        console.error("onepay realtime init failed:", e);
      }
    })();

    return () => {
      cancelled = true;
      try {
        pn?.unsubscribeAll();
      } catch {
        /* ignore */
      }
      setClientQr(null);
      setClientQrString(null);
    };
  }, [open, paid, submitted, qr, expired, orderNo, displayAmount, tracked]);

  // ---- inline trigger card (page variant only) --------------------------
  const inline =
    variant === "page" ? (
      paid ? (
        <PaidCard amount={displayAmount} orderNo={orderNo} />
      ) : submitted ? (
        <SubmittedCard orderNo={orderNo} />
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm shadow-sm">
          <h2 className="font-semibold text-amber-800">ລໍຖ້າຊຳລະເງິນ</h2>
          <p className="mt-0.5 text-xs text-amber-700">
            ຍອດທີ່ຕ້ອງຊຳລະ <span className="font-bold">{formatKip(displayAmount)}</span> · ອໍເດີ {orderNo}
          </p>
          <button
            type="button"
            onClick={openPay}
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? "ກຳລັງສ້າງ QR..." : "ຊຳລະເງິນ"}
          </button>
        </div>
      )
    ) : null;

  // ---- modal overlay ----------------------------------------------------
  const modal = open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="ປິດ" onClick={close} className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm">
        {paid ? (
          <PaidCard amount={displayAmount} orderNo={orderNo} />
        ) : submitted ? (
          <SubmittedCard orderNo={orderNo} />
        ) : (
          <div className="rounded-2xl border border-brand/30 bg-white p-5 text-sm shadow-xl">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold text-gray-800">
                <span className="rounded bg-brand-light px-2 py-0.5 text-xs font-bold text-brand-dark">BCEL One</span>
                ສະແກນ QR ເພື່ອຊຳລະເງິນ
              </h2>
              {expiresAt && !expired && (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                    (remainingMs ?? 0) <= 30_000 ? "bg-rose-100 text-rose-600" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {mmss}
                </span>
              )}
            </div>
            <p className="mb-3 text-xs text-gray-500">
              {mobile
                ? "ກົດປຸ່ມດ້ານລຸ່ມເພື່ອເປີດ BCEL One ແລະຊຳລະໄດ້ທັນທີ."
                : <>ສະແກນດ້ວຍແອັບ <span className="font-medium">BCEL One</span> — ຍອດເງິນຖືກກຳນົດໃຫ້ອັດຕະໂນມັດ.</>
              }
              {expiresAt && " QR ໝົດອາຍຸໃນ 3 ນາທີ."}
            </p>

            {(() => {
              const activeQrString = clientQrString ?? qr?.qrString ?? null;
              const activeQrImg = clientQr ?? qr?.qrDataUrl ?? null;
              return (
                <div className="flex flex-col items-center gap-2">
                  {mobile && activeQrString ? (
                    // Mobile: JS deep-link button (bcelone://) → app store fallback after 2s
                    <>
                      <button
                        type="button"
                        onClick={() => openBcelOne(activeQrString)}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#003893] py-5 text-white shadow-lg active:opacity-80"
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white">
                          <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none">
                            <rect width="40" height="40" rx="8" fill="#003893" />
                            <text x="20" y="27" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">B</text>
                          </svg>
                        </span>
                        <div className="text-left">
                          <div className="text-sm font-black">ເປີດ BCEL One</div>
                          <div className="text-[11px] text-blue-200">ກົດເພື່ອຊຳລະ {formatKip(displayAmount)}</div>
                        </div>
                      </button>
                      {/* QR image below so customer can also scan from another device */}
                      {activeQrImg && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={activeQrImg}
                          alt={`QR ຊຳລະເງິນ ${orderNo}`}
                          className="h-44 w-44 rounded-xl border border-gray-100 bg-white object-contain p-2 opacity-80"
                        />
                      )}
                    </>
                  ) : activeQrImg ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={activeQrImg}
                      alt={`QR ຊຳລະເງິນ ${orderNo}`}
                      className="h-60 w-60 rounded-xl border border-gray-100 bg-white object-contain p-2"
                    />
                  ) : (
                    <div className="grid h-60 w-60 place-items-center rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400">
                      {busy ? "ກຳລັງສ້າງ QR..." : "..."}
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-xs text-gray-400">ຍອດທີ່ຕ້ອງຊຳລະ</div>
                    <div className="text-xl font-extrabold text-price">{formatKip(displayAmount)}</div>
                    {displayAmount !== amount && (
                      <div className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        TEST · ຍອດອໍເດີຈິງ {formatKip(amount)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {tracked ? (
              <>
                <div className="mt-4 flex items-center justify-center">
                  <span className={`inline-flex items-center gap-1.5 text-xs ${status === "scanned" ? "text-amber-600" : "text-gray-400"}`}>
                    <span className={`h-2 w-2 animate-pulse rounded-full ${status === "scanned" ? "bg-amber-500" : "bg-gray-300"}`} />
                    {status === "scanned" ? "ກຳລັງລໍຖ້າຢືນຢັນການຊຳລະ..." : "ລໍຖ້າການຊຳລະ..."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={check}
                  disabled={checking}
                  className="mt-3 w-full rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-brand hover:text-brand-dark disabled:opacity-60"
                >
                  {checking ? "ກຳລັງກວດສອບ..." : "ກວດສອບການຊຳລະ"}
                </button>
              </>
            ) : (
              <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-center text-xs text-gray-500">
                ລໍຖ້າການຢືນຢັນຈາກ BCEL. ສະຖານະຈະປ່ຽນອັດຕະໂນມັດເມື່ອທະນາຄານຕອບກັບ.
              </p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={close}
          className="mt-3 w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:text-brand-dark"
        >
          {variant === "modal" ? "ໄປໜ້າຄຳສັ່ງຊື້" : "ປິດ"}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {inline}
      {modal}
    </>
  );
}

function SubmittedCard({ orderNo }: { orderNo: string }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-center text-sm shadow-sm">
      <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-blue-100 text-2xl text-blue-600">
        ✓
      </div>
      <h2 className="font-semibold text-blue-800">ແຈ້ງການໂອນແລ້ວ</h2>
      <p className="mt-1 text-xs leading-5 text-blue-700">
        ພະນັກງານກຳລັງກວດຍອດຂອງອໍເດີ {orderNo}. ສະຖານະຈະປ່ຽນຫຼັງກວດສອບສຳເລັດ.
      </p>
    </div>
  );
}

function PaidCard({ amount, orderNo }: { amount: number; orderNo: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-sm shadow-sm">
      <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
        ✓
      </div>
      <h2 className="font-semibold text-emerald-800">ໄດ້ຮັບການຊຳລະເງິນແລ້ວ</h2>
      <p className="mt-1 text-xs text-emerald-700">
        ຂອບໃຈ! ພວກເຮົາໄດ້ຮັບການໂອນ {formatKip(amount)} ສຳລັບອໍເດີ {orderNo}.
      </p>
    </div>
  );
}
