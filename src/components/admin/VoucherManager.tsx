"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatKip } from "@/lib/format";
import type { Voucher } from "@/lib/vouchers";
import { saveVoucher, toggleVoucher, removeVoucher } from "@/app/admin/vouchers/actions";
import { Badge, EmptyState, TableShell, THEAD, TH, TBODY, TR, TD } from "@/components/admin/ui";

const EMPTY = {
  id: 0,
  code: "",
  kind: "percent" as "percent" | "amount",
  value: "",
  minSubtotal: "",
  maxDiscount: "",
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  perCustomerLimit: "1",
  note: "",
  active: true,
};
type FormState = typeof EMPTY;

function toForm(v: Voucher): FormState {
  const d = (s: string | null) => (s ? s.slice(0, 10) : "");
  return {
    id: v.id,
    code: v.code,
    kind: v.kind,
    value: String(v.value),
    minSubtotal: v.minSubtotal ? String(v.minSubtotal) : "",
    maxDiscount: v.maxDiscount != null ? String(v.maxDiscount) : "",
    startsAt: d(v.startsAt),
    expiresAt: d(v.expiresAt),
    usageLimit: v.usageLimit != null ? String(v.usageLimit) : "",
    perCustomerLimit: String(v.perCustomerLimit),
    note: v.note ?? "",
    active: v.active,
  };
}

export default function VoucherManager({ vouchers }: { vouchers: Voucher[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const editing = form.id > 0;

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function reset() {
    setForm(EMPTY);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    if (editing) fd.set("id", String(form.id));
    fd.set("code", form.code);
    fd.set("kind", form.kind);
    fd.set("value", form.value);
    fd.set("minSubtotal", form.minSubtotal);
    fd.set("maxDiscount", form.maxDiscount);
    fd.set("startsAt", form.startsAt);
    fd.set("expiresAt", form.expiresAt);
    fd.set("usageLimit", form.usageLimit);
    fd.set("perCustomerLimit", form.perCustomerLimit);
    fd.set("note", form.note);
    if (form.active) fd.set("active", "1");
    startTransition(async () => {
      const res = await saveVoucher(fd);
      if (res.ok) {
        reset();
        router.refresh();
      } else setError(res.error);
    });
  }

  function toggle(v: Voucher) {
    startTransition(async () => {
      await toggleVoucher(v.id, !v.active);
      router.refresh();
    });
  }
  function del(v: Voucher) {
    if (!confirm(`ລົບໂຄ້ດ ${v.code}?`)) return;
    startTransition(async () => {
      await removeVoucher(v.id);
      router.refresh();
    });
  }

  const inp = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm disabled:opacity-50 disabled:bg-slate-50";
  const lbl = "block text-[10px] font-black uppercase tracking-wider text-slate-450 mb-1.5";

  return (
    <div className="grid gap-6 lg:grid-cols-12 items-start">
      {/* Create/Edit Form Container (4 columns) */}
      <form onSubmit={submit} className="lg:col-span-4 h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black text-slate-800 leading-tight">
            {editing ? `ແກ້ໄຂໂຄ້ດ ${form.code}` : "ສ້າງໂຄ້ດສ່ວນຫຼຸດໃໝ່"}
          </h2>
        </div>
        
        <div>
          <label className={lbl}>ໂຄ້ດ *</label>
          <input
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            className={`${inp} font-mono uppercase tracking-wider`}
            placeholder="SALE10"
            required
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={lbl}>ປະເພດ</label>
            <select
              value={form.kind}
              onChange={(e) => set("kind", e.target.value as "percent" | "amount")}
              className={`${inp} cursor-pointer`}
            >
              <option value="percent">ເປີເຊັນ %</option>
              <option value="amount">ຈຳນວນ ₭</option>
            </select>
          </div>
          <div>
            <label className={lbl}>ມູນຄ່າ *</label>
            <input
              type="number"
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
              className={inp}
              min={1}
              required
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={lbl}>ຍອດຂັ້ນຕ່ຳ K</label>
            <input
              type="number"
              value={form.minSubtotal}
              onChange={(e) => set("minSubtotal", e.target.value)}
              className={inp}
              min={0}
              placeholder="0 K"
            />
          </div>
          {form.kind === "percent" ? (
            <div>
              <label className={lbl}>ສ່ວນຫຼຸດສູງສຸດ K</label>
              <input
                type="number"
                value={form.maxDiscount}
                onChange={(e) => set("maxDiscount", e.target.value)}
                className={inp}
                min={0}
                placeholder="ບໍ່ຈຳກັດ"
              />
            </div>
          ) : (
            <div className="opacity-45">
              <label className={lbl}>ສ່ວນຫຼຸດສູງສຸດ K</label>
              <input
                type="text"
                disabled
                className={`${inp} bg-slate-50 cursor-not-allowed`}
                placeholder="ສະເພາະເປີເຊັນ"
              />
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={lbl}>ວັນທີເລີ່ມ</label>
            <input
              type="date"
              value={form.startsAt}
              onChange={(e) => set("startsAt", e.target.value)}
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>ວັນໝົດອາຍຸ</label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => set("expiresAt", e.target.value)}
              className={inp}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={lbl}>ຈຳນວນສິດ (ວ່າງ=ບໍ່ຈຳກັດ)</label>
            <input
              type="number"
              value={form.usageLimit}
              onChange={(e) => set("usageLimit", e.target.value)}
              className={inp}
              min={1}
              placeholder="ບໍ່ຈຳກັດ"
            />
          </div>
          <div>
            <label className={lbl}>ສິດ/ຄົນ (0=ບໍ່ຈຳກັດ)</label>
            <input
              type="number"
              value={form.perCustomerLimit}
              onChange={(e) => set("perCustomerLimit", e.target.value)}
              className={inp}
              min={0}
            />
          </div>
        </div>

        {/* Toggle option */}
        <div className="pt-1 flex items-center gap-2">
          <input
            type="checkbox"
            id="active-check"
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
            className="h-4.5 w-4.5 rounded border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer shadow-xs"
          />
          <label htmlFor="active-check" className="text-xs font-bold text-slate-650 cursor-pointer select-none">
            ເປີດໃຊ້ງານຄູປ໋ອງນີ້
          </label>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-100 p-2.5 text-xs font-bold text-rose-600 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={pending}
            className="flex-1 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-black text-white shadow-sm shadow-orange-500/10 hover:shadow-md hover:shadow-orange-500/20 active:scale-98 transition-all duration-200 disabled:opacity-60 cursor-pointer"
          >
            {pending ? "ກຳລັງບັນທຶກ..." : editing ? "ບັນທຶກ" : "ສ້າງຄູປ໋ອງ"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition shadow-xs cursor-pointer"
            >
              ຍົກເລີກ
            </button>
          )}
        </div>
      </form>

      {/* Coupons List Table Card (8 columns) */}
      <div className="lg:col-span-8">
        <TableShell minWidth={640}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>ໂຄ້ດ</th>
              <th className={TH}>ສ່ວນຫຼຸດ</th>
              <th className={`${TH} text-right`}>ໃຊ້ແລ້ວ</th>
              <th className={TH}>ໝົດອາຍຸ</th>
              <th className={`${TH} text-center w-28`}>ສະຖານະ</th>
              <th className={`${TH} text-right w-24`} />
            </tr>
          </thead>
          <tbody className={TBODY}>
            {vouchers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12">
                  <EmptyState
                    title="ຍັງບໍ່ມີໂຄ້ດສ່ວນຫຼຸດ"
                    hint="ສ້າງໂຄ້ດສ່ວນຫຼຸດໃໝ່ ໂດຍການປ້ອນຂໍ້ມູນໃນຟອມທາງດ້ານຊ້າຍມື"
                    icon="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </td>
              </tr>
            ) : (
              vouchers.map((v) => (
                <tr key={v.id} className={TR}>
                  <td className={`${TD} font-mono font-black text-slate-800 text-xs tracking-wider`}>{v.code}</td>
                  <td className={`${TD} text-slate-650 font-semibold text-xs`}>
                    {v.kind === "percent" ? (
                      <span className="inline-flex items-center rounded bg-orange-50 px-2 py-0.5 font-bold text-orange-700 ring-1 ring-inset ring-orange-200/50 shadow-2xs">
                        {v.value}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200/50 shadow-2xs">
                        {formatKip(v.value)}
                      </span>
                    )}
                    {v.minSubtotal > 0 && (
                      <span className="ml-2 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                        (ຂັ້ນຕ່ຳ {formatKip(v.minSubtotal)})
                      </span>
                    )}
                  </td>
                  <td className={`${TD} text-right text-slate-600 font-bold text-xs tabular-nums`}>
                    {v.usedCount}
                    {v.usageLimit != null ? (
                      <span className="text-slate-400 font-medium"> / {v.usageLimit}</span>
                    ) : (
                      <span className="text-slate-400 font-medium"> / ∞</span>
                    )}
                  </td>
                  <td className={`${TD} text-slate-500 font-semibold text-xs`}>
                    {v.expiresAt ? (
                      new Date(v.expiresAt).toLocaleDateString("lo-LA", { day: "2-digit", month: "2-digit", year: "numeric" })
                    ) : (
                      <span className="text-slate-400 font-bold">—</span>
                    )}
                  </td>
                  <td className={`${TD} text-center`}>
                    <button
                      onClick={() => toggle(v)}
                      disabled={pending}
                      className="cursor-pointer transition-all duration-200 transform active:scale-95 disabled:opacity-50"
                      title={v.active ? "ກົດເພື່ອປິດໃຊ້ງານ" : "ກົດເພື່ອເປີດໃຊ້ງານ"}
                    >
                      <Badge tone={v.active ? "green" : "gray"}>
                        {v.active ? "ເປີດໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
                      </Badge>
                    </button>
                  </td>
                  <td className={`${TD} text-right whitespace-nowrap text-xs`}>
                    <button
                      onClick={() => setForm(toForm(v))}
                      className="text-orange-600 hover:text-orange-700 hover:underline font-bold transition cursor-pointer"
                    >
                      ແກ້ໄຂ
                    </button>
                    <button
                      onClick={() => del(v)}
                      disabled={pending}
                      className="ml-4 text-rose-500 hover:text-rose-600 hover:underline font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      ລົບ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </TableShell>
      </div>
    </div>
  );
}
