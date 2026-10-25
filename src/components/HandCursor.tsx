"use client";

import { useEffect, useRef } from "react";
import { trackedHands } from "@/lib/engine";

const CLICKABLE = "button, a[href], label, [data-hand-target], [data-clickable]";
const DWELL_MS = 1000;

/**
 * Point your index finger at the screen to move the cursor. Hold it on a button for a
 * second (the ring fills up) to pick it. No pinch needed, so pinches stay free for the music.
 *
 * Runs its own animation loop and writes straight to the DOM: no React state per frame.
 */
export function HandCursor() {
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const dot = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let raf = 0;
    let smooth: { x: number; y: number } | null = null;
    let hovered: Element | null = null;
    let since = 0;
    let cooldown = 0;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const el = root.current;
      if (!el) return;
      const hands = trackedHands();
      const hand = hands.find((h) => h.side === "right") ?? hands[0];
      if (!hand) {
        el.style.opacity = "0";
        hovered?.removeAttribute("data-hover");
        hovered = null;
        smooth = null;
        return;
      }
      // A comfortable box in the middle of the camera frame reaches the whole screen.
      const tx = Math.min(1, Math.max(0, (hand.index[0] - 0.15) / 0.7)) * window.innerWidth;
      const ty = Math.min(1, Math.max(0, (hand.index[1] - 0.1) / 0.65)) * window.innerHeight;
      smooth = smooth ? { x: smooth.x + (tx - smooth.x) * 0.4, y: smooth.y + (ty - smooth.y) * 0.4 } : { x: tx, y: ty };
      el.style.opacity = "1";
      el.style.transform = `translate(${smooth.x}px, ${smooth.y}px)`;

      const now = performance.now();
      const target = document.elementFromPoint(smooth.x, smooth.y)?.closest(CLICKABLE) ?? null;
      if (target !== hovered) {
        hovered?.removeAttribute("data-hover");
        target?.setAttribute("data-hover", "true");
        hovered = target;
        since = now;
      }
      const usable = target && !(target as HTMLButtonElement).disabled && now > cooldown;
      const p = usable ? Math.min(1, (now - since) / DWELL_MS) : 0;
      ring.current?.setAttribute("stroke-dashoffset", String(138 * (1 - p)));
      dot.current?.setAttribute("r", String(6 + p * 5));
      if (usable && p >= 1) {
        cooldown = now + 900;
        since = now + 900;
        (target as HTMLElement).click();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      hovered?.removeAttribute("data-hover");
    };
  }, []);

  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[60] opacity-0" style={{ willChange: "transform" }}>
      <div className="-translate-x-1/2 -translate-y-1/2">
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="22" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" />
          <circle ref={ring} cx="28" cy="28" r="22" fill="none" stroke="#fff" strokeWidth="3.5" strokeDasharray={138} strokeDashoffset={138} transform="rotate(-90 28 28)" strokeLinecap="round" />
          <circle ref={dot} cx="28" cy="28" r="6" fill="#fff" />
        </svg>
      </div>
    </div>
  );
}
