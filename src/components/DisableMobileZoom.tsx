"use client";

import { useEffect } from "react";

/**
 * Mobile browsers may ignore `user-scalable=no` for accessibility reasons.
 * This guard blocks the common accidental zoom gestures that make the shop/admin
 * UI hard to use on phones: pinch, iOS gesture events, and double-tap zoom.
 */
export default function DisableMobileZoom() {
  useEffect(() => {
    let lastTouchEnd = 0;

    const prevent = (event: Event) => {
      event.preventDefault();
    };

    const preventPinch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };

    const preventDoubleTap = (event: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) event.preventDefault();
      lastTouchEnd = now;
    };

    const preventCtrlWheel = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };

    document.addEventListener("touchmove", preventPinch, { passive: false });
    document.addEventListener("touchend", preventDoubleTap, { passive: false });
    document.addEventListener("wheel", preventCtrlWheel, { passive: false });
    document.addEventListener("gesturestart", prevent, { passive: false });
    document.addEventListener("gesturechange", prevent, { passive: false });
    document.addEventListener("gestureend", prevent, { passive: false });

    return () => {
      document.removeEventListener("touchmove", preventPinch);
      document.removeEventListener("touchend", preventDoubleTap);
      document.removeEventListener("wheel", preventCtrlWheel);
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
      document.removeEventListener("gestureend", prevent);
    };
  }, []);

  return null;
}
