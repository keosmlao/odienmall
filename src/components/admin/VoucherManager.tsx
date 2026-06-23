"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatKip } from "@/lib/format";
import type { Voucher } from "@/lib/vouchers";
import { saveVoucher, toggleVoucher, removeVoucher } from "@/app/admin/vouchers/actions";

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

  const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand";
  const lbl = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
      {/* Form */}
      <form onSubmit={submit} className="h-fit space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">{editing ? `ແກ້ໄຂ ${form.code}` : "ສ້າງໂຄ້ດໃໝ່"}</h2>
        <div>
          <label className={lbl}>ໂຄ້ດ *</label>
          <input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className={`${inp} font-mono uppercase`} placeholder="SALE10" required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl}>ປະເພດ</label>
            <select value={form.kind} onChange={(e) => set("kind", e.target.value as "percent" | "amount")} className={inp}>
              <option value="percent">ເປີເຊັນ %</option>
              <option value="amount">ຈຳນວນ ₭</option>
            </select>
          </div>
          <div>
            <label className={lbl}>ມູນຄ່າ *</label>
            <input type="number" value={form.value} onChange={(e) => set("value", e.target.value)} className={inp} min={1} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl}>ຍອດຂັ້ນຕ່ຳ ₭</label>
            <input type="number" value={form.minSubtotal} onChange={(e) => set("minSubtotal", e.target.value)} className={inp} min={0} />
          </div>
          {form.kind === "percent" && (
            <div>
              <label className={lbl}>ສ່ວນຫຼຸດສູງສຸດ ₭</label>
              <input type="number" value={form.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} className={inp} min={0} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl}>ເລີ່ມ</label>
            <input type="date" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>ໝົດອາຍຸ</label>
            <input type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} className={inp} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl}>ໃຊ້ໄດ້ລວມ (ວ່າງ=ບໍ່ຈຳກັດ)</label>
            <input type="number" value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} className={inp} min={1} />
          </div>
          <div>
            <label className={lbl}>ຕໍ່ລູກຄ້າ (0=ບໍ່ຈຳກັດ)</label>
            <input type="number" value={form.perCustomerLimit} onChange={(e) => set("perCustomerLimit", e.target.value)} className={inp} min={0} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
          ເປີດໃຊ້ງານ
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={pending} className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60">
            {pending ? "..." : editing ? "ບັນທຶກ" : "ສ້າງ"}
          </button>
          {editing && (
            <button type="button" onClick={reset} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100">
              ຍົກເລີກ
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm" style={{ minWidth: 640 }}>
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left">ໂຄ້ດ</th>
              <th className="px-4 py-3 text-left">ສ່ວນຫຼຸດ</th>
              <th className="px-4 py-3 text-right">ໃຊ້ແລ້ວ</th>
              <th className="px-4 py-3 text-left">ໝົດອາຍຸ</th>
              <th className="px-4 py-3 text-center">ສະຖານະ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vouchers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">ຍັງບໍ່ມີໂຄ້ດ</td></tr>
            )}
            {vouchers.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold text-gray-800">{v.code}</td>
                <td className="px-4 py-3 text-gray-600">
                  {v.kind === "percent" ? `${v.value}%` : formatKip(v.value)}
                  {v.minSubtotal > 0 && <span className="ml-1 text-xs text-gray-400">(ຂັ້ນຕ່ຳ {formatKip(v.minSubtotal)})</span>}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {v.usedCount}{v.usageLimit != null ? `/${v.usageLimit}` : ""}
                </td>
                <td className="px-4 py-3 text-gray-400">{v.expiresAt ? new Date(v.expiresAt).toLocaleDateString("lo-LA") : "—"}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggle(v)}
                    disabled={pending}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${v.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}
                  >
                    {v.active ? "ເປີດ" : "ປິດ"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => setForm(toForm(v))} className="text-brand-dark hover:underline">ແກ້ໄຂ</button>
                  <button onClick={() => del(v)} disabled={pending} className="ml-3 text-rose-500 hover:underline">ລົບ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
