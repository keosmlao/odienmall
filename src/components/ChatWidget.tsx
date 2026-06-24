"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  sendChatMessage,
  fetchChatMessages,
  markChatRead,
} from "@/app/(shop)/chat/actions";

interface Msg {
  id: number;
  sender: "customer" | "admin";
  isBot?: boolean;
  body: string;
  createdAt: string;
}

const POLL_MS = 4000;

// Quick-start prompts shown on an empty conversation.
const SUGGESTIONS = [
  "ມີໂປຣໂມຊັນຫຍັງແດ່?",
  "ຕິດຕາມອໍເດີຂອງຂ້ອຍ",
  "ວິທີຊຳລະເງິນ ແລະ ຈັດສົ່ງ",
  "ນະໂຍບາຍຄືນສິນຄ້າ",
];

export default function ChatWidget() {
  const pathname = usePathname();
  const productPage = pathname.startsWith("/product/");
  const launcherBottom = productPage ? "bottom-32 sm:bottom-6" : "bottom-20 sm:bottom-6";
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const lastId = useRef(0);
  const tmpId = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);

  const merge = useCallback((incoming: Msg[]) => {
    if (incoming.length === 0) return;
    setMsgs((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev];
      for (const m of incoming) if (!seen.has(m.id)) next.push(m);
      next.sort((a, b) => a.id - b.id);
      return next;
    });
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
  }, []);

  // Poll while open and closed. The database is authoritative for unread state,
  // so a refresh cannot count old admin messages as new again.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const result = await fetchChatMessages(lastId.current, open);
      if (!alive) return;
      if (result.messages.length) merge(result.messages);
      setUnseen(open ? 0 : result.unread);
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [open, merge]);

  // Auto-scroll to newest when open.
  useEffect(() => {
    if (open && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs, open]);

  function openPanel() {
    setOpen(true);
    setUnseen(0);
    void markChatRead();
  }

  async function sendText(raw: string) {
    const text = raw.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    // Optimistically show the customer's message right away (negative temp id).
    const tempIdVal = (tmpId.current -= 1);
    const temp: Msg = { id: tempIdVal, sender: "customer", body: text, createdAt: "" };
    setMsgs((prev) => [...prev, temp]);
    const res = await sendChatMessage(text);
    // Drop the optimistic bubble (the real one comes back / via poll).
    setMsgs((prev) => prev.filter((m) => m.id !== tempIdVal));
    setSending(false);
    if (res.ok) {
      merge([res.message]);
      // The bot may have replied during the action — pull it immediately.
      const r = await fetchChatMessages(lastId.current, open);
      if (r.messages.length) merge(r.messages);
    } else {
      setDraft(text);
    }
  }

  function send() {
    void sendText(draft);
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={openPanel}
          aria-label="ແຊັດກັບຮ້ານ"
          className={`fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark ${launcherBottom}`}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6a8.5 8.5 0 0 1-.9-3.9A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
          </svg>
          {unseen > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
              {unseen}
            </span>
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed inset-x-2 bottom-2 z-50 flex h-[min(82dvh,34rem)] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:inset-auto sm:bottom-6 sm:right-4 sm:h-[28rem] sm:w-[22rem] sm:max-w-[calc(100vw-2rem)]">
          <div className="flex shrink-0 items-center justify-between gap-3 bg-brand px-3 py-3 text-white sm:px-4">
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">ແຊັດກັບຮ້ານ OdienMall</p>
              <p className="truncate text-[11px] text-white/80">🤖 ຜູ້ຊ່ວຍ AI ຕອບໄວ · ໂອນຫາພະນັກງານໄດ້</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="ປິດ" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition hover:bg-white/15">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div ref={scroller} className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-gray-50 p-2.5 sm:p-3">
            {msgs.length === 0 && (
              <div className="mt-4">
                <p className="text-center text-sm text-gray-400">
                  ສະບາຍດີ 👋 ມີຫຍັງໃຫ້ຊ່ວຍບໍ?
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendText(s)}
                      disabled={sending}
                      className="rounded-xl border border-brand/30 bg-white px-3 py-2.5 text-left text-xs font-semibold text-brand-dark transition hover:bg-brand-light disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m) => {
              const mine = m.sender === "customer";
              return (
                <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  {!mine && (
                    <span className="mb-0.5 ml-1 text-[10px] font-bold text-gray-400">
                      {m.isBot ? "🤖 ຜູ້ຊ່ວຍ AI" : "👤 ພະນັກງານ"}
                    </span>
                  )}
                  <div
                    className={`max-w-[86%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed sm:max-w-[80%] ${
                      mine
                        ? "rounded-br-sm bg-brand text-white"
                        : m.isBot
                          ? "rounded-bl-sm bg-violet-50 text-gray-700 ring-1 ring-violet-100"
                          : "rounded-bl-sm bg-white text-gray-700 shadow-sm ring-1 ring-gray-100"
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex items-center gap-1.5 pl-1 text-gray-400">
                <span className="text-[10px] font-bold">🤖 ກຳລັງພິມ</span>
                <span className="flex gap-0.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300" />
                </span>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex shrink-0 items-end gap-2 border-t border-gray-100 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="ພິມຂໍ້ຄວາມ..."
              className="max-h-24 flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-white transition hover:bg-brand-dark disabled:opacity-50"
              aria-label="ສົ່ງ"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
