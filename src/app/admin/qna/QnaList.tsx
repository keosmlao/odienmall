"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProductQuestion } from "@/lib/qna";
import { Badge, EmptyState } from "@/components/admin/ui";
import QnaAnswer from "@/components/admin/QnaAnswer";

export default function QnaList({ questions }: { questions: ProductQuestion[] }) {
  const [tab, setTab] = useState<"all" | "pending" | "answered" | "hidden">("all");

  const filtered = questions.filter((q) => {
    if (tab === "pending") return !q.answer && !q.isHidden;
    if (tab === "answered") return !!q.answer && !q.isHidden;
    if (tab === "hidden") return q.isHidden;
    return true; // "all"
  });

  const counts = {
    all: questions.length,
    pending: questions.filter((q) => !q.answer && !q.isHidden).length,
    answered: questions.filter((q) => !!q.answer && !q.isHidden).length,
    hidden: questions.filter((q) => q.isHidden).length,
  };

  const tabs = [
    { id: "all", label: "ທັງໝົດ", count: counts.all },
    { id: "pending", label: "ລໍຖ້າຕອບ", count: counts.pending, tone: "amber" },
    { id: "answered", label: "ຕອບແລ້ວ", count: counts.answered, tone: "green" },
    { id: "hidden", label: "ເຊື່ອງໄວ້", count: counts.hidden, tone: "rose" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Premium Tab Filter Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`adm-focus relative -mb-px flex items-center gap-2 px-4 py-3 text-xs font-bold transition cursor-pointer select-none border-b-2 ${
                active
                  ? "border-orange-500 text-orange-600 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide transition-colors ${
                  active
                    ? "bg-orange-100 text-orange-700"
                    : t.id === "pending" && t.count > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-655"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtered Q&A Cards List */}
      {filtered.length === 0 ? (
        <EmptyState
          title={
            tab === "pending"
              ? "ບໍ່ມີຄຳຖາມລໍຖ້າການຕອບ"
              : tab === "answered"
              ? "ຍັງບໍ່ມີຄຳຖາມທີ່ຕອບແລ້ວ"
              : tab === "hidden"
              ? "ບໍ່ມີຄຳຖາມທີ່ຖືກເຊື່ອງໄວ້"
              : "ຍັງບໍ່ມີຄຳຖາມເທື່ອ"
          }
          icon="M8 10h8M8 14h5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((q) => (
            <div
              key={q.id}
              className={`rounded-2xl border bg-white p-5 shadow-2xs transition hover:shadow-xs space-y-4 ${
                q.isHidden
                  ? "border-rose-100 bg-rose-50/5"
                  : q.answer
                  ? "border-slate-150"
                  : "border-amber-100 bg-amber-50/5"
              }`}
            >
              {/* Top metadata line */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/product/${encodeURIComponent(q.productCode)}`}
                    className="adm-focus inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-655 transition hover:border-orange-500 hover:bg-orange-50/30 hover:text-orange-600"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 shrink-0 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    <span>{q.productCode}</span>
                  </Link>
                </div>

                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    {/* User Icon SVG */}
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 text-slate-350"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span>{q.customerName}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400">
                      {new Date(q.createdAt).toLocaleDateString("lo-LA", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>

                  {/* Status Badges */}
                  {q.isHidden ? (
                    <Badge tone="rose">ເຊື່ອງໄວ້</Badge>
                  ) : q.answer ? (
                    <Badge tone="green">ຕອບແລ້ວ</Badge>
                  ) : (
                    <Badge tone="amber">ລໍຖ້າຕອບ</Badge>
                  )}
                </div>
              </div>

              {/* Q&A dialog thread */}
              <div className="space-y-3">
                {/* Question bubble */}
                <div className="flex items-start gap-3 border-l-[3px] border-orange-500 bg-orange-50/10 px-4 py-3 rounded-r-xl">
                  <span className="text-sm font-black text-orange-600 shrink-0">Q:</span>
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {q.question}
                  </p>
                </div>

                {/* Answer bubble */}
                {q.answer && (
                  <div className="flex flex-col gap-1 border-l-[3px] border-slate-350 bg-slate-50 px-4 py-3 rounded-r-xl">
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-black text-slate-500 shrink-0">A:</span>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap flex-1">
                        {q.answer}
                      </p>
                    </div>
                    {q.answeredAt && (
                      <span className="text-[10px] text-slate-400 font-bold self-end mt-1.5">
                        ຕອບເມື່ອ:{" "}
                        {new Date(q.answeredAt).toLocaleDateString("lo-LA", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Response Editor Form / Hide Toggles */}
              <div className="pt-2">
                <QnaAnswer
                  id={q.id}
                  answered={!!q.answer}
                  isHidden={q.isHidden}
                  existingAnswer={q.answer ?? ""}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
