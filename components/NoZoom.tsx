"use client";

import { useEffect } from "react";

// Locks the site to 100% scale on phones. iOS Safari ignores user-scalable=no,
// so we also cancel its pinch gestures. Double-tap zoom is off via touch-action.
export function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const onTouchMove = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    document.addEventListener("gesturestart", stop, { passive: false } as any);
    document.addEventListener("gesturechange", stop, { passive: false } as any);
    document.addEventListener("gestureend", stop, { passive: false } as any);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("gestureend", stop);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);
  return null;
}
