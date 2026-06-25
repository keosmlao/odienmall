"use client";

import { useState } from "react";
import { productImageUrl } from "@/lib/format";

// Product image with graceful fallback. If a real image URL is configured (see
// productImageUrl / NEXT_PUBLIC_PRODUCT_IMAGE_* env vars) it loads that and falls
// back to the OdienMall logo on error. With nothing configured it renders the
// logo directly.
export default function ProductImage({
  code,
  name,
  imageUrl,
  className = "",
  rounded = "rounded-t-lg",
}: {
  code: string;
  name: string;
  brand?: string | null;
  /** App-owned overlay image (odg_ecom.product_overlays); takes precedence. */
  imageUrl?: string | null;
  className?: string;
  rounded?: string;
}) {
  // Overlay image (admin-managed) wins; else fall back to the env-pattern URL.
  const url = imageUrl || productImageUrl(code);
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      <div className={`relative overflow-hidden bg-white ${rounded} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-slate-50 ${rounded} ${className}`}
      aria-label={name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/odm.png"
        alt=""
        loading="lazy"
        className="h-1/3 max-h-14 w-auto max-w-[58%] object-contain opacity-75 sm:h-2/5 sm:max-h-20 sm:max-w-[68%]"
      />
      <span className="absolute bottom-1 right-1.5 rounded bg-white/85 px-1.5 py-0.5 text-[8px] font-black text-slate-400 sm:bottom-1.5 sm:right-2 sm:text-[9px]">
        {code}
      </span>
    </div>
  );
}
