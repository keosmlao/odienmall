"use client";

import Link from "next/link";
import { useState } from "react";

// Thin storefront-wide notice bar, toggled at /admin/settings. Dismissible per
// page view (re-appears on reload — it's a standing notice, not a one-time modal).
export default function AnnouncementBar({
  message,
  link,
}: {
  message: string;
  link: string | null;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className="relative bg-brand-dark text-white">
      <div className="mx-auto max-w-7xl px-9 py-1.5 text-center text-xs sm:text-sm">
        {link ? (
          <Link href={link} className="font-medium hover:underline">
            {message}
          </Link>
        ) : (
          <span className="font-medium">{message}</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="ປິດ"
        className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
