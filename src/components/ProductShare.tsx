"use client";

import { useState } from "react";

export default function ProductShare({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // User cancelled the native share sheet or clipboard is unavailable.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex h-12 items-center justify-center gap-2 rounded-sm border border-gray-300 px-5 text-sm font-semibold text-gray-600 transition hover:border-orange-300 hover:text-orange-600"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
      </svg>
      {copied ? "ສຳເນົາລິ້ງແລ້ວ ✓" : "ແບ່ງປັນ"}
    </button>
  );
}
