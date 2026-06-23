"use client";

import { useState } from "react";
import { hashHue, placeholderLabel, productImageUrl } from "@/lib/format";

// Product image with graceful fallback. If a real image URL is configured (see
// productImageUrl / NEXT_PUBLIC_PRODUCT_IMAGE_* env vars) it loads that and falls
// back to a deterministic gradient placeholder on error. With nothing configured
// it renders the placeholder directly.
export default function ProductImage({
  code,
  name,
  brand,
  imageUrl,
  className = "",
  rounded = "rounded-t-lg",
}: {
  code: string;
  name: string;
  brand?: string | null;
  /** App-owned overlay image (ecom.product_overlays); takes precedence. */
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

  const hue = hashHue(code);
  const label = placeholderLabel(brand ?? null, name);
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${rounded} ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 70% 92%), hsl(${(hue + 40) % 360} 65% 82%))`,
      }}
      aria-hidden
    >
      <span
        className="select-none text-4xl font-extrabold tracking-tight opacity-70"
        style={{ color: `hsl(${hue} 55% 35%)` }}
      >
        {label}
      </span>
      <span
        className="absolute bottom-1 right-2 text-[10px] font-medium opacity-50"
        style={{ color: `hsl(${hue} 45% 30%)` }}
      >
        {code}
      </span>
    </div>
  );
}
