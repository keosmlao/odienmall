"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatKip } from "@/lib/format";
import type { FlashDeal } from "@/lib/flash";
import { flashSearchProducts, saveFlashDeal, removeFlashDeal } from "@/app/admin/flash/actions";

interface Hit {
  code: string;
  name: string;
  price: number | null;
}

// 16-char local datetime string (yyyy-MM-ddTHH:mm) for the datetime-local input.
function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function FlashManager({ deals }: { deals: FlashDeal[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [picked, setPicked] = useState<Hit | null>(null);
  const [price, setPrice] = useState("");
  const [starts, setStarts] = useState(() => toLocalInput(new Date()));
  const [ends, setEnds] = useState(() => toLocalInput(new Date(Date.now() + 86400000)));
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  async function search() {
    if (!q.trim()) return;
    setHits(await flashSearchProducts(q));
  }
  function save() {
    setError(null);
    if (!picked || !Number(price)) {
      setError("ເລືອກສິນຄ້າ + ໃສ່ລາຄາ");
      return;
    }
    startTransition(async () => {
      const res = await saveFlashDeal({
        productCode: picked.code,
        salePrice: Number(price),
        startsAt: new Date(starts).toISOString(),
        endsAt: new Date(ends).toISOString(),
        active: true,
      });
      if (res.ok) {
        setPicked(null);
        setPrice("");
        setQ("");
        setHits([]);
        router.refresh();
      } else setError(res.error);
    });
  }
  function del(code: string) {
    startTransition(async () => {
      await removeFlashDeal(code);
      router.refresh();
    });
  }

  const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand";

  return (
    <div className="grid gap-5 lg:grid-cols-[24rem_1fr]">
      {/* Add form */}
      <div className="h-fit space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">ເພີ່ມ Flash Deal</h2>
        {picked ? (
          <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 text-sm">
            <span className="line-clamp-1 font-medium text-rose-700">{picked.name}</span>
            <button onClick={() => setPicked(null)} className="text-xs font-semibold text-rose-500">ປ່ຽນ</button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())} placeholder="ຄົ້ນຫາສິນຄ້າ" className={inp} />
              <button onClick={search} className="shrink-0 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">ຄົ້ນ</button>
            </div>
            {hits.length > 0 && (
              <div className="max-h-40 divide-y divide-gray-50 overflow-y-auto rounded-lg border border-gray-100">
                {hits.map((h) => (
                  <button key={h.code} onClick={() => { setPicked(h); setPrice(h.price ? String(Math.round(h.price * 0.9)) : ""); }} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50">
                    <span className="line-clamp-1">{h.name}</span>
                    <span className="shrink-0 text-gray-400">{h.price == null ? "—" : formatKip(h.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <div>
          <label className="mb-1 block text-xs text-gray-500">ລາຄາ Flash (₭)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={inp} min={1} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">ເລີ່ມ</label>
            <input type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">ສິ້ນສຸດ</label>
            <input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} className={inp} />
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button onClick={save} disabled={pending} className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {pending ? "..." : "ບັນທຶກ Deal"}
        </button>
      </div>

      {/* List */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full text-sm" style={{ minWidth: 560 }}>
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left">ສິນຄ້າ</th>
              <th className="px-4 py-3 text-right">ລາຄາ Flash</th>
              <th className="px-4 py-3 text-left">ໄລຍະ</th>
              <th className="px-4 py-3 text-center">ສະຖານະ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {deals.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">ຍັງບໍ່ມີ deal</td></tr>}
            {deals.map((d) => {
              const live = d.active && Date.parse(d.startsAt) <= now && Date.parse(d.endsAt) > now;
              const ended = Date.parse(d.endsAt) <= now;
              return (
                <tr key={d.productCode} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-700">{d.productCode}</td>
                  <td className="px-4 py-3 text-right font-bold text-price">{formatKip(d.salePrice)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(d.startsAt).toLocaleDateString("lo-LA")} → {new Date(d.endsAt).toLocaleString("lo-LA", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${live ? "bg-rose-100 text-rose-600" : ended ? "bg-gray-200 text-gray-500" : "bg-amber-100 text-amber-700"}`}>
                      {live ? "ກຳລັງ Flash" : ended ? "ໝົດແລ້ວ" : "ລໍຖ້າ"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => del(d.productCode)} disabled={pending} className="text-rose-500 hover:underline">ລົບ</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
