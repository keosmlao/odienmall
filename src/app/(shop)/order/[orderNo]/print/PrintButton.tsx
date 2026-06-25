"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-orange-600 active:scale-95"
    >
      ພິມ / Save PDF
    </button>
  );
}
