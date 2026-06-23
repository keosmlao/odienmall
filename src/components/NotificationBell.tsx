"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getMyUnread, getMyNotifications, markMyNotificationsRead } from "@/app/(shop)/account/notify-actions";
import PushEnable from "./PushEnable";

interface Note {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const POLL_MS = 20000;

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Note[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const n = await getMyUnread();
      if (alive) setUnread(n);
    };
    run();
    const t = setInterval(run, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const res = await getMyNotifications();
      setItems(res.items);
      if (res.unread > 0) {
        await markMyNotificationsRead();
        setUnread(0);
      }
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="ແຈ້ງເຕືອນ"
        className="relative grid h-10 w-10 place-items-center rounded-full text-gray-600 transition hover:bg-gray-100"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
          <div className="border-b border-gray-100 px-4 py-3 text-sm font-bold text-gray-900">ການແຈ້ງເຕືອນ</div>
          <PushEnable />
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">ບໍ່ມີການແຈ້ງເຕືອນ</p>
            ) : (
              items.map((n) => {
                const inner = (
                  <div className={`px-4 py-3 transition hover:bg-gray-50 ${n.read ? "" : "bg-brand-light/30"}`}>
                    <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs leading-5 text-gray-500">{n.body}</p>}
                    <p className="mt-1 text-[10px] text-gray-400">
                      {new Date(n.createdAt).toLocaleString("lo-LA", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block border-b border-gray-50 last:border-0">
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id} className="border-b border-gray-50 last:border-0">{inner}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
