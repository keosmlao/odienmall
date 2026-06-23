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
      <div className="relative h-full min-h-64 overflow-hidden rounded sm:min-h-[360px]">
        {items.map((slide, index) => (
          <div
            key={slide.id ?? slide.title}
            aria-hidden={index !== active}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
              index === active ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0 pointer-events-none"
            }`}
            style={{
              backgroundImage: slide.imageUrl
                ? `linear-gradient(90deg, ${slide.backgroundFrom}f2 0%, ${slide.backgroundTo}a6 55%, transparent 100%), url("${slide.imageUrl}")`
                : `linear-gradient(110deg, ${slide.backgroundFrom}, ${slide.backgroundTo})`,
            }}
          >
            <div className="absolute -right-10 -top-24 h-80 w-80 rounded-full bg-white/15" />
            <div className="absolute -bottom-32 right-40 h-72 w-72 rounded-full bg-black/10" />
            <div className="relative grid h-full grid-cols-[1fr_auto] items-center gap-3 px-6 text-white sm:px-12 lg:px-16">
              <div className="max-w-2xl">
                <p className="text-[10px] font-bold tracking-[0.22em] text-white/80 sm:text-xs">
                  {slide.eyebrow}
                </p>
                <h1 className="mt-2 text-2xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  {slide.title}
                </h1>
                <p className="mt-3 max-w-xl text-xs leading-5 text-white/85 sm:text-base sm:leading-7">
                  {slide.description}
                </p>
                <Link
                  href={slide.link}
                  className="mt-5 inline-flex rounded-sm bg-white px-5 py-2.5 text-xs font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5 sm:px-7 sm:py-3 sm:text-sm"
                >
                  {slide.buttonText}
                </Link>
              </div>
              {!slide.imageUrl && (
                <div className="relative hidden h-52 w-52 items-center justify-center lg:flex">
                <div className="absolute inset-0 rounded-full bg-white/15 backdrop-blur-sm" />
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
              className="absolute left-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/20 text-xl text-white opacity-0 transition hover:bg-black/35 group-hover:opacity-100 sm:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="ຕໍ່ໄປ"
              className="absolute right-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/20 text-xl text-white opacity-0 transition hover:bg-black/35 group-hover:opacity-100 sm:opacity-100"
            >
              ›
            </button>
          </>
        )}

        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {items.map((slide, index) => (
            <button
              key={slide.id ?? slide.title}
              type="button"
              aria-label={`Banner ${index + 1}`}
              onClick={() => setActive(index)}
              className={`h-2 rounded-full transition-all ${
                active === index ? "w-7 bg-white" : "w-2 bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
