"use client";

import { useState, useTransition } from "react";
import { saveWebGroups } from "./actions";

interface GroupOption {
  code: string;
  name: string;
  count: number;
  enabled: boolean;
}

// Toggle which ERP product groups (group_main) are sold on the web. Checked
// groups appear in the storefront + admin product list; unchecked are hidden.
export default function WebGroupsForm({ options }: { options: GroupOption[] }) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(options.filter((o) => o.enabled).map((o) => o.code)),
  );
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(code: string) {
    setMsg(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveWebGroups([...selected]);
      setMsg(res.ok ? "✓ ບັນທຶກແລ້ວ" : res.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const on = selected.has(o.code);
          return (
            <label
              key={o.code}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                on ? "border-orange-300 bg-orange-50/50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input type="checkbox" checked={on} onChange={() => toggle(o.code)} className="h-4 w-4 accent-orange-500" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-800">{o.name}</div>
                <div className="text-[11px] text-slate-400">ກຸ່ມ {o.code} · {o.count.toLocaleString()} ສິນຄ້າ</div>
              </div>
            </label>
          );
        })}
      </div>

      {selected.size === 0 && (
        <p className="text-xs font-semibold text-rose-600">⚠️ ບໍ່ເລືອກກຸ່ມໃດເລີຍ = ຮ້ານຈະບໍ່ມີສິນຄ້າສະແດງ</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
        >
          {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
        </button>
        {msg && <span className="text-xs font-semibold text-slate-500">{msg}</span>}
      </div>
    </div>
  );
}
