"use client";

import { useEffect, useRef } from "react";
import { peers } from "@/lib/presence";

const MAX_SHOWN = 12;

/**
 * Other visitors' cursors as faint rings. Positions come from the presence
 * service and are smoothed by the scene loop; this just places DOM nodes in a
 * rAF, so React never re-renders for them.
 */
export function PeerCursors() {
  const layer = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={layer} aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden print:hidden">
      {Array.from({ length: MAX_SHOWN }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 left-0 -mt-3 -ml-3 size-6 rounded-full border border-accent/50 bg-accent/10 opacity-0 transition-opacity duration-700 motion-safe:animate-[peer_2.4s_ease-in-out_infinite]"
        />
      ))}
    </div>
  );
}
