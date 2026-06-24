"use client";

import { useEffect, useState } from "react";
import ProductImage from "./ProductImage";

// Product-detail image gallery. With 2+ images it shows a main image plus a
// thumbnail strip; with 0–1 it degrades to a single ProductImage (which keeps
// the error→placeholder fallback). Click the main image to zoom (lightbox).
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
  const [zoom, setZoom] = useState(false);
  const mainUrl = images[active] ?? imageUrl ?? null;

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [zoom]);

  return (
    <div>
      <button
        type="button"
        onClick={() => mainUrl && setZoom(true)}
        className={`group block w-full ${mainUrl ? "cursor-zoom-in" : "cursor-default"}`}
        aria-label="ຂະຫຍາຍຮູບ"
      >
        <ProductImage
          code={code}
          name={name}
          brand={brand}
          imageUrl={mainUrl}
          rounded="rounded-xl"
          className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </button>

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

      {/* Lightbox */}
      {zoom && mainUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setZoom(false)}
        >
          <button
            type="button"
            onClick={() => setZoom(false)}
            aria-label="ປິດ"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-2xl text-white transition hover:bg-white/25"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mainUrl}
            alt={name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain"
          />
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2" onClick={(e) => e.stopPropagation()}>
              {images.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`ຮູບທີ່ ${i + 1}`}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 bg-white ${i === active ? "border-orange-400" : "border-white/30"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
