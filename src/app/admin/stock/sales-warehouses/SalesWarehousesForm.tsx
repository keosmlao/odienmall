"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSalesWarehousesAction } from "./actions";
import type { Warehouse } from "@/lib/inventory-stock";

export default function SalesWarehousesForm({
  warehouses,
  selected,
}: {
  warehouses: Warehouse[];
  selected: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<Set<string>>(new Set(selected));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function toggle(code: string) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(code)) n.delete(code); else n.add(code);
      return n;
    });
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveSalesWarehousesAction([...picked]);
      setMsg(res.ok ? { ok: true, text: "ບັນທຶກສຳເລັດ ✓" } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
        ເລືອກສາງທີ່ໃຊ້ສຳລັບການຂາຍ online. ຖ້າ <b>ບໍ່ເລືອກ</b> ເລີຍ = ໃຊ້ໄດ້ <b>ທຸກສາງ</b> (ຄ່າເລີ່ມຕົ້ນ).
        ເມື່ອເລືອກແລ້ວ ຕອນ ອອກບິນ ຈະສະແດງສະເພາະສາງເຫຼົ່ານີ້.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {warehouses.map((w) => {
          const on = picked.has(w.code);
          return (
            <button key={w.code} type="button" onClick={() => toggle(w.code)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                on ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white hover:border-slate-600"}`}>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${on ? "border-orange-500 bg-orange-500 text-white" : "border-slate-600"}`}>
                {on && "✓"}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-900">{w.name}</span>
                <span className="block text-[11px] text-slate-500">{w.code}</span>
              </span>
            </button>
          );
        })}
      </div>

      {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{msg.text}</p>}

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending}
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60">
          {pending ? "ກຳລັງບັນທຶກ…" : "ບັນທຶກ"}
        </button>
        <span className="text-xs text-slate-500">{picked.size === 0 ? "ທຸກສາງ" : `${picked.size} ສາງ`}</span>
      </div>
    </div>
  );
}
