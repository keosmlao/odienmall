"use client";

import { useState } from "react";
import ProductImage from "./ProductImage";

// Product-detail image gallery. With 2+ images it shows a main image plus a
// thumbnail strip; with 0–1 it degrades to a single ProductImage (which keeps
// the error→placeholder fallback). `imageUrl` is the primary/fallback image.
export default function ProductGallery({
  code,
  name,
  brand,
  imageUrl,
  images,
}: {
  code: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  images: string[];
}) {
  const [active, setActive] = useState(0);
  const mainUrl = images[active] ?? imageUrl ?? null;

  return (
    <div>
      <ProductImage
        code={code}
        name={name}
        brand={brand}
        imageUrl={mainUrl}
        rounded="rounded-xl"
        className="aspect-square w-full"
      />

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`ຮູບທີ່ ${i + 1}`}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition ${
                i === active ? "border-brand" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
