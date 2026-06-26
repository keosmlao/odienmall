"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { answerQ, hideQ } from "@/app/admin/qna/actions";

interface QnaAnswerProps {
  id: number;
  answered: boolean;
  isHidden: boolean;
  existingAnswer: string;
}

export default function QnaAnswer({ id, answered, isHidden, existingAnswer }: QnaAnswerProps) {
  const router = useRouter();
  const [text, setText] = useState(existingAnswer);
  const [isEditing, setIsEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function send() {
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await answerQ(id, text);
      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      }
    });
  }

  function toggleHide() {
    startTransition(async () => {
      const res = await hideQ(id, !isHidden);
      if (res.ok) {
        router.refresh();
      }
    });
  }

  const btnClass = "adm-focus inline-flex h-8 items-center justify-center rounded-lg bg-orange-500 px-3 text-xs font-black text-white shadow-sm shadow-orange-500/10 hover:bg-orange-600 transition disabled:opacity-50 cursor-pointer";
  const secBtnClass = "adm-focus inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer";

  if (answered && !isEditing) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setText(existingAnswer);
            setIsEditing(true);
          }}
          disabled={pending}
          className="cursor-pointer text-xs font-black text-orange-600 hover:text-orange-700 transition hover:underline disabled:opacity-50"
        >
          ແກ້ໄຂຄຳຕອບ
        </button>
        <span className="text-slate-200 select-none">|</span>
        <button
          onClick={toggleHide}
          disabled={pending}
          className={`cursor-pointer text-xs font-black transition hover:underline disabled:opacity-50 ${
            isHidden
              ? "text-emerald-600 hover:text-emerald-700"
              : "text-rose-505 hover:text-rose-600"
          }`}
        >
          {isHidden ? "ເປີດສະແດງຄືນ" : "ເຊື່ອງຄຳຖາມ"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="ພິມຄຳຕອບ..."
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-sm disabled:opacity-50 disabled:bg-slate-50"
        disabled={pending}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={send}
            disabled={pending || !text.trim() || text === existingAnswer}
            className={btnClass}
          >
            {pending ? "..." : isEditing ? "ບັນທຶກຄຳຕອບ" : "ຕອບຄຳຖາມ"}
          </button>
          {isEditing && (
            <button
              onClick={() => {
                setIsEditing(false);
                setText(existingAnswer);
              }}
              disabled={pending}
              className={secBtnClass}
            >
              ຍົກເລີກ
            </button>
          )}
        </div>

        {/* Let them hide the question immediately even if unanswered */}
        <button
          onClick={toggleHide}
          disabled={pending}
          className={`cursor-pointer text-xs font-black transition hover:underline disabled:opacity-50 ${
            isHidden
              ? "text-emerald-600 hover:text-emerald-700"
              : "text-rose-505 hover:text-rose-600"
          }`}
        >
          {isHidden ? "ເປີດສະແດງຄືນ" : "ເຊື່ອງຄຳຖາມ"}
        </button>
      </div>
    </div>
  );
}
