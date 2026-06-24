"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useCart } from "@/lib/cart-context";
import { formatKip } from "@/lib/format";
import { OFFERED_PAYMENT_METHODS, PAYMENT_LABEL, PAYMENT_HINT, type PaymentMethod } from "@/lib/payment-constants";
import { SHIPPING_METHODS, SHIPPING_LABEL, SHIPPING_HINT, computeShippingFee, type ShippingMethod } from "@/lib/shipping-constants";
import type { AddressRecord } from "@/lib/addresses";
import AddressFields, { EMPTY_ADDRESS, type AddressFormValue } from "@/components/AddressFields";
import OnepayQr from "@/app/(shop)/order/[orderNo]/OnepayQr";
import { placeOrder, previewVoucher, getCheckoutLoyalty, previewPoints, lookupCustomers, type OrderQrPayload } from "./actions";

type CustHit = { code: string; source: "erp" | "local"; name: string; phone: string | null; email: string | null; address: string | null };

const NEW_ADDRESS = "__new__";
const SAVED_VOUCHER_KEY = "odienmall.checkout.voucher";

export default function CheckoutForm({
  loggedIn = false,
  initialName = "",
  initialPhone = "",
  savedAddresses = [],
  offeredMethods = OFFERED_PAYMENT_METHODS as unknown as PaymentMethod[],
  isAffiliate = false,
  vouchers = [],
}: {
  loggedIn?: boolean;
  initialName?: string;
  initialPhone?: string;
  savedAddresses?: AddressRecord[];
  offeredMethods?: PaymentMethod[];
  isAffiliate?: boolean;
  vouchers?: { code: string; kind: "percent" | "amount"; value: number; minSubtotal: number }[];
}) {
  const { items, totalPrice, totalQty, clear, ready } = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Affiliate only: buy for self vs on behalf of a customer.
  const [affMode, setAffMode] = useState<"self" | "onBehalf">("self");
  const onBehalf = isAffiliate && affMode === "onBehalf";
  const [form, setForm] = useState({
    name: initialName,
    phone: initialPhone,
    note: "",
  });

  // On-behalf customer lookup (search existing customer from DB, or type new).
  const [custQuery, setCustQuery] = useState("");
  const [custHits, setCustHits] = useState<CustHit[]>([]);
  const [custSearching, setCustSearching] = useState(false);
  // On-behalf payment delivery: affiliate transfers now, or send a pay link to
  // the customer (WhatsApp). Only relevant for transfer orders.
  const [sendLink, setSendLink] = useState(false);
  const [linkDone, setLinkDone] = useState<{ orderNo: string; total: number; phone: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Switch affiliate mode: clear customer fields for "on behalf", restore own
  // details for "self".
  function switchAffMode(mode: "self" | "onBehalf") {
    setAffMode(mode);
    setCustQuery("");
    setCustHits([]);
    if (mode === "onBehalf") {
      setForm((f) => ({ ...f, name: "", phone: "" }));
      setAddressChoice(NEW_ADDRESS);
    } else {
      setForm((f) => ({ ...f, name: initialName, phone: initialPhone }));
    }
  }
  function runCustSearch() {
    if (custQuery.trim().length < 2) return;
    setCustSearching(true);
    lookupCustomers(custQuery)
      .then((r) => setCustHits(r))
      .catch(() => setCustHits([]))
      .finally(() => setCustSearching(false));
  }
  function pickCust(c: CustHit) {
    setForm((f) => ({ ...f, name: c.name, phone: c.phone ?? "" }));
    setCustHits([]);
    setCustQuery("");
  }
  const [payment, setPayment] = useState<PaymentMethod>("transfer");
  const [shipping, setShipping] = useState<ShippingMethod>("odien");

  // Delivery address: pick a saved one (logged-in) or fill a new structured one.
  const defaultAddr = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
  const [addressChoice, setAddressChoice] = useState<string>(
    defaultAddr ? String(defaultAddr.id) : NEW_ADDRESS,
  );
  const [newAddress, setNewAddress] = useState<AddressFormValue>(EMPTY_ADDRESS);
  const [saveAddress, setSaveAddress] = useState(true);
  const usingNew = addressChoice === NEW_ADDRESS;

  // After confirming a transfer order, show the BCEL QR in a modal.
  const [modalQr, setModalQr] = useState<(OrderQrPayload & { orderNo: string }) | null>(null);

  // Voucher / discount code.
  const [voucherInput, setVoucherInput] = useState(() =>
    typeof window === "undefined" ? "" : localStorage.getItem(SAVED_VOUCHER_KEY) ?? "",
  );
  const [voucher, setVoucher] = useState<{ code: string; discount: number } | null>(null);
  const [voucherErr, setVoucherErr] = useState<string | null>(null);
  const [voucherChecking, setVoucherChecking] = useState(false);

  async function applyVoucher(codeArg?: string) {
    const code = (codeArg ?? voucherInput).trim();
    if (!code || voucherChecking) return;
    if (codeArg) setVoucherInput(codeArg);
    setVoucherChecking(true);
    setVoucherErr(null);
    const res = await previewVoucher(code, items.map((i) => ({ code: i.code, qty: i.qty })));
    setVoucherChecking(false);
    if (res.ok) {
      setVoucher({ code: res.code, discount: res.discount });
      setVoucherErr(null);
      localStorage.removeItem(SAVED_VOUCHER_KEY);
    } else {
      setVoucher(null);
      setVoucherErr(res.error);
    }
  }
  function clearVoucher() {
    setVoucher(null);
    setVoucherInput("");
    setVoucherErr(null);
    localStorage.removeItem(SAVED_VOUCHER_KEY);
  }
  const discount = voucher?.discount ?? 0;

  // Loyalty points redemption (logged-in customers).
  const [loyalty, setLoyalty] = useState<{ balance: number; pointValue: number; minRedeem: number; memberPct: number; memberTier: string | null } | null>(null);
  const [pointsInput, setPointsInput] = useState("");
  const [points, setPoints] = useState<{ points: number; discount: number } | null>(null);
  const [pointsErr, setPointsErr] = useState<string | null>(null);
  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    getCheckoutLoyalty().then((l) => {
      if (alive) setLoyalty(l);
    });
    return () => {
      alive = false;
    };
  }, [loggedIn]);
  async function applyPoints() {
    const p = Math.floor(Number(pointsInput) || 0);
    if (p <= 0) return;
    setPointsErr(null);
    const res = await previewPoints(p, items.map((i) => ({ code: i.code, qty: i.qty })));
    if (res.ok) {
      setPoints({ points: res.points, discount: res.discount });
      setPointsErr(null);
    } else {
      setPoints(null);
      setPointsErr(res.error);
    }
  }
  function clearPoints() {
    setPoints(null);
    setPointsInput("");
    setPointsErr(null);
  }
  // On behalf of a customer: the affiliate's own member tier + points don't apply.
  const pointsDiscount = onBehalf ? 0 : points?.discount ?? 0;
  const memberPct = onBehalf ? 0 : loyalty?.memberPct ?? 0;
  const memberDiscount = memberPct > 0 ? Math.round((totalPrice * memberPct) / 100) : 0;
  const grandTotal = Math.max(0, totalPrice + computeShippingFee(shipping, totalPrice) - discount - pointsDiscount - memberDiscount);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  // After confirming, the cart is cleared — show the QR modal (must come BEFORE
  // the empty-cart guard, which would otherwise hide it).
  if (modalQr) {
    return (
      <OnepayQr
        orderNo={modalQr.orderNo}
        amount={modalQr.amount}
        initialQr={{
          qrDataUrl: modalQr.qrDataUrl,
          amount: modalQr.qrAmount,
          expiresAt: modalQr.expiresAt,
          status: modalQr.status,
        }}
        tracked={modalQr.tracked}
        variant="modal"
        onExpire={goToOrder}
        onClose={goToOrder}
        onPaid={goToOrder}
      />
    );
  }

  // Affiliate sent a pay link to the customer — show link + WhatsApp share.
  if (linkDone) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const payLink = `${origin}/order/${encodeURIComponent(linkDone.orderNo)}`;
    const phone = linkDone.phone.replace(/[^0-9]/g, "").replace(/^0/, "856");
    const msg = `ສະບາຍດີ 🙏 ນີ້ແມ່ນລິ້ງຊຳລະເງິນອໍເດີ ${linkDone.orderNo} ຍອດ ${formatKip(linkDone.total)}:\n${payLink}`;
    const wa = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white">✓</div>
        <h3 className="mt-3 text-lg font-bold text-gray-900">ສ້າງອໍເດີ {linkDone.orderNo} ສຳເລັດ</h3>
        <p className="mt-1 text-sm text-gray-500">ສົ່ງລິ້ງລຸ່ມນີ້ໃຫ້ລູກຄ້າເພື່ອຊຳລະ {formatKip(linkDone.total)}</p>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
          <input readOnly value={payLink} className="min-w-0 flex-1 bg-transparent px-2 text-xs text-gray-600 outline-none" />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(payLink);
              setLinkCopied(true);
            }}
            className="shrink-0 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            {linkCopied ? "ກ໋ອບປີ້ແລ້ວ" : "ກ໋ອບປີ້"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={wa} target="_blank" rel="noreferrer" className="rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white">
            ສົ່ງ WhatsApp
          </a>
          <Link href={`/order/${encodeURIComponent(linkDone.orderNo)}`} className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600">
            ເບິ່ງອໍເດີ
          </Link>
        </div>
        <button type="button" onClick={() => router.push("/products")} className="mt-4 text-sm font-semibold text-brand-dark hover:underline">
          ສ້າງອໍເດີໃໝ່
        </button>
      </div>
    );
  }

  if (ready && items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-lg text-gray-600">ກະຕ່າຂອງທ່ານວ່າງເປົ່າ</p>
        <Link href="/products" className="rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2.5 text-sm font-semibold text-white">
          ເລີ່ມຊ໊ອບປິ້ງ
        </Link>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate the chosen address before sending.
    if (usingNew && (!newAddress.province || !newAddress.district)) {
      setError("ກະລຸນາເລືອກ ແຂວງ ແລະ ເມືອງ ຈັດສົ່ງ");
      return;
    }

    startTransition(async () => {
      const res = await placeOrder({
        name: form.name,
        phone: form.phone,
        note: form.note,
        ...(usingNew
          ? {
              province: newAddress.province,
              district: newAddress.district,
              village: newAddress.village,
              detail: newAddress.detail,
              saveAddress: loggedIn && saveAddress,
            }
          : { addressId: Number(addressChoice) }),
        paymentMethod: payment,
        shippingMethod: shipping,
        voucherCode: voucher?.code ?? null,
        pointsToUse: onBehalf ? 0 : points?.points ?? 0,
        onBehalf,
        items: items.map((i) => ({ code: i.code, qty: i.qty })),
      });
      if (res.ok) {
        clear();
        // Affiliate chose to send the customer a pay link instead of paying now.
        if (onBehalf && sendLink && payment === "transfer") {
          setLinkDone({ orderNo: res.orderNo, total: grandTotal, phone: form.phone });
        } else if (res.qr) {
          setModalQr({ orderNo: res.orderNo, ...res.qr });
        } else {
          router.push(`/order/${res.orderNo}`);
        }
      } else {
        setError(res.error);
      }
    });
  }

  function goToOrder() {
    if (modalQr) router.replace(`/order/${modalQr.orderNo}`);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white p-4 sm:p-5">
        <h1 className="text-xl font-black text-gray-900 sm:text-2xl">ຢືນຢັນການສັ່ງຊື້</h1>
        <p className="mt-1 text-xs text-slate-500">ກວດສອບທີ່ຢູ່, ການຈັດສົ່ງ ແລະການຊຳລະ</p>
        <div className="mt-4 flex items-center text-xs font-medium text-gray-400">
          <span className="rounded-full bg-orange-500 px-3 py-1.5 text-white">1 ຂໍ້ມູນຈັດສົ່ງ</span>
          <span className="h-px flex-1 bg-gray-200" />
          <span className="rounded-full bg-white px-3 py-1.5">2 ຊຳລະເງິນ</span>
          <span className="h-px flex-1 bg-gray-200" />
          <span className="rounded-full bg-white px-3 py-1.5">3 ສຳເລັດ</span>
        </div>
      </div>
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4 rounded-sm border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          {isAffiliate && (
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
              <span className="mb-2 block text-xs font-bold text-violet-700">ທ່ານເປັນນາຍໜ້າ — ສັ່ງຊື້ແບບໃດ?</span>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-white p-1 text-sm font-semibold shadow-inner">
                <button type="button" onClick={() => switchAffMode("self")} className={`rounded-md px-3 py-2 transition ${!onBehalf ? "bg-violet-600 text-white shadow-sm" : "text-slate-500"}`}>
                  ຊື້ເອງ
                </button>
                <button type="button" onClick={() => switchAffMode("onBehalf")} className={`rounded-md px-3 py-2 transition ${onBehalf ? "bg-violet-600 text-white shadow-sm" : "text-slate-500"}`}>
                  ຊື້ແທນລູກຄ້າ
                </button>
              </div>
              {onBehalf && (
                <>
                  <p className="mt-2 text-[11px] leading-relaxed text-violet-600">
                    ໃສ່ຂໍ້ມູນ <span className="font-bold">ລູກຄ້າ</span> ຜູ້ຮັບສິນຄ້າ — ຄ່ານາຍໜ້າຈະຄິດໃຫ້ທ່ານອັດຕະໂນມັດ.
                  </p>
                  {payment === "transfer" && (
                    <div className="mt-3">
                      <span className="mb-1.5 block text-[11px] font-bold text-violet-700">ການຊຳລະ</span>
                      <div className="grid grid-cols-2 gap-1 rounded-lg bg-white p-1 text-xs font-semibold shadow-inner">
                        <button type="button" onClick={() => setSendLink(false)} className={`rounded-md px-2 py-2 transition ${!sendLink ? "bg-violet-600 text-white shadow-sm" : "text-slate-500"}`}>
                          ໂອນເລີຍ (QR)
                        </button>
                        <button type="button" onClick={() => setSendLink(true)} className={`rounded-md px-2 py-2 transition ${sendLink ? "bg-violet-600 text-white shadow-sm" : "text-slate-500"}`}>
                          ສົ່ງລິ້ງໃຫ້ລູກຄ້າ
                        </button>
                      </div>
                      {sendLink && (
                        <p className="mt-1.5 text-[11px] text-violet-600">ສ້າງອໍເດີແລ້ວໄດ້ລິ້ງຊຳລະ → ສົ່ງໃຫ້ລູກຄ້າທາງ WhatsApp ໃຫ້ໂອນເອງ.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <h2 className="font-semibold text-gray-800">{onBehalf ? "ຂໍ້ມູນລູກຄ້າ (ຜູ້ຮັບ)" : "ຂໍ້ມູນຜູ້ສັ່ງຊື້"}</h2>
          {onBehalf && (
            <div className="relative">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">ຄົ້ນຫາລູກຄ້າເກົ່າ ຫຼື ພິມໃສ່ໃໝ່ຂ້າງລຸ່ມ</span>
              <div className="flex gap-2">
                <input
                  value={custQuery}
                  onChange={(e) => setCustQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runCustSearch())}
                  placeholder="ຊື່ / ເບີໂທ / ລະຫັດ"
                  className="inp"
                />
                <button type="button" onClick={runCustSearch} disabled={custSearching || custQuery.trim().length < 2} className="shrink-0 rounded-lg bg-slate-800 px-3 text-xs font-bold text-white disabled:opacity-40">
                  {custSearching ? "..." : "ຄົ້ນຫາ"}
                </button>
              </div>
              {custHits.length > 0 && (
                <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-xl">
                  {custHits.map((c) => (
                    <button key={c.code} type="button" onClick={() => pickCust(c)} className="flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-violet-50">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-800">{c.name}</span>
                        <span className="block text-xs text-gray-400">{c.phone || c.email || "ບໍ່ມີເບີໂທ"}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${c.source === "erp" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>
                        {c.source === "erp" ? "SML" : "ເວັບ"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <Field label="ຊື່ ແລະ ນາມສະກຸນ *">
            <input required value={form.name} onChange={set("name")} className="inp" placeholder="ຊື່ຂອງທ່ານ" />
          </Field>
          <Field label="ເບີໂທ *">
            <input required value={form.phone} onChange={set("phone")} inputMode="tel" className="inp" placeholder="020 XXXX XXXX" />
          </Field>
          <div className="border-t border-gray-100 pt-4">
            <span className="mb-2 block text-sm font-medium text-gray-700">ທີ່ຢູ່ຈັດສົ່ງ *</span>

            {/* Saved address picker (logged-in customers; not when buying for a customer) */}
            {!onBehalf && savedAddresses.length > 0 && (
              <div className="mb-3 space-y-2">
                {savedAddresses.map((a) => (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                      addressChoice === String(a.id)
                        ? "border-brand bg-brand-light/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={String(a.id)}
                      checked={addressChoice === String(a.id)}
                      onChange={() => setAddressChoice(String(a.id))}
                      className="mt-0.5 h-4 w-4 accent-brand"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">
                          {a.recipient || initialName || "ທີ່ຢູ່"}
                        </span>
                        {a.isDefault && (
                          <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
                            ຄ່າເລີ່ມຕົ້ນ
                          </span>
                        )}
                      </span>
                      {a.phone && <span className="block text-xs text-gray-500">{a.phone}</span>}
                      <span className="block text-xs text-gray-500">{a.label}</span>
                    </span>
                  </label>
                ))}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-sm transition ${
                    usingNew ? "border-brand bg-brand-light/40 text-brand-dark" : "border-gray-300 text-gray-500 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={NEW_ADDRESS}
                    checked={usingNew}
                    onChange={() => setAddressChoice(NEW_ADDRESS)}
                    className="h-4 w-4 accent-brand"
                  />
                  + ໃຊ້ທີ່ຢູ່ໃໝ່
                </label>
              </div>
            )}

            {/* New structured address */}
            {usingNew && (
              <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                <AddressFields value={newAddress} onChange={setNewAddress} />
                {loggedIn && (
                  <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="h-4 w-4 accent-brand"
                    />
                    ບັນທຶກທີ່ຢູ່ນີ້ໄວ້ໃນບັນຊີ
                  </label>
                )}
              </div>
            )}
          </div>

          <Field label="ໝາຍເຫດ">
            <input value={form.note} onChange={set("note")} className="inp" placeholder="ຂໍ້ມູນເພີ່ມເຕີມ (ຖ້າມີ)" />
          </Field>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="border-t border-slate-50 pt-4">
            <h2 className="mb-3 font-bold text-slate-900">ວິທີຈັດສົ່ງ</h2>
            <div className="space-y-2.5">
              {SHIPPING_METHODS.map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-all duration-200 ${
                    shipping === m ? "border-orange-500 bg-orange-50 shadow-sm" : "border-slate-200 hover:border-orange-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    value={m}
                    checked={shipping === m}
                    onChange={() => setShipping(m)}
                    className="mt-0.5 h-4.5 w-4.5 accent-slate-900"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-800">{SHIPPING_LABEL[m]}</span>
                    <span className="block text-xs text-slate-450 mt-1 leading-relaxed">{SHIPPING_HINT[m]}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-50 pt-4">
            <h2 className="mb-3 font-bold text-slate-900">ວິທີຊຳລະເງິນ</h2>
            <div className="space-y-2.5">
              {offeredMethods.map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-all duration-200 ${
                    payment === m ? "border-orange-500 bg-orange-50 shadow-sm" : "border-slate-200 hover:border-orange-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={m}
                    checked={payment === m}
                    onChange={() => setPayment(m)}
                    className="mt-0.5 h-4.5 w-4.5 accent-slate-900"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-800">{PAYMENT_LABEL[m]}</span>
                    <span className="block text-xs text-slate-450 mt-1 leading-relaxed">{PAYMENT_HINT[m]}</span>
                  </span>
                </label>
              ))}
            </div>
            {payment === "transfer" && (
              <p className="mt-3 rounded-xl bg-amber-50 border border-amber-100/60 px-4 py-3 text-xs text-amber-700 leading-relaxed">
                ຂໍ້ມູນບັນຊີທະນາຄານສຳລັບໂອນເງິນ ຈະສະແດງໃຫ້ເຫັນໃນໜ້າຢືນຢັນຫຼັງຈາກກົດສັ່ງຊື້ສຳເລັດ.
              </p>
            )}
            {payment === "cod" && (
              <p className="mt-3 rounded-xl bg-orange-50 border border-orange-100/60 px-4 py-3 text-xs text-orange-700 leading-relaxed">
                ຊຳລະເງິນສົດເມື່ອໄດ້ຮັບສິນຄ້າ — ບໍ່ຕ້ອງໂອນລ່ວງໜ້າ. ກະລຸນາກຽມເງິນໃຫ້ພໍດີຕອນຮັບເຄື່ອງ.
              </p>
            )}
          </div>
        </div>

        <div className="h-fit space-y-4 rounded-sm border border-orange-100 bg-white p-5 shadow-sm lg:sticky lg:top-32">
          <h2 className="font-bold text-slate-900 pb-2 border-b border-slate-50">ສະຫຼຸບຄຳສັ່ງຊື້ ({totalQty})</h2>
          <div className="max-h-64 space-y-2.5 overflow-y-auto thin-scroll pr-1">
            {items.map((it) => (
              <div key={it.code} className="flex justify-between gap-3 text-xs">
                <span className="line-clamp-1 text-slate-500 font-medium">
                  {it.name} <span className="text-slate-400 font-bold">×{it.qty}</span>
                </span>
                <span className="shrink-0 font-bold text-slate-700">
                  {formatKip((it.price ?? 0) * it.qty)}
                </span>
              </div>
            ))}
          </div>
          {/* Voucher / discount code */}
          <div className="border-t border-slate-50 pt-3.5">
            {voucher ? (
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs">
                <span className="font-bold text-emerald-700">
                  ໂຄ້ດ {voucher.code} · −{formatKip(voucher.discount)}
                </span>
                <button type="button" onClick={clearVoucher} className="font-semibold text-emerald-600 hover:underline">
                  ເອົາອອກ
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyVoucher();
                      }
                    }}
                    placeholder="ໂຄ້ດສ່ວນຫຼຸດ"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => applyVoucher()}
                    disabled={voucherChecking || !voucherInput.trim()}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-950 disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {voucherChecking ? "..." : "ໃຊ້"}
                  </button>
                </div>
                {voucherErr && <p className="mt-1.5 text-[11px] font-semibold text-rose-500">{voucherErr}</p>}
                {/* Lazada-style voucher picker — tap an available voucher to apply */}
                {vouchers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {vouchers.map((v) => (
                      <button
                        key={v.code}
                        type="button"
                        onClick={() => applyVoucher(v.code)}
                        disabled={voucherChecking}
                        className="inline-flex items-center gap-1 rounded-md border border-dashed border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                        title={v.minSubtotal > 0 ? `ຍອດຂັ້ນຕ່ຳ ${formatKip(v.minSubtotal)}` : undefined}
                      >
                        🎟 {v.code}
                        <span className="font-normal text-rose-400">
                          {v.kind === "percent" ? `−${v.value}%` : `−${formatKip(v.value)}`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Loyalty points (own account only — not when buying for a customer) */}
          {!onBehalf && loyalty && loyalty.balance >= loyalty.minRedeem && (
            <div className="border-t border-slate-50 pt-3.5">
              <p className="mb-1.5 text-[11px] font-bold text-slate-500">
                ມີ {loyalty.balance.toLocaleString()} ແຕ້ມ (1 ແຕ້ມ = {formatKip(loyalty.pointValue)})
              </p>
              {points ? (
                <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs">
                  <span className="font-bold text-amber-700">ໃຊ້ {points.points.toLocaleString()} ແຕ້ມ · −{formatKip(points.discount)}</span>
                  <button type="button" onClick={clearPoints} className="font-semibold text-amber-600 hover:underline">ເອົາອອກ</button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={pointsInput}
                      onChange={(e) => setPointsInput(e.target.value)}
                      placeholder={`ໃຊ້ແຕ້ມ (ຂັ້ນຕ່ຳ ${loyalty.minRedeem})`}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={applyPoints}
                      disabled={!pointsInput.trim()}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-950 disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      ໃຊ້
                    </button>
                  </div>
                  {pointsErr && <p className="mt-1.5 text-[11px] font-semibold text-rose-500">{pointsErr}</p>}
                </>
              )}
            </div>
          )}

          <div className="space-y-2 border-t border-slate-50 pt-3.5 text-xs font-semibold">
            <div className="flex items-baseline justify-between text-slate-500">
              <span>ລາຄາສິນຄ້າ</span>
              <span className="text-slate-700 font-bold">{formatKip(totalPrice)}</span>
            </div>
            <div className="flex items-baseline justify-between text-slate-500">
              <span>ຄ່າຂົນສົ່ງ ({SHIPPING_LABEL[shipping]})</span>
              <span className="font-bold text-emerald-600">
                {computeShippingFee(shipping, totalPrice) === 0
                  ? "ຟຣີ"
                  : formatKip(computeShippingFee(shipping, totalPrice))}
              </span>
            </div>
            {memberDiscount > 0 && (
              <div className="flex items-baseline justify-between text-violet-600">
                <span>ສ່ວນຫຼຸດສະມາຊິກ{loyalty?.memberTier ? ` (${loyalty.memberTier})` : ""} {memberPct}%</span>
                <span className="font-bold">−{formatKip(memberDiscount)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex items-baseline justify-between text-emerald-600">
                <span>ສ່ວນຫຼຸດ (ໂຄ້ດ)</span>
                <span className="font-bold">−{formatKip(discount)}</span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex items-baseline justify-between text-amber-600">
                <span>ສ່ວນຫຼຸດ (ແຕ້ມ)</span>
                <span className="font-bold">−{formatKip(pointsDiscount)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-slate-50 pt-3">
              <span className="text-sm font-bold text-slate-900">ລວມທັງໝົດ</span>
              <span className="text-2xl font-black text-price tracking-tight">
                {formatKip(Math.max(0, totalPrice + computeShippingFee(shipping, totalPrice) - discount - pointsDiscount - memberDiscount))}
              </span>
            </div>
          </div>
          <button
            type="submit"
            disabled={pending || !ready}
            className="w-full rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 py-3.5 text-sm font-bold text-white shadow-md transition hover:from-orange-600 hover:to-rose-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {pending
              ? "ກຳລັງສ້າງຄຳສັ່ງຊື້..."
              : payment === "cod"
                ? "ຢືນຢັນສັ່ງຊື້ (ຈ່າຍປາຍທາງ)"
                : "ສ້າງຄຳສັ່ງຊື້ ແລະ ໄປຊຳລະ"}
          </button>
          <p className="text-center text-[10px] font-bold text-slate-400 leading-normal">
            ໂອນຜ່ານ BCEL One ໄດ້ທັນທີ · ຈັດສົ່ງວ່ອງໄວທົ່ວລາວ
          </p>
          <Link href="/cart" className="block text-center text-sm text-brand-dark hover:underline">
            ກັບໄປແກ້ໄຂກະຕ່າ
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-600">{label}</span>
      {children}
    </label>
  );
}
