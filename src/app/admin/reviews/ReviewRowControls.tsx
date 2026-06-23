"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleReviewHidden, removeReview } from "./actions";

export default function ReviewRowControls({ id, isHidden }: { id: string; isHidden: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function hide() {
    startTransition(async () => {
      await toggleReviewHidden(id, !isHidden);
      router.refresh();
    });
  }

  function del() {
    if (!confirm("ລຶບຣີວິວນີ້ຖາວອນ?")) return;
    startTransition(async () => {
      await removeReview(id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        onClick={hide}
        disabled={pending}
        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-brand hover:text-brand-dark disabled:opacity-50"
      >
        {isHidden ? "ສະແດງ" : "ເຊື່ອງ"}
      </button>
      <button
        onClick={del}
        disabled={pending}
        className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        ລຶບ
      </button>
    </div>
  );
}
