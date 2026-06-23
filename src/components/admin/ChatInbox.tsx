"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminListThreads, adminGetMessages, adminReply } from "@/app/admin/chat/actions";

interface Msg {
  id: number;
  sender: "customer" | "admin";
  body: string;
  createdAt: string;
}
interface Thread {
  id: number;
  name: string;
  phone: string | null;
  customerCode: string | null;
  lastMessageAt: string;
  lastBody: string | null;
  unread: number;
}

const THREADS_MS = 6000;
const MSGS_MS = 4000;

export default function ChatInbox({ initial }: { initial: Thread[] }) {
  const [threads, setThreads] = useState<Thread[]>(initial);
  const [active, setActive] = useState<number | null>(initial[0]?.id ?? null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const lastId = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);

  // Poll the thread list.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const t = await adminListThreads(search || undefined);
      if (alive) setThreads(t);
    };
    const i = setInterval(tick, THREADS_MS);
    return () => {
      alive = false;
      clearInterval(i);
    };
  }, [search]);

  const mergeMsgs = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return;
    setMsgs((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev];
      for (const m of incoming) if (!seen.has(m.id)) next.push(m);
      next.sort((a, b) => a.id - b.id);
      return next;
    });
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
  }, []);

  // Load + poll the active conversation. The first fetch (afterId 0) replaces the
  // list (switching threads); later fetches merge — all inside the async callback
  // so we never call setState synchronously in the effect body.
  useEffect(() => {
    if (active == null) return;
    let alive = true;
    lastId.current = 0;
    const tick = async () => {
      const fromId = lastId.current;
      const incoming = await adminGetMessages(active, fromId);
      if (!alive) return;
      if (fromId === 0) {
        setMsgs(incoming);
        lastId.current = incoming.length ? Math.max(...incoming.map((m) => m.id)) : 0;
      } else {
        mergeMsgs(incoming);
      }
    };
    tick();
    const i = setInterval(tick, MSGS_MS);
    return () => {
      alive = false;
      clearInterval(i);
    };
  }, [active, mergeMsgs]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs]);

  async function send() {
    const text = draft.trim();
    if (!text || active == null || sending) return;
    setSending(true);
    setDraft("");
    const res = await adminReply(active, text);
    setSending(false);
    if (res.ok) mergeMsgs([res.message]);
    else setDraft(text);
  }

  const activeThread = threads.find((t) => t.id === active);

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Threads */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-gray-100">
        <div className="border-b border-gray-100 p-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ຄົ້ນຫາ ຊື່ / ເບີ"
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <p className="p-4 text-center text-sm text-gray-400">ຍັງບໍ່ມີແຊັດ</p>
          )}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex w-full flex-col gap-0.5 border-b border-gray-50 px-3 py-2.5 text-left transition ${
                active === t.id ? "bg-brand-light/50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-gray-800">{t.name}</span>
                {t.unread > 0 && (
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
                    {t.unread}
                  </span>
                )}
              </div>
              <span className="truncate text-xs text-gray-400">{t.lastBody ?? "—"}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Conversation */}
      <section className="flex flex-1 flex-col">
        {active == null ? (
          <div className="grid flex-1 place-items-center text-sm text-gray-400">ເລືອກການສົນທະນາ</div>
        ) : (
          <>
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-bold text-gray-900">{activeThread?.name ?? "ລູກຄ້າ"}</p>
              <p className="text-xs text-gray-400">
                {activeThread?.phone || activeThread?.customerCode || "ແຂກ"}
              </p>
            </div>
            <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-4">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      m.sender === "admin"
                        ? "rounded-br-sm bg-brand text-white"
                        : "rounded-bl-sm bg-white text-gray-700 shadow-sm ring-1 ring-gray-100"
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-end gap-2 border-t border-gray-100 p-2"
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
                placeholder="ພິມຄຳຕອບ..."
                className="max-h-28 flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
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
          </>
        )}
      </section>
    </div>
  );
}
