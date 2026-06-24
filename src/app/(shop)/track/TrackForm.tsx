"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { formatKip } from "@/lib/format";
import { PAYMENT_LABEL, type PaymentMethod } from "@/lib/payment-constants";
import { SHIPPING_LABEL, type ShippingMethod } from "@/lib/shipping-constants";
import OrderTrackSteps from "@/components/OrderTrackSteps";
import { trackOrder, type TrackedOrder } from "./actions";

const STATUS_COPY: Record<string, { title: string; description: string; tone: string }> = {
  pending: {
    title: "ລໍຖ້າການຊຳລະເງິນ",
    description: "ກະລຸນາຊຳລະເງິນເພື່ອໃຫ້ຮ້ານເລີ່ມດຳເນີນການ",
    tone: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  cod: {
    title: "ຮ້ານໄດ້ຮັບອໍເດີແລ້ວ",
    description: "ອໍເດີ COD ກຳລັງລໍຖ້າການກະກຽມສິນຄ້າ",
    tone: "bg-blue-50 text-blue-700 ring-blue-100",
  },
  awaiting_confirmation: {
    title: "ຊຳລະເງິນແລ້ວ",
    description: "ຮ້ານກຳລັງກວດສອບ ແລະຢືນຢັນຄຳສັ່ງຊື້",
    tone: "bg-blue-50 text-blue-700 ring-blue-100",
  },
  paid: {
    title: "ກຳລັງກະກຽມສິນຄ້າ",
    description: "ສິນຄ້າຂອງທ່ານກຳລັງຖືກຈັດກຽມເພື່ອສົ່ງ",
    tone: "bg-violet-50 text-violet-700 ring-violet-100",
  },
  shipping: {
    title: "ພັດສະດຸກຳລັງເດີນທາງ",
    description: "ກະລຸນາກຽມຮັບສິນຄ້າ ແລະເປີດໂທລະສັບໄວ້",
    tone: "bg-orange-50 text-orange-700 ring-orange-100",
  },
  completed: {
    title: "ຈັດສົ່ງສຳເລັດ",
    description: "ສິນຄ້າໄດ້ສົ່ງເຖິງປາຍທາງແລ້ວ ຂອບໃຈທີ່ໄວ້ວາງໃຈ",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  cancelled: {
    title: "ຄຳສັ່ງຊື້ຖືກຍົກເລີກ",
    description: "ອໍເດີນີ້ຈະບໍ່ຖືກດຳເນີນການຕໍ່",
    tone: "bg-rose-50 text-rose-700 ring-rose-100",
  },
};

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "ຍັງບໍ່ລະບຸ";
  return new Intl.DateTimeFormat("lo-LA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function Icon({
  path,
  className = "h-5 w-5",
}: {
  path: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function TrackForm({ initialOrderNo = "" }: { initialOrderNo?: string }) {
  const [q, setQ] = useState(initialOrderNo);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const [selectedNo, setSelectedNo] = useState<string | null>(null);

  const selected = useMemo(
    () => orders?.find((order) => order.orderNo === selectedNo) ?? orders?.[0] ?? null,
    [orders, selectedNo],
  );

  function runSearch(value: string) {
    const query = value.trim();
    if (!query) {
      setError("ກະລຸນາໃສ່ເລກອໍເດີ ຫຼື ເບີໂທ");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await trackOrder(query);
      if (res.ok) {
        setOrders(res.orders);
        setSelectedNo(res.orders[0]?.orderNo ?? null);
      } else {
        setOrders(null);
        setSelectedNo(null);
        setError(res.error);
      }
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(q);
  }

  return (
    <div className="-mx-4 -mt-6 bg-slate-50 sm:-mx-6 lg:-mx-8">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#111827] via-[#172033] to-[#111827] px-4 py-10 text-white sm:px-6 sm:py-14 lg:px-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold tracking-wider text-orange-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,.8)]" />
            ODIENMALL DELIVERY
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">ຕິດຕາມການສັ່ງຊື້</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-300">
            ກວດສອບສະຖານະອໍເດີ ແລະການຈັດສົ່ງແບບລຽວໄທມ໌
          </p>

          <form onSubmit={submit} className="mx-auto mt-7 max-w-3xl">
            <div className="flex flex-col rounded-2xl bg-white p-2 shadow-2xl shadow-black/25 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">ເລກອໍເດີ ຫຼື ເບີໂທ</span>
                <Icon path="M21 21l-4.4-4.4M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ໃສ່ເລກອໍເດີ (CAE...) ຫຼື ເບີໂທ"
                  className="h-12 w-full rounded-xl bg-white pl-12 pr-4 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  autoFocus={!initialOrderNo}
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="mt-2 flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-7 text-sm font-black text-white shadow-lg shadow-orange-200/20 transition hover:from-orange-600 hover:to-orange-700 disabled:cursor-wait disabled:opacity-60 sm:mt-0"
              >
                {pending ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Icon path="M5 12h14M13 6l6 6-6 6" />
                )}
                {pending ? "ກຳລັງຄົ້ນຫາ..." : "ຕິດຕາມ"}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-400">ບໍ່ຕ້ອງເຂົ້າລະບົບ · ຄົ້ນຫາໄດ້ດ້ວຍເລກອໍເດີ ຫຼື ເບີໂທ</p>
          </form>
        </div>
      </section>

      <main className="mx-auto min-h-[480px] max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {error && (
          <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-500">
              <Icon path="M12 9v4M12 17h.01M10.3 3.7L2.5 17.2A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0z" />
            </span>
            <div>
              <div className="font-bold text-slate-900">ບໍ່ພົບຂໍ້ມູນ</div>
              <p className="mt-0.5 text-sm text-slate-500">{error}</p>
            </div>
          </div>
        )}

        {!orders && !error && !pending && <TrackingIntro />}

        {orders && selected && (
          <div className={`grid items-start gap-5 ${orders.length > 1 ? "lg:grid-cols-[300px_minmax(0,1fr)]" : ""}`}>
            {orders.length > 1 && (
              <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-28">
                <div className="border-b border-slate-100 px-4 py-4">
                  <h2 className="font-black text-slate-900">ຄຳສັ່ງຊື້ຂອງທ່ານ</h2>
                  <p className="mt-0.5 text-xs text-slate-400">ພົບ {orders.length} ລາຍການ</p>
                </div>
                <div className="thin-scroll max-h-[520px] overflow-y-auto p-2">
                  {orders.map((order) => {
                    const active = order.orderNo === selected.orderNo;
                    return (
                      <button
                        key={order.orderNo}
                        type="button"
                        onClick={() => setSelectedNo(order.orderNo)}
                        className={`mb-1 w-full rounded-xl border p-3 text-left transition ${
                          active
                            ? "border-orange-200 bg-orange-50 shadow-sm"
                            : "border-transparent hover:border-slate-100 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`truncate text-xs font-black ${active ? "text-orange-700" : "text-slate-700"}`}>{order.orderNo}</span>
                          <span className="shrink-0 text-[10px] text-slate-400">{formatDate(order.createdAt)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-slate-500">{order.statusLabel}</span>
                          <span className="shrink-0 text-xs font-black text-slate-800">{formatKip(order.total)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>
            )}

            <OrderDetail order={selected} />
          </div>
        )}
      </main>
    </div>
  );
}

function OrderDetail({ order }: { order: TrackedOrder }) {
  const copy = STATUS_COPY[order.status] ?? STATUS_COPY.paid;
  const paymentLabel = PAYMENT_LABEL[order.paymentMethod as PaymentMethod] ?? order.paymentMethod;
  const shippingLabel = SHIPPING_LABEL[order.shippingMethod as ShippingMethod] ?? order.shippingMethod;

  return (
    <div className="min-w-0 space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">ອໍເດີ {order.orderNo}</h2>
              <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ring-inset ${copy.tone}`}>{order.statusLabel}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">ສັ່ງຊື້ເມື່ອ {formatDate(order.createdAt, true)}</p>
          </div>
          <Link
            href={`/order/${encodeURIComponent(order.orderNo)}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs font-bold text-orange-700 transition hover:bg-orange-100"
          >
            ເບິ່ງລາຍລະອຽດອໍເດີ
            <Icon path="M9 18l6-6-6-6" className="h-4 w-4" />
          </Link>
        </div>

        <div className="bg-gradient-to-r from-orange-50 via-white to-white px-5 py-5">
          <div className="flex items-start gap-4">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ring-4 ${copy.tone}`}>
              <Icon
                path={
                  order.status === "completed"
                    ? "M20 6L9 17l-5-5"
                    : order.status === "cancelled"
                      ? "M6 6l12 12M18 6L6 18"
                      : "M3 7h11v10H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
                }
                className="h-6 w-6"
              />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">{copy.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{copy.description}</p>
              {order.shipment?.dateLogistic && order.status !== "completed" && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-100">
                  <Icon path="M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1z" className="h-4 w-4 text-orange-500" />
                  ຄາດວ່າຈະສົ່ງ: {formatDate(order.shipment.dateLogistic)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-8">
          <OrderTrackSteps status={order.status} paymentMethod={order.paymentMethod} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900">ປະຫວັດການຈັດສົ່ງ</h3>
              <p className="mt-0.5 text-xs text-slate-400">ຂໍ້ມູນອັບເດດຈາກລະບົບຂົນສົ່ງ</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              LIVE
            </span>
          </div>
          <ShipmentHistory order={order} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-black text-slate-900">ຂໍ້ມູນການຈັດສົ່ງ</h3>
          <div className="mt-4 space-y-4">
            <InfoRow icon="M3 7h11v10H3zM14 10h4l3 3v4h-7z" label="ບໍລິການຂົນສົ່ງ" value={shippingLabel} />
            <InfoRow icon="M4 4h16v16H4zM8 2v4M16 2v4M4 9h16" label="ກຳນົດສົ່ງ" value={formatDate(order.shipment?.dateLogistic)} />
            <InfoRow icon="M3 13h18M5 13l2-5h10l2 5M7 17h.01M17 17h.01" label="ລົດຂົນສົ່ງ" value={order.shipment?.car || "ຈະແຈ້ງເມື່ອຈັດລົດ"} />
            <InfoRow icon="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" label="ການຊຳລະ" value={paymentLabel} />
          </div>
          {order.shipment?.deliveryCondition && (
            <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              <span className="font-bold text-slate-700">ໝາຍເຫດການສົ່ງ: </span>
              {order.shipment.deliveryCondition}
            </div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-black text-slate-900">ສິນຄ້າໃນພັດສະດຸ</h3>
            <p className="mt-0.5 text-xs text-slate-400">{order.items.length} ລາຍການ</p>
          </div>
          <span className="text-sm font-black text-orange-600">{formatKip(order.total)}</span>
        </div>
        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div key={item.code} className="flex items-center gap-4 px-5 py-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-slate-100 bg-slate-50 text-slate-300">
                <Icon path="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10" className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/product/${encodeURIComponent(item.code)}`} className="line-clamp-2 text-sm font-bold leading-5 text-slate-800 hover:text-orange-600">
                  {item.name}
                </Link>
                <p className="mt-1 text-xs text-slate-400">
                  {item.code} · ຈຳນວນ {item.qty}{item.unit ? ` ${item.unit}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-black text-slate-800">{formatKip(item.lineTotal)}</div>
                {item.unitPrice != null && <div className="mt-0.5 text-[11px] text-slate-400">{formatKip(item.unitPrice)} / ໜ່ວຍ</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="ml-auto max-w-sm space-y-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-sm">
          <SummaryRow label="ລາຄາສິນຄ້າ" value={formatKip(order.subtotal)} />
          <SummaryRow label="ຄ່າຂົນສົ່ງ" value={order.shippingFee === 0 ? "ຟຣີ" : formatKip(order.shippingFee)} free={order.shippingFee === 0} />
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-bold text-slate-800">ລວມທັງໝົດ</span>
            <span className="text-lg font-black text-orange-600">{formatKip(order.total)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function ShipmentHistory({ order }: { order: TrackedOrder }) {
  const events = [
    order.shipment?.sentEnd && {
      title: "ຈັດສົ່ງສຳເລັດ",
      detail: order.shipment.deliveryCondition || "ພັດສະດຸຖືກສົ່ງເຖິງປາຍທາງແລ້ວ",
      date: order.shipment.sentEnd,
    },
    order.shipment?.sentStart && {
      title: "ພັດສະດຸອອກຈາກສາງ",
      detail: order.shipment.car ? `ກຳລັງຈັດສົ່ງໂດຍລົດ ${order.shipment.car}` : "ພະນັກງານກຳລັງນຳສົ່ງພັດສະດຸ",
      date: order.shipment.sentStart,
    },
    ["paid", "shipping", "completed"].includes(order.status) && {
      title: "ກະກຽມສິນຄ້າແລ້ວ",
      detail: "ຮ້ານໄດ້ກວດສອບ ແລະກະກຽມສິນຄ້າສຳລັບຈັດສົ່ງ",
      date: null,
    },
    {
      title: "ຮ້ານໄດ້ຮັບຄຳສັ່ງຊື້",
      detail: `ສ້າງອໍເດີ ${order.orderNo} ສຳເລັດ`,
      date: order.createdAt,
    },
  ].filter(Boolean) as { title: string; detail: string; date: string | null }[];

  return (
    <ol>
      {events.map((event, index) => (
        <li key={`${event.title}-${index}`} className="relative flex gap-3 pb-6 last:pb-0">
          {index < events.length - 1 && <span className="absolute left-[7px] top-4 h-[calc(100%-4px)] w-px bg-slate-200" />}
          <span className={`relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-white ${index === 0 ? "bg-orange-500 ring-2 ring-orange-100" : "bg-slate-300"}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col justify-between gap-1 sm:flex-row">
              <span className={`text-sm font-bold ${index === 0 ? "text-orange-600" : "text-slate-700"}`}>{event.title}</span>
              <span className="shrink-0 text-[11px] text-slate-400">{event.date ? formatDate(event.date, true) : ""}</span>
            </div>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">{event.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500">
        <Icon path={icon} className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-slate-400">{label}</div>
        <div className="mt-0.5 break-words text-sm font-bold text-slate-700">{value}</div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, free = false }: { label: string; value: string; free?: boolean }) {
  return (
    <div className="flex items-center justify-between text-slate-500">
      <span>{label}</span>
      <span className={free ? "font-bold text-emerald-600" : "font-medium text-slate-700"}>{value}</span>
    </div>
  );
}

function TrackingIntro() {
  const features = [
    { icon: "M20 6L9 17l-5-5", title: "ສະຖານະແບບລຽວໄທມ໌", text: "ເບິ່ງທຸກຂັ້ນຕອນຕັ້ງແຕ່ຮັບອໍເດີຈົນສົ່ງສຳເລັດ" },
    { icon: "M3 7h11v10H3zM14 10h4l3 3v4h-7z", title: "ຂໍ້ມູນຈັດສົ່ງ", text: "ກຳນົດສົ່ງ, ລົດຂົນສົ່ງ ແລະປະຫວັດການເດີນທາງ" },
    { icon: "M4 4h16v16H4zM8 2v4M16 2v4M4 9h16", title: "ຄົ້ນຫາງ່າຍ", text: "ໃຊ້ເລກອໍເດີ ຫຼືເບີໂທທີ່ໃຊ້ສັ່ງຊື້" },
  ];

  return (
    <div className="mx-auto max-w-5xl py-4 sm:py-8">
      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-600">
              <Icon path={feature.icon} />
            </span>
            <h2 className="mt-4 font-black text-slate-900">{feature.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{feature.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        <span className="font-black">ຊອກເລກອໍເດີບໍ່ພົບ?</span>{" "}
        ເບິ່ງຈາກໜ້າຢືນຢັນການສັ່ງຊື້ ຫຼື{" "}
        <Link href="/account" className="font-bold underline underline-offset-2">ບັນຊີຂອງຂ້ອຍ</Link>
      </div>
    </div>
  );
}
