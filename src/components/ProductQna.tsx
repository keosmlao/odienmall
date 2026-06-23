"use client";

import { useState, useTransition } from "react";
import { askProductQuestion, refreshQuestions } from "@/app/(shop)/product/[code]/qna-actions";

interface Q {
  id: number;
  customerName: string;
  question: string;
  answer: string | null;
  createdAt: string;
}

export default function ProductQna({
  productCode,
  initial,
  loggedIn,
}: {
  productCode: string;
  initial: Q[];
  loggedIn: boolean;
}) {
  const [list, setList] = useState<Q[]>(initial);
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function submit() {
    const text = q.trim();
    if (!text) return;
    setMsg(null);
    startTransition(async () => {
      const res = await askProductQuestion(productCode, text);
      if (res.ok) {
        setQ("");
        setMsg("ສົ່ງຄຳຖາມແລ້ວ — ຮ້ານຈະຕອບໄວໆນີ້");
        setList(await refreshQuestions(productCode));
      } else {
        setMsg(res.error);
      }
    });
  }

  return (
    <div className="mt-5 rounded-sm border border-slate-100 bg-white p-5 shadow-sm md:p-6">
      <h2 className="mb-4 border-l-4 border-orange-500 pl-3 text-lg font-bold text-slate-900">ຖາມ-ຕອບ ກ່ຽວກັບສິນຄ້າ</h2>

      {/* Ask box */}
      {loggedIn ? (
        <div className="mb-5 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="ມີຄຳຖາມກ່ຽວກັບສິນຄ້ານີ້ບໍ?"
            className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={submit}
            disabled={pending || !q.trim()}
            className="shrink-0 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            ຖາມ
          </button>
        </div>
      ) : (
        <p className="mb-5 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
          <a href="/login" className="font-semibold text-brand-dark hover:underline">ເຂົ້າສູ່ລະບົບ</a> ເພື່ອຖາມຄຳຖາມ
        </p>
      )}
      {msg && <p className="mb-4 text-sm text-emerald-600">{msg}</p>}

      {/* Answered list */}
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">ຍັງບໍ່ມີຄຳຖາມ — ເປັນຄົນທຳອິດ!</p>
      ) : (
        <div className="space-y-4">
          {list.map((item) => (
            <div key={item.id} className="border-b border-slate-50 pb-4 last:border-0">
              <div className="flex gap-2 text-sm">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-500">Q</span>
                <p className="font-medium text-slate-700">{item.question}</p>
              </div>
              {item.answer && (
                <div className="mt-2 flex gap-2 rounded-lg bg-orange-50/60 p-3 text-sm">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-orange-500 text-[11px] font-bold text-white">A</span>
                  <p className="text-slate-700">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
