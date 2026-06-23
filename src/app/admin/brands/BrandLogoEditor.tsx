"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import type { AdminBrand } from "@/lib/brands-admin";
import { removeBrandLogo, saveBrandLogoUrl, uploadBrandLogo } from "./actions";

export default function BrandLogoEditor({ brand }: { brand: AdminBrand }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(brand.logoUrl ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(task: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.set("code", brand.code);
    data.set("file", file);
    run(() => uploadBrandLogo(data));
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <BrandLogo code={brand.code} name={brand.name} logo={brand.logoUrl} size="list" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-800">{brand.name}</p>
          <p className="text-xs text-gray-400">{brand.code} · {brand.productCount} ລາຍການ</p>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        onChange={upload}
        disabled={pending}
        className="mt-4 block w-full text-xs text-gray-500 file:mr-2 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:font-semibold file:text-white"
      />
      <div className="mt-3 flex gap-2">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://.../logo.png"
          className="inp min-w-0 flex-1 text-xs"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => saveBrandLogoUrl(brand.code, url))}
          className="rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:border-brand"
        >
          ບັນທຶກ
        </button>
      </div>
      {brand.logoUrl && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => removeBrandLogo(brand.code))}
          className="mt-2 text-xs font-medium text-rose-600"
        >
          ລຶບ logo ທີ່ກຳນົດ
        </button>
      )}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
