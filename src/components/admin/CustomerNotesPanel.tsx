"use client";

import { useState, useTransition } from "react";
import type { CustomerNote, CustomerFlag } from "@/lib/customer-notes";

const FLAG_LABELS: Record<string, string> = {
  vip: "VIP",
  blocked: "ບລ໋ອກ",
  wholesale: "ຂາຍສົ່ງ",
};

const FLAG_COLORS: Record<string, string> = {
  vip: "bg-amber-100 text-amber-700",
  blocked: "bg-rose-100 text-rose-700",
  wholesale: "bg-blue-100 text-blue-700",
};

interface Props {
  customerCode: string;
  initial: CustomerNote[];
  addNote: (code: string, content: string, flag: CustomerFlag) => Promise<{ ok: boolean; note?: CustomerNote; error?: string }>;
  deleteNote: (id: number) => Promise<{ ok: boolean }>;
}

export default function CustomerNotesPanel({ customerCode, initial, addNote, deleteNote }: Props) {
  const [notes, setNotes] = useState<CustomerNote[]>(initial);
  const [text, setText] = useState("");
  const [flag, setFlag] = useState<CustomerFlag>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await addNote(customerCode, text.trim(), flag);
      if (res.ok && res.note) {
        setNotes((n) => [res.note!, ...n]);
        setText("");
        setFlag(null);
      }
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      const res = await deleteNote(id);
      if (res.ok) setNotes((n) => n.filter((x) => x.id !== id));
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex gap-2">
        <select
          value={flag ?? ""}
          onChange={(e) => setFlag((e.target.value as CustomerFlag) || null)}
          className="inp w-28 shrink-0 text-xs"
        >
          <option value="">ບໍ່ມີ</option>
          <option value="vip">VIP</option>
          <option value="blocked">ບລ໋ອກ</option>
          <option value="wholesale">ຂາຍສົ່ງ</option>
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="inp min-w-0 flex-1 text-sm"
          placeholder="ໝາຍເຫດ..."
          maxLength={500}
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="shrink-0 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          ເພີ່ມ
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="py-2 text-xs text-gray-400">ຍັງບໍ່ມີໝາຍເຫດ</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="group flex items-start justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <div className="flex-1">
                {n.flag && (
                  <span className={`mr-1.5 rounded px-1.5 py-0.5 text-xs font-semibold ${FLAG_COLORS[n.flag] ?? ""}`}>
                    {FLAG_LABELS[n.flag] ?? n.flag}
                  </span>
                )}
                {n.content}
                <span className="ml-2 text-xs text-gray-400">
                  {n.createdBy ? `${n.createdBy} · ` : ""}
                  {new Date(n.createdAt).toLocaleDateString("lo-LA")}
                </span>
              </div>
              <button
                onClick={() => remove(n.id)}
                className="shrink-0 text-gray-300 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                title="ລຶບ"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
