import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

const TAB_ORDER = ["/trips", "/expenses", "/meals", "/profile"] as const;
type TabPath = (typeof TAB_ORDER)[number];

const H_THRESHOLD = 65;
const V_TOLERANCE = 50;
const MAX_DURATION = 600;

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (
    target.closest(
      'input, textarea, select, button, a, [contenteditable="true"], [role="dialog"], [role="menu"], [data-swipe-ignore], [data-radix-scroll-area-viewport]',
    )
  ) {
    return true;
  }
  return false;
}

export function SwipeTabNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.replace(/\/$/, "") || "/";

  useEffect(() => {
    const idx = TAB_ORDER.indexOf(path as TabPath);
    if (idx === -1) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (isInteractive(e.target)) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startT = Date.now();
      tracking = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startT;
      if (dt > MAX_DURATION) return;
      if (Math.abs(dy) > V_TOLERANCE) return;
      if (Math.abs(dx) < H_THRESHOLD) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return;

      const dir = dx < 0 ? 1 : -1; // swipe left -> next
      const next = idx + dir;
      if (next < 0 || next >= TAB_ORDER.length) return;
      navigate({ to: TAB_ORDER[next] });
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [path, navigate]);

  return null;
}