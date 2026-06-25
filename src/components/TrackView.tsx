"use client";

import { useEffect } from "react";
import { recordView, type RecentItem } from "@/lib/recently-viewed";

export default function TrackView({ item }: { item: RecentItem }) {
  useEffect(() => {
    recordView(item);
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: item.code }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.code]);
  return null;
}
