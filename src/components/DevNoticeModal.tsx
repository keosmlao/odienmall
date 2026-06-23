"use client";

import { useCallback, useEffect, useState } from "react";

// Development warning modal. The home page renders this only when the dev
// notice is enabled (admin toggle), so it pops up on EVERY visit to the home
// page — no "don't show again", by design (ທຸກຄັ້ງ). Dismissible per visit.
export default function DevNoticeModal({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  const [open, setOpen] = useState(true);
  const [shown, setShown] = useState(false); // drives the enter/exit transition

  const close = useCallback(() => {
    setShown(false);
    window.setTimeout(() => setOpen(false), 200); // let the exit animation play
  }, []);

  useEffect(() => {
    if (!open) return;
    // Animate in on the next frame, lock background scroll, close on Esc.
    const raf = requestAnimationFrame(() => setShown(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200 ${
          shown ? "opacity-100" : "opacity-0"
        }`}
        onClick={close}
        aria-hidden
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dev-notice-title"
        className={`relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-200 ${
          shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        {/* Coloured header band */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-6 pb-12 pt-6 text-center">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/15" />
          <div className="pointer-events-none absolute -bottom-4 left-4 h-16 w-16 rounded-full bg-white/10" />
          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            ກຳລັງພັດທະນາ
          </span>

          {/* Close ✕ */}
          <button
            type="button"
            onClick={close}
            aria-label="ປິດ"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/35"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Floating icon overlapping the header / body seam */}
        <div className="relative -mt-10 flex justify-center">
          <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white shadow-lg ring-4 ring-white">
            <span className="grid h-full w-full place-items-center rounded-full bg-amber-100 text-amber-600">
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
              </svg>
            </span>
          </span>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-3 text-center">
          <h2 id="dev-notice-title" className="text-lg font-bold text-gray-900">
            {title}
          </h2>
          <p className="mx-auto mt-2 max-w-sm whitespace-pre-line text-sm leading-relaxed text-gray-500">
            {message}
          </p>
          <button
            type="button"
            onClick={close}
            className="brand-gradient mt-5 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[.99]"
          >
            ເຂົ້າໃຈແລ້ວ
          </button>
        </div>
      </div>
    </div>
  );
}
