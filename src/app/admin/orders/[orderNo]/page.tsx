import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getOrderByNo, getOrderTms, type OrderTms } from "@/lib/orders";
import { getOrderPayment } from "@/lib/onepay-store";
import { getOrderWarehouseOptions } from "@/lib/order-warehouse";
import { TMS_TRACK_URL } from "@/lib/config";
import { formatKip } from "@/lib/format";
import { PAYMENT_LABEL, type PaymentMethod } from "@/lib/payment-constants";
import { SHIPPING_LABEL, type ShippingMethod } from "@/lib/shipping-constants";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-constants";
import OrderStatusControl from "@/components/OrderStatusControl";
import OrderWarehouseControl from "@/components/OrderWarehouseControl";
import DeleteOrderAdminButton from "@/components/DeleteOrderAdminButton";
import PendingPaymentControl from "@/components/PendingPaymentControl";
import StatusBadge from "@/components/StatusBadge";
import { BTN_SECONDARY, Card } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

// Fulfilment steps differ by payment timing: transfer pays up-front, COD on
// delivery. Both converge at paid (44 / ອອກບິນ) → shipping → completed.
const TRANSFER_FLOW: readonly OrderStatus[] = ["pending", "awaiting_confirmation", "paid", "shipping", "completed"];
const COD_FLOW: readonly OrderStatus[] = ["cod", "paid", "shipping", "completed"];

const ICON = {
  customer: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.34 1.78.65 2.63a2 2 0 0 1-.45 2.11L8.04 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.31 1.73.53 2.63.65A2 2 0 0 1 22 16.92z",
  location: "M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  truck: "M3 6h11v11H3zM14 10h4l3 3v4h-7zM7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4M18 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  payment: "M3 6h18v12H3zM3 10h18M7 15h3",
  note: "M4 4h16v16H4zM8 9h8M8 13h6",
};

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { orderNo } = await params;
  const order = await getOrderByNo(decodeURIComponent(orderNo));
  if (!order) notFound();

  const inDelivery = order.status === "shipping" || order.status === "completed";
  const [warehouseOptions, payment, tms] = await Promise.all([
    getOrderWarehouseOptions(order.orderNo),
    getOrderPayment(order.orderNo),
    inDelivery ? getOrderTms(order.orderNo) : Promise.resolve(null),
  ]);
  const grandTotal = order.subtotal + order.shippingFee;
  const FLOW = order.paymentMethod === "cod" ? COD_FLOW : TRANSFER_FLOW;
  const currentIndex = FLOW.indexOf(order.status as OrderStatus);
  const isCancelled = order.status === "cancelled";
  const paymentLabel =
    PAYMENT_LABEL[order.paymentMethod as PaymentMethod] ?? order.paymentMethod;
  const shippingLabel =
    SHIPPING_LABEL[order.shippingMethod as ShippingMethod] ?? order.shippingMethod;
  const warehouseReady = warehouseOptions.ready;

  return (
    <div className="w-full">
      <div className="mb-5">
        <Link
          href="/admin"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-brand-dark"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          ກັບໄປລາຍການອໍເດີ
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                {order.orderNo}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              ສ້າງເມື່ອ{" "}
              {new Date(order.createdAt).toLocaleString("lo-LA", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/orders/${encodeURIComponent(order.orderNo)}/print`}
              className={BTN_SECONDARY}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              ພິມໃບສັ່ງຊື້
            </Link>
            <DeleteOrderAdminButton orderNo={order.orderNo} />
          </div>
        </div>
      </div>

      <Card className={`mb-5 overflow-hidden ${isCancelled ? "border-rose-100" : "border-blue-100"}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              ສະຖານະປັດຈຸບັນ
            </p>
            <h2 className={`mt-1 text-xl font-bold ${isCancelled ? "text-rose-600" : "text-gray-900"}`}>
              {STATUS_LABEL[order.status as OrderStatus] ?? order.status}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {nextStepText(order.status)}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-brand-light/70 px-5 py-3 text-left lg:text-right">
            <p className="text-xs text-gray-500">ຍອດທີ່ຕ້ອງຊຳລະ</p>
            <p className="mt-0.5 text-2xl font-extrabold text-price">{formatKip(grandTotal)}</p>
            <p className="mt-0.5 text-xs text-gray-500">{paymentLabel}</p>
          </div>
        </div>

        {!isCancelled && (
          <div className="mt-6 overflow-x-auto pb-1">
            <div className="flex min-w-[620px] items-start">
              {FLOW.map((status, index) => {
                const done = currentIndex >= index;
                const active = currentIndex === index;
                return (
                  <div key={status} className="relative flex flex-1 flex-col items-center">
                    {index > 0 && (
                      <span
                        className={`absolute right-1/2 top-4 h-0.5 w-full ${
                          done ? "bg-brand" : "bg-gray-200"
                        }`}
                      />
                    )}
                    <span
                      className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold ${
                        active
                          ? "border-brand bg-brand text-white shadow-md shadow-brand/20"
                          : done
                            ? "border-brand bg-brand-light text-brand-dark"
                            : "border-gray-200 bg-white text-gray-400"
                      }`}
                    >
                      {done && !active ? "✓" : index + 1}
                    </span>
                    <span className={`mt-2 text-center text-xs ${active ? "font-semibold text-brand-dark" : "text-gray-500"}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <Card>
            <SectionTitle
              title="ຂໍ້ມູນລູກຄ້າ ແລະ ການຈັດສົ່ງ"
              subtitle="ຂໍ້ມູນສຳລັບຕິດຕໍ່ແລະຈັດສົ່ງ"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Info icon={ICON.customer} label="ລູກຄ້າ" value={order.customerName} />
              <Info
                icon={ICON.phone}
                label="ເບີໂທ"
                value={
                  <a href={`tel:${order.phone}`} className="font-medium text-brand-dark hover:underline">
                    {order.phone}
                  </a>
                }
              />
              <Info icon={ICON.truck} label="ວິທີຈັດສົ່ງ" value={shippingLabel} />
              <Info icon={ICON.payment} label="ວິທີຊຳລະ" value={paymentLabel} />
              {order.address && (
                <Info icon={ICON.location} label="ທີ່ຢູ່ຈັດສົ່ງ" value={order.address} wide />
              )}
              {order.note && (
                <Info icon={ICON.note} label="ໝາຍເຫດຈາກລູກຄ້າ" value={order.note} wide tone="amber" />
              )}
            </div>
          </Card>

          <Card padded={false} className="overflow-hidden">
            <div className="px-5 pt-5">
              <SectionTitle
                title={`ລາຍການສິນຄ້າ (${order.items.length})`}
                subtitle="ລາຄາທີ່ບັນທຶກໄວ້ໃນອໍເດີ"
              />
            </div>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <div key={item.productCode} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="font-medium leading-6 text-gray-800">{item.productName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                      <span className="font-mono">{item.productCode}</span>
                      <span>
                        {formatKip(item.unitPrice)} × {item.qty}
                        {item.unit ? ` ${item.unit}` : ""}
                      </span>
                    </div>
                  </div>
                  <p className="text-base font-bold text-gray-900">{formatKip(item.lineTotal)}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle
              title="ເລືອກສາງຈ່າຍ ແລະ ຂົນສົ່ງ"
              subtitle="ເລືອກຂໍ້ມູນໃຫ້ຄົບ ແລ້ວຢືນຢັນຄຳສັ່ງຊື້"
            />
            <OrderWarehouseControl
              orderNo={order.orderNo}
              status={order.status}
              options={warehouseOptions}
            />
          </Card>

          {inDelivery && (
            <Card>
              <SectionTitle
                title="ການຂົນສົ່ງ (TMS)"
                subtitle="ຂໍ້ມູນຈາກລະບົບຂົນສົ່ງ — ອັບເດດອັດຕະໂນມັດ"
              />
              <TmsPanel tms={tms} docNo={order.smlDocNo} completed={order.status === "completed"} />
            </Card>
          )}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-8">
          {order.status === "pending" && order.paymentMethod === "transfer" && (
            <Card className="border-emerald-100">
              <SectionTitle title="ຢືນຢັນການຊຳລະ (ໂອນ)" subtitle="ແນບສະລິບ ແລ້ວຢືນຢັນເມື່ອເງິນເຂົ້າ" />
              <PendingPaymentControl orderNo={order.orderNo} initialSlip={null} />
            </Card>
          )}
          {payment?.status === "submitted" && order.status === "pending" && (
            <Card className="border-blue-200 bg-blue-50/70">
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                  !
                </span>
                <div>
                  <h2 className="text-sm font-bold text-blue-900">ລູກຄ້າແຈ້ງວ່າໂອນແລ້ວ</h2>
                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    ກວດຍອດ {formatKip(grandTotal)} ໃນບັນຊີ BCEL. ຖ້າເງິນເຂົ້າແລ້ວ
                    ເມື່ອ BCEL ຢືນຢັນ ລະບົບຈະປ່ຽນເປັນ “ຊຳລະແລ້ວ ລໍຖ້າຢືນຢັນ”.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <SectionTitle title="ສະຫຼຸບຍອດ" />
            <div className="space-y-3 text-sm">
              <AmountRow label="ລາຄາສິນຄ້າ" value={formatKip(order.subtotal)} />
              <AmountRow label="ຄ່າຂົນສົ່ງ" value={formatKip(order.shippingFee)} />
              <div className="border-t border-dashed border-gray-200 pt-3">
                <AmountRow
                  label="ລວມທັງໝົດ"
                  value={formatKip(grandTotal)}
                  total
                />
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
              <span className="font-semibold text-gray-700">ຊຳລະ:</span> {paymentLabel}
            </div>
          </Card>

          <Card>
            <SectionTitle
              title="ຈັດການສະຖານະ"
              subtitle="ເລືອກຂັ້ນຕອນຕໍ່ໄປຂອງອໍເດີ"
            />
            <OrderStatusControl
              orderNo={order.orderNo}
              current={order.status}
              warehouseReady={warehouseReady}
            />
          </Card>

        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}

function Info({
  icon,
  label,
  value,
  wide,
  tone = "gray",
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  wide?: boolean;
  tone?: "gray" | "amber";
}) {
  return (
    <div
      className={`flex gap-3 rounded-xl border p-3.5 ${
        wide ? "sm:col-span-2" : ""
      } ${tone === "amber" ? "border-amber-100 bg-amber-50/70" : "border-gray-100 bg-gray-50/60"}`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-gray-400">{label}</span>
        <span className="mt-0.5 block break-words text-sm leading-6 text-gray-700">{value}</span>
      </span>
    </div>
  );
}

function AmountRow({
  label,
  value,
  total,
}: {
  label: string;
  value: string;
  total?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={total ? "font-bold text-gray-900" : "text-gray-500"}>{label}</span>
      <span className={total ? "text-xl font-extrabold text-price" : "font-medium text-gray-700"}>
        {value}
      </span>
    </div>
  );
}

function TmsPanel({ tms, docNo, completed }: { tms: OrderTms | null; docNo: string | null; completed: boolean }) {
  const fmt = (s: string | null) =>
    s ? new Date(s).toLocaleString("lo-LA", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const mapUrl = tms?.lat && tms?.lng ? `https://www.google.com/maps?q=${tms.lat},${tms.lng}` : null;
  const tmsLink = TMS_TRACK_URL && docNo ? `${TMS_TRACK_URL}${encodeURIComponent(docNo)}` : null;
  const isCod = (tms?.paymentMethod === "cod") || (tms?.codAmount ?? 0) > 0;
  const codPaid = tms?.collectedAt != null || ((tms?.codAmount ?? 0) > 0 && (tms?.collectedAmount ?? 0) >= (tms?.codAmount ?? 0));

  if (!tms) {
    return (
      <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
        ຍັງບໍ່ພົບຂໍ້ມູນໃນລະບົບ TMS ສຳລັບບິນນີ້.
        {tmsLink && (
          <a href={tmsLink} target="_blank" rel="noopener noreferrer" className="ml-2 font-semibold text-brand-dark hover:underline">
            ເປີດໃນ TMS ↗
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <TmsRow label="ລົດຂົນສົ່ງ" value={tms.car || "—"} />
        <TmsRow label="ໂທຄົນຂັບ" value={tms.driverPhone || "—"} />
        <TmsRow label="ວັນກຳນົດສົ່ງ" value={fmt(tms.dateLogistic)} />
        <TmsRow label="ເລີ່ມສົ່ງ" value={fmt(tms.sentStart)} />
        <TmsRow label="ສົ່ງເຖິງ" value={completed ? fmt(tms.sentEnd) : "ກຳລັງດຳເນີນ"} />
        {tms.deliveryCondition && <TmsRow label="ສະພາບ" value={tms.deliveryCondition} />}
      </div>

      {isCod && (
        <div className={`rounded-xl px-3 py-2.5 text-xs ${codPaid ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
          <span className="font-bold">COD {formatKip(tms.codAmount ?? 0)}</span>
          {codPaid
            ? <span className="ml-2 font-semibold">ເກັບເງິນແລ້ວ ✓ {tms.collectedAmount ? formatKip(tms.collectedAmount) : ""}</span>
            : <span className="ml-2">ຍັງບໍ່ໄດ້ເກັບເງິນ</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {mapUrl && (
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-brand hover:text-brand-dark">
            📍 ເບິ່ງຕຳແໜ່ງແຜນທີ່
          </a>
        )}
        {tmsLink && (
          <a href={tmsLink} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark">
            ເປີດໃນ TMS ↗
          </a>
        )}
      </div>
    </div>
  );
}

function TmsRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-gray-400">{label}</div>
      <div className="mt-0.5 font-medium text-gray-700">{value}</div>
    </div>
  );
}

function nextStepText(status: string) {
  const text: Record<string, string> = {
    pending: "ກວດການຊຳລະ ແລ້ວເລືອກສາງ + ກົດ ອອກບິນ (34→44)",
    cod: "ເກັບເງິນປາຍທາງ — ກວດ stock, ເລືອກສາງ ແລະອອກບິນ (34→44) ເພື່ອຈັດສົ່ງ",
    awaiting_confirmation: "ຊຳລະແລ້ວ — ກວດ stock, ເລືອກສາງ ແລະຢືນຢັນຄຳສັ່ງຊື້",
    paid: "ຢືນຢັນແລ້ວ — ລໍຖ້າລະບົບຂົນສົ່ງ (TMS) ຮັບໄປຈັດສົ່ງ",
    shipping: "ກຳລັງຈັດສົ່ງ — ຕິດຕາມຈົນລູກຄ້າໄດ້ຮັບ",
    completed: "ອໍເດີນີ້ສົ່ງສຳເລັດແລ້ວ",
    cancelled: "ອໍເດີນີ້ຖືກຍົກເລີກ",
  };
  return text[status] ?? "";
}
