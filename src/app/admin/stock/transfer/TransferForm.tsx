"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchTransferItems, createTransferAction, type ItemHit } from "./actions";
import type { Warehouse } from "@/lib/inventory-stock";

interface Line { code: string; name: string; unit: string; qty: number }

export default function TransferForm({ warehouses }: { warehouses: Warehouse[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<"in" | "return">("in");
  const [whFrom, setWhFrom] = useState("");
  const [whTo, setWhTo] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ItemHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function doSearch(v: string) {
    setQ(v);
    if (v.trim().length < 2) { setHits([]); return; }
    setSearching(true);
    searchTransferItems(v).then(setHits).finally(() => setSearching(false));
  }
  
  function addLine(h: ItemHit) {
    if (lines.some((l) => l.code === h.code)) return;
    setLines((p) => [...p, { code: h.code, name: h.name, unit: h.unit, qty: 1 }]);
    setQ(""); setHits([]);
  }
  
  function setQty(code: string, qty: number) {
    setLines((p) => p.map((l) => (l.code === code ? { ...l, qty } : l)));
  }
  
  function adjustQty(code: string, delta: number) {
    setLines((p) => p.map((l) => {
      if (l.code === code) {
        return { ...l, qty: Math.max(1, l.qty + delta) };
      }
      return l;
    }));
  }

  function removeLine(code: string) {
    setLines((p) => p.filter((l) => l.code !== code));
  }

  function submit() {
    setMsg(null);
    if (!whFrom || !whTo) return setMsg({ ok: false, text: "ກະລຸນາເລືອກສາງຕົ້ນທາງ ແລະ ປາຍທາງ" });
    if (whFrom === whTo) return setMsg({ ok: false, text: "ສາງຕົ້ນທາງ ແລະ ປາຍທາງ ຕ້ອງບໍ່ຊ້ຳກັນ" });
    if (lines.length === 0) return setMsg({ ok: false, text: "ກະລຸນາເພີ່ມລາຍການສິນຄ້າຢ່າງໜ້ອຍ 1 ລາຍການ" });
    
    startTransition(async () => {
      const res = await createTransferAction({
        kind, whFrom, shelfFrom: "", whTo, shelfTo: "", note,
        lines: lines.map((l) => ({ itemCode: l.code, itemName: l.name, unitCode: l.unit, qty: l.qty })),
      });
      if (res.ok) {
        setMsg({ ok: true, text: `ສ້າງໃບຂໍໂອນສຳເລັດ: ${res.docNo}` });
        setLines([]); setWhFrom(""); setWhTo(""); setNote("");
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12 items-start">
      {/* Configuration Column (Left) */}
      <div className="lg:col-span-5 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3">
          ຕັ້ງຄ່າການໂອນສິນຄ້າ
        </h3>

        {/* Kind - sliding segmented toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">ປະເພດການໂອນ</label>
          <div className="relative flex rounded-xl bg-slate-100 p-1 border border-slate-200/50">
            {/* Sliding background */}
            <div 
              className={`absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm transition-all duration-300 ease-out ${
                kind === "return" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
              }`}
            />
            <button 
              type="button" 
              onClick={() => setKind("in")}
              className={`relative z-10 w-1/2 rounded-lg py-2 text-center text-xs font-black transition-colors duration-200 ${
                kind === "in" ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ໂອນມາສາງ (Request)
            </button>
            <button 
              type="button" 
              onClick={() => setKind("return")}
              className={`relative z-10 w-1/2 rounded-lg py-2 text-center text-xs font-black transition-colors duration-200 ${
                kind === "return" ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ໂອນຄືນ (Return)
            </button>
          </div>
        </div>

        {/* Warehouses Flow Pipeline */}
        <div className="relative flex flex-col gap-5 rounded-xl border border-slate-150 bg-slate-50/50 p-4">
          {/* Connecting line */}
          <div className="absolute left-[30px] top-[40px] bottom-[40px] w-0.5 border-l-2 border-dashed border-slate-200" />
          
          {/* Source Warehouse Select */}
          <div className="relative flex items-start gap-3">
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-bold text-xs shadow-sm transition-all duration-300 ${
              whFrom ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white border-slate-150 text-slate-400"
            }`}>
              1
            </div>
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                ສາງຕົ້ນທາງ (From)
              </label>
              <select 
                value={whFrom} 
                onChange={(e) => setWhFrom(e.target.value)} 
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm"
              >
                <option value="">— ເລືອກສາງຕົ້ນທາງ —</option>
                {warehouses.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} · {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Flow Direction Indicator */}
          <div className="absolute left-[20.5px] top-1/2 -translate-y-1/2 z-10 flex h-[21px] w-[21px] items-center justify-center rounded-full border border-slate-150 bg-white shadow-sm">
            <svg 
              className={`h-3 w-3 transition-all duration-500 ${
                kind === "return" ? "rotate-180 text-rose-500" : "text-orange-500"
              }`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={4.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>

          {/* Destination Warehouse Select */}
          <div className="relative flex items-start gap-3">
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-bold text-xs shadow-sm transition-all duration-300 ${
              whTo ? "bg-orange-50 border-orange-200 text-orange-700 font-extrabold" : "bg-white border-slate-150 text-slate-400"
            }`}>
              2
            </div>
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">
                ສາງປາຍທາງ (To)
              </label>
              <select 
                value={whTo} 
                onChange={(e) => setWhTo(e.target.value)} 
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm"
              >
                <option value="">— ເລືອກສາງປາຍທາງ —</option>
                {warehouses.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} · {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Note remarks */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">ໝາຍເຫດ (ບໍ່ບັງຄັບ)</label>
          <textarea 
            value={note} 
            onChange={(e) => setNote(e.target.value)} 
            placeholder="ເພີ່ມລາຍລະອຽດ ຫຼື ຂໍ້ຄວາມເພີ່ມເຕີມ..." 
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm resize-none" 
          />
        </div>

        {/* Messages */}
        {msg && (
          <div className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed transition-all duration-300 ${
            msg.ok 
              ? "border-emerald-250 bg-emerald-50 text-emerald-800" 
              : "border-rose-250 bg-rose-50 text-rose-800"
          }`}>
            {msg.ok ? (
              <svg className="h-4.5 w-4.5 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-4.5 w-4.5 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="font-bold">{msg.text}</span>
          </div>
        )}

        {/* Submit button */}
        <button 
          type="button" 
          onClick={submit} 
          disabled={pending}
          className="relative flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 text-sm font-black text-white shadow-md shadow-orange-500/20 transition-all duration-200 hover:from-orange-600 hover:to-amber-600 hover:shadow-lg disabled:opacity-60 disabled:pointer-events-none active:scale-[0.98]"
        >
          {pending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              ກຳລັງສ້າງ...
            </>
          ) : (
            <>
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              ສ້າງໃບຂໍໂອນ
            </>
          )}
        </button>
      </div>

      {/* Item Selector & Table Column (Right) */}
      <div className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm min-h-[350px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <span>ລາຍການສິນຄ້າທີ່ເລືອກ</span>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-black text-slate-600 shadow-sm">
              {lines.length}
            </span>
          </h3>
        </div>

        {/* Search bar input */}
        <div className="relative mb-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4.5 w-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            value={q} 
            onChange={(e) => doSearch(e.target.value)} 
            placeholder="ຄົ້ນຫາ ລະຫັດບາໂຄດ ຫຼື ຊື່ສິນຄ້າ..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-bold text-slate-900 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm" 
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-slate-400 font-bold">
              <svg className="animate-spin h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
          
          {/* Autocomplete hits popover */}
          {hits.length > 0 && (
            <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl thin-scroll">
              {hits.map((h) => (
                <button 
                  key={h.code} 
                  type="button" 
                  onClick={() => addLine(h)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50 transition active:bg-slate-100"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-800">{h.name}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-slate-400">{h.code}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {h.unit && (
                      <span className="rounded bg-slate-150 px-1.5 py-0.5 text-[9px] font-black text-slate-500 uppercase">
                        {h.unit}
                      </span>
                    )}
                    <span className="rounded bg-orange-50 border border-orange-100 px-2 py-1 text-[9px] font-black text-orange-600 transition hover:bg-orange-100">
                      + ເພີ່ມ
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Lines List */}
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 border-2 border-dashed border-slate-100 rounded-xl py-12 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-400 mb-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-xs font-black text-slate-700">ຍັງບໍ່ມີລາຍການສິນຄ້າ</p>
            <p className="mt-1 text-[11px] text-slate-400 font-semibold max-w-[260px] leading-relaxed">
              ຄົ້ນຫາ ແລະ ເລືອກສິນຄ້າທີ່ຕ້ອງການໂອນ ໂດຍການໃຊ້ຊ່ອງຄົ້ນຫາດ້ານເທິງ
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto max-h-[400px] border border-slate-150 rounded-xl thin-scroll shadow-inner">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-150 bg-white">
                {lines.map((l, index) => (
                  <tr key={l.code} className="hover:bg-slate-50/50 transition">
                    {/* Index & Product Info */}
                    <td className="px-3 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 w-4 text-center">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-slate-800 leading-tight">
                            {l.name}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-[9px] font-semibold text-slate-400">
                              {l.code}
                            </span>
                            {l.unit && (
                              <span className="rounded bg-slate-100 px-1 py-0.2 text-[8px] font-bold text-slate-500 uppercase">
                                {l.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Custom Stepper quantity controller */}
                    <td className="px-3 py-3.5 align-middle w-32 shrink-0">
                      <div className="flex items-center justify-end">
                        <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 shadow-sm">
                          {/* Decrement Button */}
                          <button 
                            type="button" 
                            onClick={() => adjustQty(l.code, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded bg-white text-slate-500 hover:text-slate-850 hover:bg-slate-100 transition shadow-sm border border-slate-200/50 active:scale-95"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                          </button>
                          
                          {/* Quantity Input */}
                          <input 
                            type="number" 
                            min={1} 
                            value={l.qty} 
                            onChange={(e) => setQty(l.code, Math.max(1, Number(e.target.value)))}
                            className="w-10 border-0 bg-transparent text-center text-xs font-black text-slate-800 outline-none" 
                          />
                          
                          {/* Increment Button */}
                          <button 
                            type="button" 
                            onClick={() => adjustQty(l.code, 1)}
                            className="flex h-6 w-6 items-center justify-center rounded bg-white text-slate-500 hover:text-slate-850 hover:bg-slate-100 transition shadow-sm border border-slate-200/50 active:scale-95"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Delete Action */}
                    <td className="px-3 py-3.5 align-middle text-right w-12 shrink-0">
                      <button 
                        type="button" 
                        onClick={() => removeLine(l.code)} 
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="ລຶບອອກ"
                      >
                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
