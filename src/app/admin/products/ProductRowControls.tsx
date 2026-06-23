"use client";

import { useState, useTransition } from "react";
import { toggleProductHidden, toggleProductFeatured } from "./actions";

// Inline overlay toggles shown in each list row. Optimistic: flips local state,
// calls the server action, reverts on failure.
export default function ProductRowControls({
  code,
  isHidden,
  isFeatured,
}: {
  code: string;
  isHidden: boolean;
  isFeatured: boolean;
}) {
  const [hidden, setHidden] = useState(isHidden);
  const [featured, setFeatured] = useState(isFeatured);
  const [pending, startTransition] = useTransition();

  function flipFeatured() {
    const next = !featured;
    setFeatured(next);
    startTransition(async () => {
      const res = await toggleProductFeatured(code, next);
      if (!res.ok) setFeatured(!next);
    });
  }

  function flipHidden() {
    const next = !hidden;
    setHidden(next);
    startTransition(async () => {
      const res = await toggleProductHidden(code, next);
      if (!res.ok) setHidden(!next);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={flipFeatured}
        disabled={pending}
        title={featured ? "ສິນຄ້າແນະນຳ — ກົດເພື່ອຍົກເລີກ" : "ໝາຍເປັນສິນຄ້າແນະນຳ"}
        aria-pressed={featured}
        className={`grid h-8 w-8 place-items-center rounded-lg border transition disabled:opacity-50 ${
          featured
            ? "border-amber-200 bg-amber-50 text-amber-500"
            : "border-gray-200 text-gray-300 hover:text-amber-400"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill={featured ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
          <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.1 21.9l1.1-6.5L2.5 9.8l6.5-.9L12 3z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={flipHidden}
        disabled={pending}
        title={hidden ? "ເຊື່ອງຢູ່ — ກົດເພື່ອສະແດງ" : "ກຳລັງສະແດງ — ກົດເພື່ອເຊື່ອງ"}
        aria-pressed={hidden}
        className={`grid h-8 w-8 place-items-center rounded-lg border transition disabled:opacity-50 ${
          hidden
            ? "border-rose-200 bg-rose-50 text-rose-500"
            : "border-gray-200 text-gray-400 hover:text-gray-600"
        }`}
      >
        {hidden ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.4 3.2M6.1 6.1A18 18 0 0 0 2 12s3.5 8 10 8a10.6 10.6 0 0 0 3-.4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
