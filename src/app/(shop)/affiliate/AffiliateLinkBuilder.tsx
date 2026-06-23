"use client";

import { useState } from "react";

// Builds the affiliate's share links and copies them to the clipboard.
// `base` is the public site URL; the referral root is `${base}/r/${code}`.
export default function AffiliateLinkBuilder({ base, code }: { base: string; code: string }) {
  const root = `${base}/r/${code}`;
  const [path, setPath] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const trimmed = path.trim();
  const norm = trimmed ? (trimmed.startsWith("/") ? trimmed : "/" + trimmed) : "";
  const deepLink = norm ? `${root}?to=${encodeURIComponent(norm)}` : root;

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1 block text-sm text-gray-500">ລິ້ງແນະນຳຂອງທ່ານ</span>
        <div className="flex gap-2">
          <input readOnly value={root} className="inp flex-1 bg-gray-50 font-mono text-sm" />
          <button
            onClick={() => copy(root, "root")}
            className="shrink-0 rounded-sm bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            {copied === "root" ? "ສຳເນົາແລ້ວ ✓" : "ສຳເນົາ"}
          </button>
        </div>
      </div>

      <div className="rounded-sm border border-orange-100 bg-orange-50/50 p-4">
        <span className="mb-1 block text-sm text-gray-500">
          ສ້າງລິ້ງສິນຄ້າສະເພາະ (ໃສ່ເສັ້ນທາງ ເຊັ່ນ /product/ABC123)
        </span>
        <div className="flex gap-2">
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/product/ABC123"
            className="inp flex-1 font-mono text-sm"
          />
          <button
            onClick={() => copy(deepLink, "deep")}
            className="shrink-0 rounded-sm bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            {copied === "deep" ? "ສຳເນົາແລ້ວ ✓" : "ສຳເນົາ"}
          </button>
        </div>
        {norm && (
          <p className="mt-2 break-all font-mono text-xs text-gray-400">{deepLink}</p>
        )}
      </div>
    </div>
  );
}
