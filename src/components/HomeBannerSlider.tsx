"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface BannerSlide {
  id?: number;
  eyebrow: string;
  title: string;
  description: string;
  buttonText: string;
  link: string;
  imageUrl?: string | null;
  backgroundFrom: string;
  backgroundTo: string;
  visual?: string;
}

const DEFAULT_SLIDES: BannerSlide[] = [
  {
    eyebrow: "ODIENMALL · OFFICIAL STORE",
    title: "ເຄື່ອງໃຊ້ໄຟຟ້າຄຸນນະພາບ",
    description: "ເລືອກຊື້ສິນຄ້າຈາກ ODG ພ້ອມຈັດສົ່ງທົ່ວປະເທດລາວ",
    link: "/products",
    buttonText: "ຊ໊ອບດຽວນີ້",
    backgroundFrom: "#ff5f20",
    backgroundTo: "#ffb21c",
    visual: "⚡",
  },
  {
    eyebrow: "SMART HOME",
    title: "ສະດວກສະບາຍສຳລັບທຸກຄອບຄົວ",
    description: "ອັບເກຣດເຮືອນຂອງທ່ານດ້ວຍສິນຄ້າ Smart Home ແລະເຄື່ອງໃຊ້ຮຸ່ນໃໝ່",
    link: "/brand/SMART%20HOME",
    buttonText: "ເບິ່ງສິນຄ້າ",
    backgroundFrom: "#5d2eea",
    backgroundTo: "#cf5cff",
    visual: "⌂",
  },
  {
    eyebrow: "BRANDS YOU LOVE",
    title: "ແບຣນດັງ ລາຄາດີ",
    description: "Samsung, Hitachi, Midea, Sharp, LG ແລະອີກຫຼາຍແບຣນໃຫ້ເລືອກ",
    link: "/brands",
    buttonText: "ເບິ່ງທຸກແບຣນ",
    backgroundFrom: "#0067c8",
    backgroundTo: "#22b8cf",
    visual: "✦",
  },
] as const satisfies BannerSlide[];

export default function HomeBannerSlider({ slides = [] }: { slides?: BannerSlide[] }) {
  const items = slides.length > 0 ? slides : DEFAULT_SLIDES;
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    if (items.length < 2) return;
    const id = window.setInterval(
      () => setActive((current) => (current + 1) % items.length),
      5000,
    );
    return () => window.clearInterval(id);
  }, [items.length]);

  const move = (direction: number) =>
    setActive((current) => (current + direction + items.length) % items.length);

  return (
    <section
      aria-label="ໂປຣໂມຊັນ"
      className="group relative h-full !mb-0 !overflow-hidden !border-0 !bg-transparent !p-0 !shadow-none"
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStart.current == null) return;
        const delta = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
        if (Math.abs(delta) > 45) move(delta > 0 ? -1 : 1);
        touchStart.current = null;
      }}
    >
      <div className="relative h-full min-h-[326px] overflow-hidden rounded-[22px] shadow-sm ring-1 ring-black/5 sm:min-h-[380px] sm:rounded-2xl">
        {items.map((slide, index) => (
          <div
            key={slide.id ?? slide.title}
            aria-hidden={index !== active}
            className={`absolute inset-0 transition-all duration-700 ease-out ${
              index === active ? "scale-100 opacity-100" : "scale-105 opacity-0 pointer-events-none"
            }`}
          >
            {/* background layer */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: slide.imageUrl
                  ? `linear-gradient(90deg, ${slide.backgroundFrom}f2 0%, ${slide.backgroundTo}a6 55%, transparent 100%), url("${slide.imageUrl}")`
                  : `linear-gradient(125deg, ${slide.backgroundFrom} 0%, ${slide.backgroundTo} 100%)`,
              }}
            />
            {/* soft decorative layers */}
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/15 bg-white/15 sm:-right-16 sm:-top-28 sm:h-96 sm:w-96" />
            <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-black/10 sm:h-72 sm:w-72" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-white/5 sm:bg-gradient-to-r sm:from-black/20 sm:via-transparent sm:to-transparent" />

            {!slide.imageUrl && (
              <div className="pointer-events-none absolute -right-3 top-5 grid h-28 w-28 place-items-center rounded-full border border-white/15 bg-white/10 text-6xl font-black text-white/15 sm:hidden">
                {slide.visual}
              </div>
            )}

            {/* content */}
            <div className="relative flex h-full items-end px-5 pb-14 pt-7 text-white sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4 sm:px-12 sm:py-10 lg:px-16">
              <div className="relative z-[1] min-w-0 max-w-2xl">
                <span className="inline-flex max-w-full items-center truncate rounded-full bg-white/15 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.2em] text-white ring-1 ring-white/25 backdrop-blur-sm sm:text-xs">
                  {slide.eyebrow}
                </span>
                <h1 className="mt-3 max-w-[19rem] text-[clamp(1.65rem,7.6vw,2.15rem)] font-black leading-[1.18] tracking-[-0.025em] drop-shadow-sm sm:max-w-2xl sm:text-4xl sm:leading-[1.12] lg:text-5xl">
                  {slide.title}
                </h1>
                <p className="mt-2.5 line-clamp-2 max-w-[20rem] text-[13px] leading-5 text-white/85 sm:max-w-xl sm:text-base sm:leading-7">
                  {slide.description}
                </p>
                <Link
                  href={slide.link}
                  className="group/btn mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 active:scale-[0.98] sm:mt-5 sm:rounded-full sm:px-8 sm:py-3 sm:text-sm"
                >
                  {slide.buttonText}
                  <span aria-hidden className="text-base leading-none transition-transform group-hover/btn:translate-x-0.5">→</span>
                </Link>
              </div>
              {!slide.imageUrl && (
                <div className="relative hidden h-52 w-52 items-center justify-center lg:flex">
                  <div className="absolute inset-0 rounded-full bg-white/15 backdrop-blur-sm" />
                  <div className="absolute inset-4 rounded-full ring-1 ring-white/25" />
                  {index === 0 ? (
                    <span className="relative rounded-3xl bg-white p-5 shadow-2xl">
                      <Image src="/odm.png" alt="OdienMall" width={150} height={108} className="h-24 w-auto object-contain" />
                    </span>
                  ) : (
                    <span className="relative text-8xl font-black text-white/90 drop-shadow-2xl">
                      {slide.visual}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="ກ່ອນໜ້າ"
              className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-xl text-white opacity-0 ring-1 ring-white/25 backdrop-blur-sm transition hover:bg-white/30 group-hover:opacity-100 md:grid"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="ຕໍ່ໄປ"
              className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-xl text-white opacity-0 ring-1 ring-white/25 backdrop-blur-sm transition hover:bg-white/30 group-hover:opacity-100 md:grid"
            >
              ›
            </button>
          </>
        )}

        {items.length > 1 && (
          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 sm:left-12 sm:bottom-4 sm:translate-x-0 lg:left-16">
            {items.map((slide, index) => (
              <button
                key={slide.id ?? slide.title}
                type="button"
                aria-label={`Banner ${index + 1}`}
                aria-current={active === index ? "true" : undefined}
                onClick={() => setActive(index)}
                className={`h-2 rounded-full ring-1 ring-white/15 transition-all duration-300 ${
                  active === index ? "w-7 bg-white" : "w-2 bg-white/45 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
