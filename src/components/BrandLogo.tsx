"use client";

import { useState } from "react";

const BRAND_DOMAIN: Record<string, string> = {
  ACONATIC: "aconatic.com",
  HANABISHI: "hanabishi.com",
  HITACHI: "hitachi.com",
  LG: "lg.com",
  MIDEA: "midea.com",
  SAMSUNG: "samsung.com",
  SANDEN: "sanden.co.jp",
  SHARP: "global.sharp",
  SONY: "sony.com",
  MITSUBISHI: "mitsubishielectric.com",
  DAIKIN: "daikin.com",
  HISENSE: "hisense.com",
  PHILIPS: "philips.com",
  TEFAL: "tefal.com",
};

const BRAND_TONE: Record<string, string> = {
  ACONATIC: "bg-red-50 text-red-600",
  HITACHI: "bg-red-50 text-red-700",
  LG: "bg-rose-50 text-rose-700",
  MIDEA: "bg-sky-50 text-sky-600",
  SAMSUNG: "bg-blue-50 text-blue-700",
  SANDEN: "bg-blue-50 text-blue-600",
  SHARP: "bg-red-50 text-red-600",
  "SMART HOME": "bg-cyan-50 text-cyan-700",
};

export default function BrandLogo({
  code,
  name,
  logo,
  size = "home",
}: {
  code: string;
  name: string;
  logo?: string | null;
  size?: "home" | "list";
}) {
  const [failed, setFailed] = useState(false);
  const key = code.toUpperCase();
  const domain = BRAND_DOMAIN[key];
  const iconSize = size === "list" ? "h-12 w-12" : "h-10 w-10";
  const src =
    logo && (/^(https?:)?\/\//i.test(logo) || logo.startsWith("/"))
      ? logo
      : domain
        ? `https://www.google.com/s2/favicons?domain_url=https://${domain}&sz=128`
        : null;

  if (src && !failed) {
    return (
      // Google serves the official-site favicon without exposing API secrets.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name} logo`}
        className={`${iconSize} object-contain`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`grid ${iconSize} place-items-center rounded-xl text-lg font-black ${
        BRAND_TONE[key] ?? "bg-brand-light text-brand-dark"
      }`}
    >
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}
