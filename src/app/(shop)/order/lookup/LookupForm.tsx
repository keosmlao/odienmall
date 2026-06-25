"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LookupForm({ initial }: { initial: string }) {
  const [phone, setPhone] = useState(initial);
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = phone.trim();
    if (!t) return;
    router.push(`/order/lookup?phone=${encodeURIComponent(t)}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="020 XXXX XXXX"
        autoFocus
        className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10"
      />
      <button
        type="submit"
        className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
      >
        ຄົ້ນຫາ
      </button>
    </form>
  );
}
