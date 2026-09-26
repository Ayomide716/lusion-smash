"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const start = performance.now();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
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
    </div>
  );
}
