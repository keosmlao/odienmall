"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Admin order-list action: share the customer-facing order link (view details +
// pay) via copy / WhatsApp / LINE. The menu renders in a fixed-position portal
// so it isn't clipped by the table's overflow.
export default function SendOrderLinkButton({ orderNo, phone }: { orderNo: string; phone?: string | null }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }

  const link = typeof window !== "undefined" ? `${window.location.origin}/order/${encodeURIComponent(orderNo)}` : "";
  const msg = `ສະບາຍດີ 🙏 ນີ້ແມ່ນລິ້ງເບິ່ງລາຍລະອຽດ ແລະ ຊຳລະເງິນ ອໍເດີ ${orderNo}:\n${link}`;
  const tel = (phone || "").replace(/[^0-9]/g, "").replace(/^0/, "856");
  const wa = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
  const line = `https://line.me/R/msg/text/?${encodeURIComponent(msg)}`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="ສົ່ງລິ້ງ"
        title="ສົ່ງລິ້ງໃຫ້ລູກຄ້າ"
        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-brand hover:text-brand-dark"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
        </svg>
      </button>

      {open && pos && createPortal(
        <>
          <button type="button" aria-label="ປິດ" onClick={() => setOpen(false)} className="fixed inset-0 z-[60] cursor-default" />
          <div
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-[61] w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-left shadow-xl"
          >
            <button
              type="button"
              onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              🔗 {copied ? "ກ໋ອບປີ້ແລ້ວ ✓" : "ກ໋ອບປີ້ລິ້ງ"}
            </button>
            <a href={wa} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[#1a8a4f] hover:bg-emerald-50">
              💬 ສົ່ງ WhatsApp
            </a>
            <a href={line} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[#06934a] hover:bg-emerald-50">
              🟢 ສົ່ງ LINE
            </a>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
