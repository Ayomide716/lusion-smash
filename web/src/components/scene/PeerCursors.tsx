"use client";

import { useEffect, useRef } from "react";
import { onRipple, peers } from "@/lib/presence";
import { sceneState } from "@/lib/scene-store";

const MAX_SHOWN = 12;
const MAX_RIPPLES = 8;

/**
 * Other visitors, drawn over the page:
 * - cursors as faint rings (positions come from the presence service and are
 *   smoothed by the scene loop; placed in a rAF, so React never re-renders);
 * - taps and clicks as pink rings that expand and fade, plus a shockwave
 *   through the particles, so phone visitors (who have no cursor) show up too.
 */
export function PeerCursors() {
  const layer = useRef<HTMLDivElement>(null);
  const rippleLayer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = layer.current;
    if (!root) return;
    const dots = Array.from(root.children) as HTMLElement[];
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const w = window.innerWidth;
      const h = window.innerHeight;
      let i = 0;
      for (const peer of peers.values()) {
        if (i >= MAX_SHOWN) break;
        const dot = dots[i++];
        dot.style.opacity = "1";
        dot.style.transform = `translate3d(${((peer.x + 1) / 2) * w}px, ${((1 - peer.y) / 2) * h}px, 0)`;
      }
      for (; i < MAX_SHOWN; i++) dots[i].style.opacity = "0";
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const root = rippleLayer.current;
    if (!root) return;
    return onRipple((x, y) => {
      if (document.hidden || root.childElementCount >= MAX_RIPPLES) return;
      const ring = document.createElement("span");
      ring.className = "peer-ripple";
      ring.style.left = `${((x + 1) / 2) * 100}%`;
      ring.style.top = `${((1 - y) / 2) * 100}%`;
      ring.addEventListener("animationend", () => ring.remove(), { once: true });
      root.appendChild(ring);
      // Ripple the particles too, unless this visitor just clicked themselves.
      if (sceneState.shock.age > 1) {
        sceneState.shock.x = x;
        sceneState.shock.y = y;
        sceneState.shock.age = 0;
        sceneState.shock.power = 1;
      }
    });
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden print:hidden">
      <div ref={rippleLayer} className="absolute inset-0" />
      <div ref={layer} className="absolute inset-0">
        {Array.from({ length: MAX_SHOWN }, (_, i) => (
          <span
            key={i}
            className="absolute top-0 left-0 -mt-3 -ml-3 size-6 rounded-full border border-accent/50 bg-accent/10 opacity-0 transition-opacity duration-700 motion-safe:animate-[peer_2.4s_ease-in-out_infinite]"
          />
        ))}
      </div>
    </div>
  );
}
