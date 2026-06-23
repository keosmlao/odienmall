"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { answerQ, hideQ } from "@/app/admin/qna/actions";

// Inline answer box + hide toggle for one admin Q&A row.
export default function QnaAnswer({ id, answered }: { id: number; answered: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function send() {
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await answerQ(id, text);
      if (res.ok) {
        setText("");
        router.refresh();
      }
    });
  }
  function hide(h: boolean) {
    startTransition(async () => {
      await hideQ(id, h);
      router.refresh();
    });
  }

  if (answered) {
    return (
      <button onClick={() => hide(true)} disabled={pending} className="text-xs font-semibold text-rose-500 hover:underline">
        ເຊື່ອງ
      </button>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="ພິມຄຳຕອບ..."
        className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <button onClick={send} disabled={pending || !text.trim()} className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        ຕອບ
      </button>
    </div>
  );
}
