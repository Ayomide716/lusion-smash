"use client";

import { useEffect, useRef, useState } from "react";
import { getStats, markIntroDone, subscribeStats } from "@/lib/scene-store";
import { site } from "@/content/site";

const MIN_MS = 900;
const MAX_MS = 2600;

/**
 * Full-screen curtain shown while the GPU scene boots, so the first thing people
 * see is a deliberate entrance instead of content popping in piece by piece.
 * CSS lifts it on its own after 3.2s, so it can never trap the page.
 */
export function Intro() {
  const [done, setDone] = useState(false);
  const counter = useRef<HTMLSpanElement>(null);
  const ready = useRef(false);

  // Counter creeps towards 90% while the scene boots, then races to 100.
  useEffect(() => {
    let frame = 0;
    let shown = 0;
    const tick = () => {
      const target = ready.current ? 100 : 90;
      shown += (target - shown) * (ready.current ? 0.2 : 0.035);
      if (counter.current) counter.current.textContent = String(Math.min(100, Math.round(shown))).padStart(3, "0");
      if (shown < 99.5) frame = requestAnimationFrame(tick);
      else if (counter.current) counter.current.textContent = "100";
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const start = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      ready.current = true;
      const wait = Math.max(0, MIN_MS - (performance.now() - start));
      window.setTimeout(() => {
        setDone(true);
        // Let the curtain start moving before the hero animates in underneath.
        window.setTimeout(markIntroDone, 350);
      }, wait);
    };
    const check = () => {
      const { backend, fps } = getStats();
      if (backend === "Static" || fps > 0) finish();
    };
    const unsubscribe = subscribeStats(check);
    const timeout = window.setTimeout(finish, MAX_MS);
    check();
    return () => {
      unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      aria-hidden
      data-done={done}
      className="intro-curtain pointer-events-none fixed inset-0 z-[90] flex flex-col items-center justify-center bg-canvas print:hidden"
    >
      <p className="font-display text-sm tracking-[0.3em] text-fg uppercase">{site.name}</p>
      <div className="mt-6 h-px w-48 overflow-hidden bg-line">
        <div className="intro-bar h-full origin-left bg-accent" />
      </div>
      <span
        ref={counter}
        data-intro-counter
        className="absolute right-6 bottom-4 font-display text-[22vw] leading-none font-bold tracking-[-0.06em] text-accent tabular-nums md:right-10 md:text-[14vw]"
      >
        000
      </span>
      <span className="absolute bottom-8 left-6 font-mono text-xs tracking-widest text-muted uppercase md:left-10">
        Loading experience
      </span>
    </div>
  );
}
