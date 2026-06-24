"use client";

import { useState, useTransition } from "react";
import { testChatBotFromSettings } from "./actions";

type ChatBotTestResult = {
  ok: boolean;
  provider: "openai" | "anthropic" | "none";
  model: string | null;
  botEnabled: boolean;
  hasDbContext: boolean;
  reply: string | null;
  error: string | null;
};

export default function ChatBotTestForm() {
  const [question, setQuestion] = useState("ມີຕູ້ເຢັນ Hitachi ບໍ່ ລາຄາເທົ່າໃດ");
  const [result, setResult] = useState<ChatBotTestResult | null>(null);
  const [pending, startTransition] = useTransition();

  function runTest() {
    setResult(null);
    startTransition(async () => {
      const r = await testChatBotFromSettings(question);
      setResult(r);
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="ລອງຖາມ AI..."
          className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
        />
        <button
          type="button"
          onClick={runTest}
          disabled={pending}
          className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "ກຳລັງທົດສອບ..." : "Test AI"}
        </button>
      </div>

      {result && (
        <div className={`mt-3 rounded-xl border p-3 text-xs leading-5 ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <div className="mb-2 flex flex-wrap gap-2 font-black">
            <span>{result.ok ? "OK" : "FAILED"}</span>
            <span>Provider: {result.provider}</span>
            <span>Model: {result.model ?? "—"}</span>
            <span>Bot: {result.botEnabled ? "ON" : "OFF"}</span>
            <span>DB context: {result.hasDbContext ? "FOUND" : "NONE"}</span>
          </div>
          {result.error && <p className="font-semibold">{result.error}</p>}
          {result.reply && (
            <div className="mt-2 rounded-lg bg-white/75 p-3 text-slate-700">
              <p className="mb-1 font-black text-slate-500">AI reply</p>
              <p className="whitespace-pre-wrap">{result.reply}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
