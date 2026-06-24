"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminListThreads, adminGetMessages, adminReply, adminResumeBot } from "@/app/admin/chat/actions";

interface Msg {
  id: number;
  sender: "customer" | "admin";
  isBot?: boolean;
  body: string;
  createdAt: string;
}
interface Thread {
  id: number;
  name: string;
  phone: string | null;
  customerCode: string | null;
  humanTaken: boolean;
  lastMessageAt: string;
  lastBody: string | null;
  unread: number;
}

const THREADS_MS = 6000;
const MSGS_MS = 4000;

const AVATAR_COLORS = [
  "bg-gradient-to-br from-orange-500 to-amber-500 text-white",
  "bg-gradient-to-br from-blue-500 to-indigo-500 text-white",
  "bg-gradient-to-br from-emerald-500 to-teal-500 text-white",
  "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white",
  "bg-gradient-to-br from-rose-500 to-pink-500 text-white",
  "bg-gradient-to-br from-slate-500 to-slate-700 text-white",
];

function formatChatTime(dateStr: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString("lo-LA", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return d.toLocaleDateString("lo-LA", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChatInbox({ initial }: { initial: Thread[] }) {
  const [threads, setThreads] = useState<Thread[]>(initial);
  const [active, setActive] = useState<number | null>(initial[0]?.id ?? null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [resumingBot, setResumingBot] = useState(false);
  const [botNotice, setBotNotice] = useState<string | null>(null);
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

  // Load + poll the active conversation.
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

  async function resumeBot() {
    if (active == null || resumingBot) return;
    setResumingBot(true);
    setBotNotice(null);
    const res = await adminResumeBot(active);
    setResumingBot(false);
    if (!res.ok) {
      setBotNotice(res.error);
      return;
    }
    setBotNotice("ເປີດໃຫ້ AI ກັບມາຕອບແລ້ວ");
    const incoming = await adminGetMessages(active, lastId.current);
    mergeMsgs(incoming);
    const t = await adminListThreads(search || undefined);
    setThreads(t);
  }

  const activeThread = threads.find((t) => t.id === active);

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-[30rem] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.02),0_12px_24px_-4px_rgba(15,23,42,0.03)] lg:h-[calc(100vh-14rem)] lg:min-h-[32rem] lg:flex-row">
      {/* Threads Sidebar */}
      <aside className="flex max-h-56 shrink-0 flex-col border-b border-slate-100 bg-slate-50/20 lg:max-h-none lg:w-80 lg:border-b-0 lg:border-r">
        <div className="border-b border-slate-100 bg-white p-3 lg:p-4">
          <div className="relative rounded-xl shadow-xs">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ຄົ້ນຫາ ຊື່ / ເບີ..."
              className="w-full rounded-xl border border-slate-250 bg-white pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-700 placeholder-slate-350 transition-all duration-300 focus:border-orange-500 focus:outline-hidden focus:ring-4 focus:ring-orange-500/10"
            />
            <span className="absolute left-3.5 top-3.5 text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
          </div>
        </div>

        {/* Thread List */}
        <div className="thin-scroll flex-1 space-y-1 overflow-y-auto p-2">
          {threads.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <svg viewBox="0 0 24 24" className="mx-auto h-8 w-8 text-slate-300 mb-2" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-xs font-bold">ຍັງບໍ່ມີແຊັດ</p>
            </div>
          ) : (
            threads.map((t) => {
              const activeColor = AVATAR_COLORS[t.id % AVATAR_COLORS.length];
              const isSelected = active === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setBotNotice(null);
                    setActive(t.id);
                  }}
                  className={`relative flex items-center gap-3.5 w-full rounded-xl p-3 text-left transition-all duration-350 border ${
                    isSelected
                      ? "bg-white border-slate-200/80 shadow-xs"
                      : "hover:bg-slate-55 border-transparent"
                  }`}
                >
                  {/* Left accent bar on active */}
                  {isSelected && (
                    <span className="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r-md bg-orange-500" />
                  )}

                  {/* Avatar Bubble */}
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-black shadow-xs ${activeColor}`}>
                    {t.name ? t.name.trim().slice(0, 1).toUpperCase() : "?"}
                  </span>

                  {/* Thread details */}
                  <div className="flex-1 min-w-0 leading-tight">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs truncate block ${isSelected ? "font-extrabold text-slate-900" : "font-bold text-slate-700"}`}>
                        {t.name}
                      </span>
                      {t.lastMessageAt && (
                        <span className="text-[9px] font-bold text-slate-400 shrink-0">
                          {formatChatTime(t.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1.5 mt-1.5">
                      <span className={`text-[11px] truncate block ${isSelected ? "text-slate-500 font-medium" : "text-slate-400 font-semibold"}`}>
                        {t.lastBody ?? "—"}
                      </span>
                      {t.unread > 0 && (
                        <span className="grid h-4.5 min-w-4.5 shrink-0 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-xs shadow-rose-500/20 animate-pulse">
                          {t.unread}
                        </span>
                      )}
                      {t.humanTaken && t.unread === 0 && (
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-500">
                          HUMAN
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Conversation viewport */}
      <section className="flex flex-1 flex-col bg-slate-50/50">
        {active == null ? (
          <div className="grid flex-1 place-items-center text-center p-6 text-slate-400 bg-white">
            <div>
              <svg viewBox="0 0 24 24" className="mx-auto h-12 w-12 text-slate-200 mb-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-sm font-bold text-slate-700">ເລືອກການສົນທະນາ</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                ເລືອກລູກຄ້າຈາກລາຍການທາງຊ້າຍມື ເພື່ອເລີ່ມການສົນທະນາ
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header banner */}
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-3 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.01)] sm:px-5 sm:py-4.5">
              <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-black shadow-xs ${AVATAR_COLORS[activeThread?.id ?? 0 % AVATAR_COLORS.length]}`}>
                {activeThread?.name ? activeThread.name.trim().slice(0, 1).toUpperCase() : "?"}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-sm font-black text-slate-800">{activeThread?.name ?? "ລູກຄ້າ"}</p>
                <p className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  {activeThread?.customerCode ? (
                    <span className="bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded-lg text-slate-500 font-mono">
                      CODE: {activeThread.customerCode}
                    </span>
                  ) : (
                    <span className="bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded-lg text-slate-400">
                      GUEST
                    </span>
                  )}
                  {activeThread?.phone && (
                    <a
                      href={`tel:${activeThread.phone}`}
                      className="text-orange-500 hover:text-orange-600 font-bold tracking-normal transition"
                    >
                      {activeThread.phone}
                    </a>
                  )}
                </p>
              </div>
              {activeThread?.humanTaken && (
                <button
                  type="button"
                  onClick={resumeBot}
                  disabled={resumingBot}
                  className="shrink-0 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-[11px] font-black text-orange-700 transition hover:bg-orange-100 disabled:opacity-60"
                >
                  {resumingBot ? "ກຳລັງປຸກ AI..." : "ໃຫ້ AI ກັບມາຕອບ"}
                </button>
              )}
              </div>
              {(activeThread?.humanTaken || botNotice) && (
                <div className={`rounded-xl px-3 py-2 text-xs font-semibold leading-5 ${botNotice?.includes("ຜິດ") || botNotice?.includes("ບໍ່") ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600"}`}>
                  {botNotice ??
                    "AI ຖືກປິດສຳລັບ thread ນີ້ ເພາະພະນັກງານຮັບຊ່ວງແລ້ວ. ກົດປຸ່ມເພື່ອໃຫ້ AI ກັບມາຕອບ."}
                </div>
              )}
            </div>

            {/* Message History Viewport */}
            <div ref={scroller} className="thin-scroll flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-3.5 sm:p-5">
              {msgs.map((m) => {
                const isAdminMsg = m.sender === "admin";
                return (
                  <div key={m.id} className={`flex ${isAdminMsg ? "justify-end" : "justify-start"}`}>
                    <div className="flex max-w-[88%] items-end gap-2 sm:max-w-[78%] lg:max-w-[70%]">
                      {/* Customer Avatar bubble inside chat log (only for customer messages) */}
                      {!isAdminMsg && (
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[9px] font-black leading-none ${AVATAR_COLORS[activeThread?.id ?? 0 % AVATAR_COLORS.length]}`}>
                          {activeThread?.name ? activeThread.name.trim().slice(0, 1).toUpperCase() : "?"}
                        </span>
                      )}

                      <div className="flex flex-col min-w-0">
                        <div
                          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-xs font-semibold leading-relaxed shadow-sm ${
                            isAdminMsg
                              ? "rounded-br-none bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/5"
                              : "rounded-bl-none bg-white text-slate-700 border border-slate-100"
                          }`}
                        >
                          {m.body}
                        </div>
                        {/* Timestamp bubble */}
                        <span className={`block mt-1 text-[9px] font-bold text-slate-400 ${isAdminMsg ? "text-right" : "text-left"}`}>
                          {m.isBot ? "AI · " : ""}
                          {new Date(m.createdAt).toLocaleTimeString("lo-LA", { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Form Deck */}
            <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-end gap-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-2 focus-within:border-orange-500/80 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all duration-350"
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
                  className="max-h-28 flex-1 resize-none bg-transparent px-2.5 py-2 text-xs font-semibold text-slate-700 placeholder-slate-350 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/10 hover:from-orange-600 hover:to-amber-600 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-95"
                  aria-label="ສົ່ງ"
                >
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 stroke-white" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
