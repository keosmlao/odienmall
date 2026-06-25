"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  sendChatMessage,
  fetchChatMessages,
  markChatRead,
} from "./actions";

interface Msg {
  id: number;
  sender: "customer" | "admin";
  isBot?: boolean;
  body: string;
  createdAt: string;
}

const POLL_MS = 4000;
const SUGGESTIONS = [
  "ມີໂປຣໂມຊັນຫຍັງແດ່?",
  "ຕິດຕາມອໍເດີຂອງຂ້ອຍ",
  "ວິທີຊຳລະເງິນ ແລະ ຈັດສົ່ງ",
  "ນະໂຍບາຍຄືນສິນຄ້າ",
];

const LINK_RE = /(https?:\/\/[^\s)]+|\/(?:product|category|brand|group|search|products|cart|checkout|order|track|login|account|help|policy)\/[^\s),.]+|\/(?:products|cart|checkout|track|login|account|help)(?=\s|$))/g;

function MessageText({ text, mine }: { text: string; mine: boolean }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK_RE)) {
    const url = match[0];
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const external = url.startsWith("http://") || url.startsWith("https://");
    parts.push(
      <a key={`${url}-${index}`} href={url}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className={mine ? "font-semibold underline decoration-white/70 underline-offset-2" : "font-semibold text-brand underline underline-offset-2"}
      >{url}</a>
    );
    last = index + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export default function ChatPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastId = useRef(0);
  const tmpId = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const botTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBotTyping = useCallback(() => {
    if (botTypingTimer.current) clearTimeout(botTypingTimer.current);
    setBotTyping(false);
  }, []);

  const merge = useCallback((incoming: Msg[]) => {
    if (incoming.length === 0) return;
    clearBotTyping();
    setMsgs((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      return [...map.values()].sort((a, b) => a.id - b.id);
    });
    const max = Math.max(...incoming.map((m) => m.id));
    if (max > lastId.current) lastId.current = max;
  }, [clearBotTyping]);

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scroller.current)
        scroller.current.scrollTop = scroller.current.scrollHeight;
    });
  }, []);

  useEffect(() => {
    fetchChatMessages(0, true).then(({ messages }) => {
      if (messages.length) merge(messages as Msg[]);
      scrollBottom();
    });
    markChatRead().catch(() => {});
  }, [merge, scrollBottom]);

  useEffect(() => {
    const id = setInterval(async () => {
      const { messages } = await fetchChatMessages(lastId.current, true);
      if (messages.length) {
        merge(messages as Msg[]);
        scrollBottom();
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [merge, scrollBottom]);

  useEffect(() => { scrollBottom(); }, [msgs, scrollBottom]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || sending) return;
    setDraft("");
    setError(null);
    const tempId = --tmpId.current;
    const optimistic: Msg = { id: tempId, sender: "customer", body, createdAt: new Date().toISOString() };
    setMsgs((p) => [...p, optimistic]);
    scrollBottom();
    setSending(true);
    setBotTyping(true);
    botTypingTimer.current = setTimeout(() => setBotTyping(false), 12000);
    try {
      const res = await sendChatMessage(body);
      if (res.ok) {
        setMsgs((p) => p.map((m) => (m.id === tempId ? (res.message as Msg) : m)));
        lastId.current = Math.max(lastId.current, (res.message as Msg).id);
      } else {
        setError(res.error);
        setMsgs((p) => p.filter((m) => m.id !== tempId));
        clearBotTyping();
      }
    } finally {
      setSending(false);
    }
  }

  const empty = msgs.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-brand to-brand-dark px-4 py-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-lg">
          💬
        </div>
        <div>
          <div className="text-sm font-bold text-white">ຊ່ວຍເຫຼືອລູກຄ້າ</div>
          <div className="text-[10px] text-blue-100">ODIENMall · ຕອບທັນທີ</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-[10px] text-blue-100">ອອນລາຍ</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scroller} className="flex-1 overflow-y-auto p-4 space-y-3">
        {empty && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="text-4xl">🤖</div>
            <div>
              <p className="text-sm font-semibold text-slate-700">ສະບາຍດີ! ຂ້ອຍຊ່ວຍຫຍັງໄດ້?</p>
              <p className="mt-0.5 text-xs text-slate-400">ຖາມຄຳຖາມ ຫຼື ເລືອກຫົວຂໍ້ດ້ານລຸ່ມ</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)}
                  className="rounded-full border border-brand/30 bg-brand-light/50 px-3 py-1.5 text-xs font-semibold text-brand-dark transition hover:bg-brand-light">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m) => {
          const mine = m.sender === "customer";
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && (
                <div className="mt-auto grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-light text-sm">
                  {m.isBot ? "🤖" : "👤"}
                </div>
              )}
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-xs ${
                mine
                  ? "rounded-br-sm bg-brand text-white"
                  : "rounded-bl-sm bg-slate-100 text-slate-800"
              }`}>
                <MessageText text={m.body} mine={mine} />
                <div className={`mt-1 text-[10px] ${mine ? "text-blue-100" : "text-slate-400"}`}>
                  {new Date(m.createdAt).toLocaleTimeString("lo-LA", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}

        {botTyping && (
          <div className="flex items-end gap-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-light text-sm">🤖</div>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-100 bg-white p-3">
        <form onSubmit={(e) => { e.preventDefault(); send(draft); }} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="ພິມຂໍ້ຄວາມ..."
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
          />
          <button type="submit" disabled={!draft.trim() || sending}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 2 11 13M22 2 15 22l-4-9-9-4z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-slate-400">
          ຕອບໂດຍ AI · ພະນັກງານຈະເຂົ້າມາຊ່ວຍຖ້າຕ້ອງການ
        </p>
      </div>
    </div>
  );
}
