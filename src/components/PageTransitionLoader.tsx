"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function LoaderState() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setIsLoading(false);
    }, 0);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleStart = () => setIsLoading(true);
    const handleComplete = () => setIsLoading(false);

    window.addEventListener("routeChangeStart", handleStart);
    window.addEventListener("routeChangeComplete", handleComplete);

    return () => {
      window.removeEventListener("routeChangeStart", handleStart);
      window.removeEventListener("routeChangeComplete", handleComplete);
    };
  }, []);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore external links
      if (href.startsWith("http") && !href.startsWith(window.location.origin)) {
        return;
      }
      
      // Ignore mailto, tel, and local page hash jumps
      if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
        return;
      }
      
      // Ignore target="_blank"
      if (anchor.getAttribute("target") === "_blank") return;

      // Ignore click modifiers (Ctrl, Cmd, Shift, Alt) or right clicks
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }

      // Check if target is same page
      try {
        const targetUrl = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);
        if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search) {
          return;
        }
      } catch {
        return;
      }

      setIsLoading(true);
    };

    document.addEventListener("click", handleAnchorClick);
    return () => {
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <>
      <style>{`
        @keyframes loadingBarProgress {
          0% { left: -50%; width: 40%; }
          50% { width: 60%; }
          100% { left: 100%; width: 40%; }
        }
        .animate-loading-bar-progress {
          animation: loadingBarProgress 1.2s infinite linear;
        }
        @keyframes fadeInTransition {
          0% { opacity: 0; }
          100% { opacity: 0.15; }
        }
        .animate-fade-in-transition {
          animation: fadeInTransition 0.3s forwards ease-in-out;
          animation-delay: 0.1s;
        }
      `}</style>
      <div className="fixed inset-x-0 top-0 z-[9999] pointer-events-none">
        {/* Premium thin top progress indicator */}
        <div className="h-[3px] w-full bg-slate-200/40 overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 animate-loading-bar-progress absolute left-0 top-0" />
        </div>
        
        {/* Subtle glass overlay to block duplicate requests and show visual waiting state */}
        <div className="fixed inset-0 bg-slate-950 animate-fade-in-transition cursor-wait pointer-events-auto" style={{ opacity: 0 }} />
      </div>
    </>
  );
}

export default function PageTransitionLoader() {
  return (
    <Suspense fallback={null}>
      <LoaderState />
    </Suspense>
  );
}
