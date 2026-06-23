"use client";

import { useEffect } from "react";
import { recordView, type RecentItem } from "@/lib/recently-viewed";

// Records a product view into the recently-viewed store. Renders nothing.
export default function TrackView({ item }: { item: RecentItem }) {
  useEffect(() => {
    recordView(item);
    // re-record only when the product changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.code]);
  return null;
}
