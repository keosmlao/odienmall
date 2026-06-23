"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CustomerSearch({ search }: { search: string }) {
  const router = useRouter();
  const [q, setQ] = useState(search);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const s = q.trim();
    router.push(s ? `/admin/customers?q=${encodeURIComponent(s)}` : "/admin/customers");
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ຄົ້ນຫາ ຊື່ / ເບີໂທ / ລະຫັດລູກຄ້າ..."
        className="w-60 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
      >
        ຄົ້ນຫາ
      </button>
      {search && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.push("/admin/customers");
          }}
          className="text-sm text-gray-400 transition hover:text-gray-600"
        >
          ລ້າງ
        </button>
      )}
    </form>
  );
}
