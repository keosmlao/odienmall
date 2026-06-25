"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { uploadPromotionImage, removePromotionImage, pinPromotion } from "./actions";

type Props = {
  promoCode: string;
  imageUrl: string | null;
  name: string;
  pinned: boolean;
};

export default function PromoImageManager({ promoCode, imageUrl, name, pinned: initialPinned }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(imageUrl);
  const [localPinned, setLocalPinned] = useState(initialPinned);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const preview = URL.createObjectURL(file);
    setLocalUrl(preview);

    const fd = new FormData();
    fd.append("promoCode", promoCode);
    fd.append("file", file);

    startTransition(async () => {
      const res = await uploadPromotionImage(fd);
      if (!res.ok) {
        setError(res.error);
        setLocalUrl(imageUrl);
        URL.revokeObjectURL(preview);
      }
    });

    e.target.value = "";
  }

  function handleDelete() {
    if (!confirm("ລຶບຮູບນີ້?")) return;
    setError(null);
    startTransition(async () => {
      const res = await removePromotionImage(promoCode);
      if (res.ok) setLocalUrl(null);
      else setError(res.error);
    });
  }

  function handlePin() {
    const next = !localPinned;
    setLocalPinned(next);
    startTransition(async () => {
      const res = await pinPromotion(promoCode, next);
      if (!res.ok) {
        setLocalPinned(!next);
        setError(res.error);
      }
    });
  }

  return (
    <div className="relative">
      {/* Image area */}
      <div
        className="relative flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-orange-400 hover:bg-orange-50"
        onClick={() => !isPending && fileRef.current?.click()}
        title="ຄລິກເພື່ອ upload ຮູບ"
      >
        {localUrl ? (
          <Image
            src={localUrl}
            alt={name}
            fill
            sizes="240px"
            className="object-contain p-2"
            unoptimized={localUrl.startsWith("blob:")}
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-slate-400">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
            <span className="text-xs font-medium">Upload ຮູບ</span>
          </div>
        )}

        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="mt-1.5 flex items-center gap-1.5">
        {/* Pin toggle */}
        <button
          onClick={handlePin}
          disabled={isPending}
          title={localPinned ? "ຍกເລີກ pin" : "Pin ໃສ່ໜ້າທຳອິດ"}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold transition ${
            localPinned
              ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={localPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z" />
          </svg>
          {localPinned ? "Pinned" : "Pin"}
        </button>

        {/* Delete button */}
        {localUrl && (
          <button
            onClick={handleDelete}
            disabled={isPending}
            title="ລຶບຮູບ"
            className="flex items-center justify-center rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-100"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />

      {error && <p className="mt-1 text-center text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
