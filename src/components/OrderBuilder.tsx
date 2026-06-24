"use client";

import { useState, useTransition } from "react";
import { formatKip } from "@/lib/format";
import AddressFields, { EMPTY_ADDRESS, type AddressFormValue } from "@/components/AddressFields";
import { LAO_PROVINCES } from "@/lib/lao-locations";
import { ADMIN_TRANSPORTS } from "@/lib/admin-shipping-constants";

interface Hit {
  code: string;
  name: string;
  price: number | null;
  unit: string | null;
  stock: number;
}
interface Line {
  code: string;
  name: string;
  price: number;
  qty: number;
  unit?: string | null;
}
interface CustomerHit {
  code: string;
  source: "erp" | "local";
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}
interface SavedAddr {
  id: number;
  recipient: string | null;
  phone: string | null;
  province: string;
  district: string;
  village: string | null;
  detail: string | null;
  isDefault: boolean;
  label: string;
}
const NEW_ADDR = "new";
type BuildResult =
  | { ok: true; orderNo: string; total: number; link: string }
  | { ok: false; error: string };

// Staff "create order for a customer" — a simple, fast POS-style builder:
// pick a customer, search + add products, choose payment, confirm.
export default function OrderBuilder({
  search,
  searchCustomers,
  create,
  uploadSlip,
  lookupAddresses,
  salespeople = [],
  defaultSaleCode = null,
}: {
  search: (q: string) => Promise<Hit[]>;
  searchCustomers: (q: string) => Promise<CustomerHit[]>;
  create: (input: {
    customerCode?: string | null;
    name: string;
    phone: string;
    province?: string;
    district?: string;
    village?: string;
    detail?: string;
    shippingMethod?: string;
    note?: string;
    voucherCode?: string | null;
    items: { code: string; qty: number }[];
    paymentMethod?: string;
    transportCode?: string | null;
    saleCode?: string | null;
  }) => Promise<BuildResult>;
  uploadSlip?: (orderNo: string, formData: FormData) => Promise<{ ok: true; url: string } | { ok: false; error: string }>;
  /** Optional: pull a registered customer's saved addresses from the DB. */
  lookupAddresses?: (code: string) => Promise<SavedAddr[]>;
  /** Salespeople (ພະນັກງານຂາຍ) the admin can attribute the order to. */
  salespeople?: { code: string; name: string }[];
  /** Default salesperson = the logged-in admin's employee code. */
  defaultSaleCode?: string | null;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [cust, setCust] = useState({ customerCode: "", name: "", phone: "", note: "", voucherCode: "" });
  const [address, setAddress] = useState<AddressFormValue>(EMPTY_ADDRESS);
  const [savedAddrs, setSavedAddrs] = useState<SavedAddr[]>([]);
  const [addrChoice, setAddrChoice] = useState<string>(NEW_ADDR);
  const [transport, setTransport] = useState<string>(ADMIN_TRANSPORTS[0].code);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "transfer">("transfer");
  const [saleCode, setSaleCode] = useState<string>(defaultSaleCode ?? "");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState<CustomerHit[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerHit | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderNo: string; total: number; link: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [slipUploading, setSlipUploading] = useState(false);
  const [slipError, setSlipError] = useState<string | null>(null);

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const shippingFee = 0; // assisted orders ship free
  const total = subtotal + shippingFee;
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);

  async function runSearch(term: string) {
    setQ(term);
    if (term.trim().length < 1) {
      setHits([]);
      return;
    }
    setSearching(true);
    try {
      setHits(await search(term));
    } finally {
      setSearching(false);
    }
  }
  function add(h: Hit) {
    if (h.price == null) return;
    setLines((ls) => {
      const ex = ls.find((l) => l.code === h.code);
      if (ex) return ls.map((l) => (l.code === h.code ? { ...l, qty: l.qty + 1 } : l));
      return [...ls, { code: h.code, name: h.name, price: h.price!, qty: 1, unit: h.unit }];
    });
    setQ("");
    setHits([]);
  }
  function setQty(code: string, qty: number) {
    setLines((ls) => ls.flatMap((l) => (l.code === code ? (qty > 0 ? [{ ...l, qty }] : []) : [l])));
  }

  async function runCustomerSearch(term: string) {
    setCustomerQuery(term);
    if (term.trim().length < 2) {
      setCustomerHits([]);
      return;
    }
    setCustomerHits(await searchCustomers(term));
  }
  function pickSavedAddr(a: SavedAddr) {
    setAddrChoice(String(a.id));
    setAddress({
      recipient: a.recipient ?? "",
      phone: a.phone ?? "",
      province: a.province,
      district: a.district,
      village: a.village ?? "",
      detail: a.detail ?? "",
    });
  }

  async function chooseCustomer(c: CustomerHit) {
    setSelectedCustomer(c);
    setCustomerHits([]);
    setCustomerQuery("");
    setCust((cur) => ({ ...cur, customerCode: c.code, name: c.name, phone: c.phone ?? "" }));
    // Pull saved addresses from the DB (registered customers). Default to the
    // default address; else fall back to the raw ar_customer address string.
    let list: SavedAddr[] = [];
    if (c.source === "erp" && lookupAddresses) {
      list = await lookupAddresses(c.code).catch(() => []);
    }
    setSavedAddrs(list);
    if (list.length > 0) {
      pickSavedAddr(list.find((a) => a.isDefault) ?? list[0]);
    } else {
      setAddrChoice(NEW_ADDR);
      setAddress(c.address ? parseLaoAddress(c.address) : EMPTY_ADDRESS);
    }
  }
  function clearCustomer() {
    setSelectedCustomer(null);
    setCustomerHits([]);
    setCustomerQuery("");
    setCust((cur) => ({ ...cur, customerCode: "", name: "", phone: "" }));
    setSavedAddrs([]);
    setAddrChoice(NEW_ADDR);
    setAddress(EMPTY_ADDRESS);
  }

  function submit() {
    setError(null);
    if (!cust.name.trim() || !cust.phone.trim()) return setError("ກະລຸນາໃສ່ຊື່ ແລະ ເບີໂທ");
    if (!address.province && !address.district && !address.village && !address.detail?.trim())
      return setError("ກະລຸນາໃສ່ທີ່ຢູ່ສົ່ງເຄື່ອງ");
    if (lines.length === 0) return setError("ກະລຸນາເພີ່ມສິນຄ້າ");
    startTransition(async () => {
      const res = await create({
        customerCode: cust.customerCode.trim() || null,
        name: cust.name,
        phone: cust.phone,
        province: address.province,
        district: address.district,
        village: address.village,
        detail: address.detail,
        note: cust.note,
        voucherCode: cust.voucherCode.trim() || null,
        items: lines.map((l) => ({ code: l.code, qty: l.qty })),
        paymentMethod,
        transportCode: transport,
        saleCode: saleCode || null,
      });
      if (res.ok) setDone({ orderNo: res.orderNo, total: res.total, link: res.link });
      else setError(res.error);
    });
  }

  function reset() {
    setDone(null);
    setLines([]);
    setCust({ customerCode: "", name: "", phone: "", note: "", voucherCode: "" });
    setAddress(EMPTY_ADDRESS);
    setSavedAddrs([]);
    setAddrChoice(NEW_ADDR);
    setTransport(ADMIN_TRANSPORTS[0].code);
    setPaymentMethod("transfer");
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerHits([]);
    setQ("");
    setHits([]);
    setCopied(false);
    setSlipUrl(null);
    setSlipError(null);
  }

  async function handleSlip(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadSlip || !done) return;
    setSlipError(null);
    setSlipUploading(true);
    const fd = new FormData();
    fd.append("slip", file);
    const res = await uploadSlip(done.orderNo, fd);
    setSlipUploading(false);
    if (res.ok) setSlipUrl(res.url);
    else setSlipError(res.error);
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (done) {
    const phone = cust.phone.replace(/[^0-9]/g, "").replace(/^0/, "856");
    const msg = `ສະບາຍດີ 🙏 ນີ້ແມ່ນລິ້ງຊຳລະເງິນອໍເດີ ${done.orderNo} ຍອດ ${formatKip(done.total)}:\n${done.link}`;
    const wa = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    const line = `https://line.me/R/msg/text/?${encodeURIComponent(msg)}`;
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-2xl text-white">✓</div>
        <h3 className="mt-3 text-lg font-bold text-gray-900">ສ້າງອໍເດີ {done.orderNo} ສຳເລັດ</h3>
        <p className="mt-1 text-sm text-gray-500">ຍອດຊຳລະ <span className="font-bold text-price">{formatKip(done.total)}</span></p>

        {paymentMethod === "transfer" && (
          <>
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-left">
              <input readOnly value={done.link} className="min-w-0 flex-1 bg-transparent px-2 text-xs text-gray-600 outline-none" />
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(done.link); setCopied(true); }}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold text-white ${copied ? "bg-emerald-600" : "bg-slate-800"}`}
              >
                {copied ? "ກ໋ອບປີ້ແລ້ວ" : "ກ໋ອບປີ້"}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={wa} target="_blank" rel="noreferrer" className="rounded-lg bg-[#25D366] py-2.5 text-sm font-bold text-white">💬 ສົ່ງ WhatsApp</a>
              <a href={line} target="_blank" rel="noreferrer" className="rounded-lg bg-[#06C755] py-2.5 text-sm font-bold text-white">🟢 ສົ່ງ LINE</a>
            </div>

            {uploadSlip && (
              <div className="mt-4 border-t border-dashed border-gray-200 pt-4 text-left">
                <span className="mb-2 block text-xs font-bold text-gray-500">ແນບສະລິບການໂອນ (ຖ້າລູກຄ້າໂອນແລ້ວ)</span>
                {slipUrl ? (
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slipUrl} alt="slip" className="h-14 w-14 rounded object-cover" />
                    <span className="flex-1 text-xs font-bold text-emerald-700">ແນບສະລິບແລ້ວ ✓</span>
                    <label className="shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600">
                      ປ່ຽນ<input type="file" accept="image/*" onChange={handleSlip} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-3 text-xs font-bold text-slate-500 hover:border-brand hover:text-brand-dark ${slipUploading ? "opacity-60" : ""}`}>
                    {slipUploading ? "ກຳລັງອັບໂຫຼດ..." : "📎 ເລືອກຮູບສະລິບ"}
                    <input type="file" accept="image/*" onChange={handleSlip} disabled={slipUploading} className="hidden" />
                  </label>
                )}
                {slipError && <p className="mt-1 text-[11px] font-semibold text-rose-600">{slipError}</p>}
              </div>
            )}
          </>
        )}
        {paymentMethod === "cod" && (
          <p className="mt-4 rounded-lg bg-orange-50 px-3 py-2.5 text-sm font-medium text-orange-700">ເກັບເງິນປາຍທາງ — ເກັບເງິນສົດເມື່ອຈັດສົ່ງ</p>
        )}

        <button type="button" onClick={reset} className="mt-5 text-sm font-bold text-brand-dark hover:underline">+ ສ້າງອໍເດີໃໝ່</button>
      </div>
    );
  }

  const inp = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";
  const card = "rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5";
  const step = (n: string, t: string) => (
    <div className="mb-3 flex items-center gap-2">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-xs font-black text-white">{n}</span>
      <h2 className="text-sm font-bold text-gray-900">{t}</h2>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      {/* LEFT: customer + products */}
      <div className="space-y-4">
        {/* Customer */}
        <div className={card}>
          {step("1", "ລູກຄ້າ")}
          {selectedCustomer ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-emerald-800">{selectedCustomer.name}</div>
                <div className="text-xs text-emerald-700">
                  {selectedCustomer.source === "erp" ? selectedCustomer.code : "ລູກຄ້າເວັບ"} · {selectedCustomer.phone || "ບໍ່ມີເບີໂທ"}
                </div>
              </div>
              <button type="button" onClick={clearCustomer} className="shrink-0 text-xs font-bold text-emerald-700 hover:underline">ປ່ຽນ</button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={customerQuery}
                onChange={(e) => runCustomerSearch(e.target.value)}
                placeholder="ຄົ້ນຫາລູກຄ້າເກົ່າ (ຊື່ / ເບີໂທ / ລະຫັດ) ຫຼື ພິມຂ້າງລຸ່ມສ້າງໃໝ່"
                className={inp}
              />
              {customerHits.length > 0 && (
                <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-xl">
                  {customerHits.map((c) => (
                    <button key={c.code} type="button" onClick={() => chooseCustomer(c)} className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-orange-50">
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
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} placeholder="ຊື່ລູກຄ້າ *" className={inp} />
            <input value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} inputMode="tel" placeholder="ເບີໂທ *" className={inp} />
          </div>
          <div className="mt-3">
            <span className="mb-1.5 block text-xs font-semibold text-gray-500">ທີ່ຢູ່ສົ່ງເຄື່ອງ *</span>
            {savedAddrs.length > 0 && (
              <div className="mb-2 space-y-2">
                {savedAddrs.map((a) => (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer gap-2.5 rounded-lg border p-2.5 transition ${addrChoice === String(a.id) ? "border-brand bg-brand-light/40" : "border-gray-200 hover:border-brand/40"}`}
                  >
                    <input type="radio" name="ob-addr" checked={addrChoice === String(a.id)} onChange={() => pickSavedAddr(a)} className="mt-0.5 h-4 w-4 accent-orange-500" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800">{a.recipient || cust.name || "ຜູ້ຮັບ"}</span>
                        {a.isDefault && <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold text-orange-600">ຄ່າເລີ່ມຕົ້ນ</span>}
                      </span>
                      {a.phone && <span className="block text-xs text-gray-400">{a.phone}</span>}
                      <span className="block text-xs leading-relaxed text-gray-500">{a.label}</span>
                    </span>
                  </label>
                ))}
                <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition ${addrChoice === NEW_ADDR ? "border-brand bg-brand-light/40" : "border-gray-200 hover:border-brand/40"}`}>
                  <input type="radio" name="ob-addr" checked={addrChoice === NEW_ADDR} onChange={() => { setAddrChoice(NEW_ADDR); setAddress(EMPTY_ADDRESS); }} className="h-4 w-4 accent-orange-500" />
                  <span className="text-sm font-semibold text-gray-600">+ ໃຊ້ທີ່ຢູ່ໃໝ່</span>
                </label>
              </div>
            )}
            {addrChoice === NEW_ADDR && <AddressFields value={address} onChange={setAddress} />}
          </div>
        </div>

        {/* Products */}
        <div className={card}>
          {step("2", "ສິນຄ້າ")}
          <div className="relative">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
            <input value={q} onChange={(e) => runSearch(e.target.value)} placeholder="ຄົ້ນຫາສິນຄ້າເພື່ອເພີ່ມ (ຊື່ / ລະຫັດ)" className={`${inp} pl-9`} />
            {(hits.length > 0 || (q && !searching)) && (
              <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-xl">
                {hits.map((h) => (
                  <button key={h.code} type="button" onClick={() => add(h)} disabled={h.price == null} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-orange-50 disabled:opacity-40">
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm font-medium text-gray-800">{h.name}</span>
                      <span className="text-xs text-gray-400">{h.code}{h.stock <= 0 && <span className="ml-1 text-rose-400">· ໝົດ</span>}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-price">{h.price == null ? "—" : formatKip(h.price)}</span>
                  </button>
                ))}
                {q && !searching && hits.length === 0 && <p className="px-3 py-3 text-center text-xs text-gray-400">ບໍ່ພົບສິນຄ້າ</p>}
              </div>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {lines.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 px-3 py-8 text-center text-xs text-gray-400">ຍັງບໍ່ມີສິນຄ້າ — ຄົ້ນຫາ ແລ້ວກົດເພີ່ມ</div>
            )}
            {lines.map((l) => (
              <div key={l.code} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2">
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-medium text-gray-800">{l.name}</div>
                  <div className="text-[11px] text-gray-400">{formatKip(l.price)}{l.unit ? ` / ${l.unit}` : ""}</div>
                </div>
                <div className="flex shrink-0 items-center rounded-lg border border-gray-200 bg-white">
                  <button type="button" onClick={() => setQty(l.code, l.qty - 1)} className="grid h-8 w-8 place-items-center text-gray-500 hover:text-brand">−</button>
                  <input
                    value={l.qty}
                    onChange={(e) => setQty(l.code, Math.max(0, parseInt(e.target.value || "0", 10) || 0))}
                    className="w-10 border-x border-gray-200 bg-transparent py-1.5 text-center text-sm font-bold outline-none"
                  />
                  <button type="button" onClick={() => setQty(l.code, l.qty + 1)} className="grid h-8 w-8 place-items-center text-gray-500 hover:text-brand">+</button>
                </div>
                <div className="w-24 shrink-0 text-right text-sm font-bold text-gray-800">{formatKip(l.price * l.qty)}</div>
                <button type="button" onClick={() => setQty(l.code, 0)} className="shrink-0 px-1 text-gray-300 hover:text-rose-500" aria-label="ລຶບ">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: summary (sticky) */}
      <div className="h-fit space-y-4 lg:sticky lg:top-6">
        <div className={card}>
          {step("3", "ການຊຳລະ & ສົ່ງ")}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPaymentMethod("transfer")} className={`rounded-lg border px-3 py-2.5 text-sm font-bold transition ${paymentMethod === "transfer" ? "border-brand bg-brand-light text-brand-dark" : "border-gray-200 text-gray-500"}`}>🏦 ໂອນ</button>
            <button type="button" onClick={() => setPaymentMethod("cod")} className={`rounded-lg border px-3 py-2.5 text-sm font-bold transition ${paymentMethod === "cod" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-500"}`}>💵 ເກັບປາຍທາງ</button>
          </div>

          <div className="mt-3">
            <span className="mb-1.5 block text-xs font-semibold text-gray-500">ບໍລິສັດຂົນສົ່ງ</span>
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_TRANSPORTS.map((t) => (
                <label key={t.code} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition ${transport === t.code ? "border-orange-400 bg-orange-50" : "border-gray-200"}`}>
                  <input type="radio" name="ob-transport" checked={transport === t.code} onChange={() => setTransport(t.code)} className="h-4 w-4 accent-orange-500" />
                  <span className="text-xs font-bold text-gray-800">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {salespeople.length > 0 && (
            <div className="mt-3">
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">ພະນັກງານຂາຍ</span>
              <select
                value={saleCode}
                onChange={(e) => setSaleCode(e.target.value)}
                className={inp}
              >
                {/* Ensure the default (logged-in admin) is selectable even if not
                    present in the list. */}
                {defaultSaleCode && !salespeople.some((s) => s.code === defaultSaleCode) && (
                  <option value={defaultSaleCode}>{defaultSaleCode} (ຂ້ອຍ)</option>
                )}
                {salespeople.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}{s.code === defaultSaleCode ? " (ຂ້ອຍ)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <input value={cust.voucherCode} onChange={(e) => setCust({ ...cust, voucherCode: e.target.value.toUpperCase() })} placeholder="ໂຄ້ດສ່ວນຫຼຸດ (ຖ້າມີ)" className={`${inp} mt-3 uppercase`} />
          <textarea value={cust.note} onChange={(e) => setCust({ ...cust, note: e.target.value })} rows={2} placeholder="ໝາຍເຫດ (ບໍ່ບັງຄັບ)" className={`${inp} mt-2 resize-none`} />
        </div>

        <div className={card}>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500"><span>ສິນຄ້າ ({totalQty})</span><span className="font-medium text-gray-700">{formatKip(subtotal)}</span></div>
            <div className="flex justify-between text-gray-500"><span>ຄ່າຂົນສົ່ງ</span><span className="font-medium text-gray-700">{shippingFee === 0 ? "ຟຣີ" : formatKip(shippingFee)}</span></div>
            <div className="flex items-baseline justify-between border-t border-gray-100 pt-2">
              <span className="font-bold text-gray-900">ລວມທັງໝົດ</span>
              <span className="text-2xl font-black text-price">{formatKip(total)}</span>
            </div>
          </div>
          {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={pending || lines.length === 0}
            className="mt-3 w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:bg-gray-200 disabled:text-gray-400"
          >
            {pending ? "ກຳລັງສ້າງ..." : paymentMethod === "transfer" ? "ສ້າງອໍເດີ + ລິ້ງຊຳລະ" : "ສ້າງອໍເດີ (ເກັບປາຍທາງ)"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Best-effort: split a free-text Lao address into province/district/village/detail.
function parseLaoAddress(addressStr: string | null): AddressFormValue {
  if (!addressStr) return EMPTY_ADDRESS;
  let province = "";
  let district = "";
  let village = "";
  for (const prov of LAO_PROVINCES) {
    if (addressStr.includes(prov.name)) {
      province = prov.name;
      for (const dist of prov.districts) {
        if (addressStr.includes(dist)) {
          district = dist;
          break;
        }
      }
      break;
    }
  }
  const villageMatch = addressStr.match(/(?:ບ້ານ|ban)\s*([^\s,，]+)/i);
  if (villageMatch?.[1]) village = villageMatch[1].trim();

  let detail = addressStr;
  if (province) detail = detail.replace(new RegExp(`ແຂວງ\\s*${province}|${province}`, "g"), "");
  if (district) detail = detail.replace(new RegExp(`ເມືອງ\\s*${district}|${district}`, "g"), "");
  if (village) detail = detail.replace(new RegExp(`ບ້ານ\\s*${village}|${village}`, "g"), "");
  detail = detail.replace(/^[\s,，.-]+|[\s,，.-]+$/g, "").replace(/\s*[,，]\s*/g, ", ").trim();

  return { recipient: "", phone: "", province, district, village, detail: detail || addressStr };
}
