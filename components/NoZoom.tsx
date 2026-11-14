"use client";

import { useEffect } from "react";

// Locks the site to 100% scale on phones. iOS Safari ignores user-scalable=no,
// so we also cancel its pinch gestures and double-tap zoom.
export function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    let lastTap = 0;
    const onTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        const el = e.target as HTMLElement | null;
        if (!el?.closest("input, textarea, select, [contenteditable=true]")) e.preventDefault();
      }
      lastTap = now;
    };
    document.addEventListener("gesturestart", stop, { passive: false } as any);
    document.addEventListener("gesturechange", stop, { passive: false } as any);
    document.addEventListener("gestureend", stop, { passive: false } as any);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("gestureend", stop);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
  return null;
}
