"use client";

import { useState, useTransition } from "react";
import { addAdminOrderNote, deleteAdminOrderNote } from "@/app/admin/actions";
import type { OrderNote } from "@/lib/order-notes";

export default function OrderNotesPanel({
  orderNo,
  initial,
}: {
  orderNo: string;
  initial: OrderNote[];
}) {
  const [notes, setNotes] = useState(initial);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    start(async () => {
      const res = await addAdminOrderNote(orderNo, text.trim());
      if (res.ok && res.note) {
        setNotes((prev) => [res.note!, ...prev]);
        setText("");
      }
    });
  }

  function del(id: number) {
    start(async () => {
      await deleteAdminOrderNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="ໝາຍເຫດພາຍໃນ (ບໍ່ສະແດງລູກຄ້າ)..."
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 resize-none"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="self-end rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-600 disabled:opacity-40"
        >
          ບັນທຶກ
        </button>
      </form>
      {notes.length > 0 && (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {notes.map((n) => (
            <li key={n.id} className="group rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs">
              <p className="text-slate-700 leading-relaxed">{n.content}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {n.createdBy ?? "admin"} · {new Date(n.createdAt).toLocaleString("lo-LA", { dateStyle: "short", timeStyle: "short" })}
                </span>
                <button
                  onClick={() => del(n.id)}
                  disabled={pending}
                  className="text-[10px] text-red-400 opacity-0 transition group-hover:opacity-100 hover:text-red-600"
                >
                  ລຶບ
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
