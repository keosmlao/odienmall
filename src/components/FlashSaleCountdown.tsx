"use client";

import { useEffect, useState } from "react";

function remaining(end: number) {
  const total = Math.max(0, Math.floor((end - Date.now()) / 1000));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export default function FlashSaleCountdown({
  endsAt,
  startsAt,
}: {
  endsAt: string;
  startsAt: string;
}) {
  const end = Date.parse(endsAt);
  const [time, setTime] = useState(() => {
    const total = Math.max(0, Math.floor((end - Date.parse(startsAt)) / 1000));
    return {
      hours: Math.floor(total / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
    };
  });

  useEffect(() => {
    const timer = window.setInterval(() => setTime(remaining(end)), 1000);
    return () => window.clearInterval(timer);
  }, [end]);

  return (
    <span className="flex items-center gap-1.5" aria-label="ເວລາ Flash Sale ທີ່ເຫຼືອ">
      <span className="mr-1 hidden text-xs font-medium text-slate-500 sm:inline">ສິ້ນສຸດໃນ</span>
      {[time.hours, time.minutes, time.seconds].map((value, index) => (
        <span key={index} className="contents">
          {index > 0 && <span className="font-black text-orange-500">:</span>}
          <span className="grid h-7 min-w-7 place-items-center rounded bg-slate-900 px-1 text-xs font-bold text-white">
            {String(value).padStart(2, "0")}
          </span>
        </span>
      ))}
    </span>
  );
}
