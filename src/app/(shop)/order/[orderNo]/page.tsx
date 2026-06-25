import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByNo } from "@/lib/orders";
import { getSession } from "@/lib/auth";
import { getReviewedCodes } from "@/lib/reviews";
import { getBankTransfer, bankConfigured } from "@/lib/settings";
import { onepayEnabled, onepayMerchantConfigured } from "@/lib/onepay";
import { getOrderPayment } from "@/lib/onepay-store";
import { formatKip } from "@/lib/format";
import { PAYMENT_LABEL, type PaymentMethod } from "@/lib/payment-constants";
import { SHIPPING_LABEL, type ShippingMethod } from "@/lib/shipping-constants";
import OrderTimeline from "@/components/OrderTimeline";
import ReturnRequestButton from "@/components/ReturnRequestButton";
import ReorderButton from "@/components/ReorderButton";
import CancelOrderButton from "@/components/CancelOrderButton";
import OrderReviewPrompt from "@/components/OrderReviewPrompt";
import StatusBadge from "@/components/StatusBadge";
import OnepayQr from "./OnepayQr";

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  const order = await getOrderByNo(decodeURIComponent(orderNo));
  if (!order) notFound();

  const session = await getSession();
  const isOwner = !!session && !!order.customerCode && session.code === order.customerCode;

  // Post-delivery "rate your purchase": which items has the buyer already reviewed?
  const reviewedCodes =
    order.status === "completed" && session
      ? await getReviewedCodes(session.code, order.items.map((i) => i.productCode))
      : new Set<string>();

  const grandTotal = Math.max(0, order.subtotal + order.shippingFee - order.discount);

  // A transfer order awaiting payment (status `pending`) shows the BCEL OnePay
  // pay section. If we don't even know the merchant, fall back to the static bank
  // block. Once the order has progressed past `pending`, no pay UI is shown.
  const awaitingPayment = order.paymentMethod === "transfer" && order.status === "pending";
  const showOnepay = awaitingPayment && onepayMerchantConfigured();
  // Transfer reference (BCEL FCC ref / ticket) once paid — shown on the receipt.
  const payment = order.paymentMethod === "transfer" ? await getOrderPayment(order.orderNo) : null;
  const payRef = payment?.fccRef || payment?.ticket || null;
  const bank = awaitingPayment && !showOnepay ? await getBankTransfer() : null;
  const cancelled = order.status === "cancelled";

  const isCod = order.paymentMethod === "cod";
  const hero = cancelled
    ? { icon: "✕", tone: "rose", title: "ຄຳສັ່ງຊື້ຖືກຍົກເລີກ", sub: "ກະລຸນາຕິດຕໍ່ຮ້ານ ຖ້າທ່ານໄດ້ຊຳລະເງິນແລ້ວ" }
    : awaitingPayment
      ? { icon: "₭", tone: "amber", title: "ກະລຸນາຊຳລະເງິນ", sub: "ສະແກນ QR ດ້ວຍ BCEL One — ສະຖານະຈະປ່ຽນເອງເມື່ອຊຳລະສຳເລັດ" }
      : isCod
        ? { icon: "✓", tone: "emerald", title: "ສັ່ງຊື້ສຳເລັດແລ້ວ!", sub: `ຊຳລະເງິນສົດ ${formatKip(grandTotal)} ເມື່ອຮັບສິນຄ້າ (COD)` }
        : { icon: "✓", tone: "emerald", title: "ສັ່ງຊື້ສຳເລັດແລ້ວ!", sub: "ຂອບໃຈສຳລັບການສັ່ງຊື້ — ພວກເຮົາກຳລັງດຳເນີນການ" };

  const TONE: Record<string, { card: string; chip: string }> = {
    rose: { card: "border-rose-100", chip: "bg-rose-100 text-rose-600" },
    amber: { card: "border-amber-100", chip: "bg-amber-100 text-amber-600" },
    emerald: { card: "border-emerald-100", chip: "bg-emerald-100 text-emerald-600" },
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* ── Hero ── */}
      <div className={`rounded-sm border bg-white p-6 text-center shadow-sm ${TONE[hero.tone].card}`}>
        <div className={`mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full text-2xl font-bold ${TONE[hero.tone].chip}`}>
          {hero.icon}
        </div>
        <h1 className="text-lg font-bold text-gray-900 sm:text-xl">{hero.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{hero.sub}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm">
            <span className="text-gray-400">ເລກທີ່: </span>
            <span className="font-bold text-brand-dark">{order.orderNo}</span>
          </span>
          <StatusBadge status={order.status} />
        </div>
        <div className="mt-3 text-2xl font-extrabold text-orange-600">{formatKip(grandTotal)}</div>
      </div>

      {/* ── Payment CTA (prominent while awaiting payment) ── */}
      {showOnepay && (
        <div className="mt-5">
          <OnepayQr
            orderNo={order.orderNo}
            amount={grandTotal}
            variant="page"
            tracked={onepayEnabled()}
          />
        </div>
      )}

      {bank && bankConfigured(bank) && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm shadow-sm">
          <h2 className="mb-1 font-semibold text-amber-800">ສະແກນ QR ເພື່ອໂອນເງິນ</h2>
          <p className="mb-3 text-xs text-amber-700">
            ກະລຸນາໂອນ <span className="font-bold">{formatKip(grandTotal)}</span> ແລ້ວສົ່ງສະລິບໃຫ້ພວກເຮົາ
            ພ້ອມບອກເລກອໍເດີ <span className="font-bold">{order.orderNo}</span>.
          </p>
          {bank.qrUrl && (
            <div className="mb-3 flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bank.qrUrl}
                alt="QR ໂອນເງິນ"
                className="h-56 w-56 rounded-lg border border-amber-200 bg-white object-contain p-2"
              />
              <span className="text-xs text-amber-700">ສະແກນດ້ວຍແອັບ BCEL One</span>
            </div>
          )}
          {(bank.bankName || bank.accountNo) && (
            <dl className="space-y-1.5 text-gray-700">
              {bank.bankName && <Row k="ທະນາຄານ" v={bank.bankName} />}
              {bank.accountName && <Row k="ຊື່ບັນຊີ" v={bank.accountName} />}
              {bank.accountNo && <Row k="ເລກບັນຊີ" v={bank.accountNo} />}
              {bank.note && <Row k="ໝາຍເຫດ" v={bank.note} />}
            </dl>
          )}
        </div>
      )}

      {/* ── Step tracker ── */}
      {!cancelled && (
        <div className="mt-5 rounded-sm border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">ຂັ້ນຕອນຄຳສັ່ງຊື້</h2>
          <OrderTimeline status={order.status} paymentMethod={order.paymentMethod} />
        </div>
      )}

      {["paid", "shipping", "completed"].includes(order.status) && (
        <div className="mt-5">
          <ReturnRequestButton orderNo={order.orderNo} />
        </div>
      )}

      {order.status === "completed" && isOwner && (
        <OrderReviewPrompt
          loggedIn={!!session}
          items={order.items.map((it) => ({
            productCode: it.productCode,
            productName: it.productName,
            reviewed: reviewedCodes.has(it.productCode),
          }))}
        />
      )}

      {/* ── Items ── */}
      <div className="mt-5 rounded-sm border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">ລາຍການສິນຄ້າ</h2>
        <div className="divide-y divide-gray-100">
          {order.items.map((it) => (
            <div key={it.productCode} className="flex justify-between gap-2 py-2 text-sm">
              <span className="text-gray-600">
                {it.productName}{" "}
                <span className="text-gray-400">
                  ×{it.qty}
                  {it.unit ? ` ${it.unit}` : ""}
                </span>
              </span>
              <span className="shrink-0 font-medium text-gray-700">{formatKip(it.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-sm">
          <div className="flex items-baseline justify-between text-gray-600">
            <span>ລາຄາສິນຄ້າ</span>
            <span>{formatKip(order.subtotal)}</span>
          </div>
          <div className="flex items-baseline justify-between text-gray-600">
            <span>ຄ່າຂົນສົ່ງ</span>
            <span className={order.shippingFee === 0 ? "font-semibold text-emerald-600" : ""}>
              {order.shippingFee === 0 ? "ຟຣີ" : formatKip(order.shippingFee)}
            </span>
          </div>
          {order.discount > 0 && (
            <div className="flex items-baseline justify-between text-violet-600">
              <span>ສ່ວນຫຼຸດ</span>
              <span className="font-semibold">−{formatKip(order.discount)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-gray-100 pt-2">
            <span className="font-semibold text-gray-800">ລວມທັງໝົດ</span>
            <span className="text-xl font-extrabold text-orange-600">{formatKip(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* ── Delivery info ── */}
      <div className="mt-5 rounded-sm border border-gray-100 bg-white p-5 text-sm shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">ຂໍ້ມູນຈັດສົ່ງ</h2>
        <dl className="space-y-1.5 text-gray-600">
          <Row k="ຊື່" v={order.customerName} />
          <Row k="ເບີໂທ" v={order.phone} />
          {order.address && <Row k="ທີ່ຢູ່" v={order.address} />}
          <Row k="ຈັດສົ່ງ" v={SHIPPING_LABEL[order.shippingMethod as ShippingMethod] ?? order.shippingMethod} />
          <Row k="ການຊຳລະ" v={PAYMENT_LABEL[order.paymentMethod as PaymentMethod] ?? order.paymentMethod} />
          {payRef && <Row k="ເລກໃບໂອນ" v={payRef} />}
          {payment?.payerName && <Row k="ຜູ້ໂອນ" v={payment.payerName} />}
          {order.note && <Row k="ໝາຍເຫດ" v={order.note} />}
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {["completed", "cancelled"].includes(order.status) && (
          <ReorderButton orderNo={order.orderNo} variant="full" />
        )}
        {isOwner && order.status === "cod" && (
          <CancelOrderButton orderNo={order.orderNo} variant="full" />
        )}
        <Link
          href={`/order/${encodeURIComponent(order.orderNo)}/print`}
          target="_blank"
          className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-brand hover:text-brand-dark"
        >
          ພິມໃບບິນ
        </Link>
        <Link href="/account" className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-gray-600 transition hover:border-brand hover:text-brand-dark">
          ຄຳສັ່ງຊື້ຂອງຂ້ອຍ
        </Link>
        <Link href="/products" className="rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2.5 text-sm font-semibold text-white">
          ຊ໊ອບປິ້ງຕໍ່
        </Link>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-gray-400">{k}</dt>
      <dd className="flex-1">{v}</dd>
    </div>
  );
}
