"use client";

export default function ChatAskButton({ productName }: { productName: string }) {
  function ask() {
    const msg = `ຢາກສອບຖາມກ່ຽວກັບ: ${productName}`;
    window.dispatchEvent(new CustomEvent("chat:ask", { detail: msg }));
  }

  return (
    <button
      type="button"
      onClick={ask}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand/30 bg-brand/5 px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand/10 active:scale-95"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      ສອບຖາມກ່ຽວກັບສິນຄ້ານີ້
    </button>
  );
}
