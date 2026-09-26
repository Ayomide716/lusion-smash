"use client";

import { useEffect, useRef, useState } from "react";
import { getStats, markIntroDone, subscribeStats } from "@/lib/scene-store";
import { site } from "@/content/site";

// All times are measured from navigation start (performance.now()), the same
// clock the CSS fail-safe runs on, so the two can't drift apart on slow phones.
const MIN_MS = 900; // always show the counter at least this long
const FULL_MS = 2400; // counter reaches 100 by here even if the scene isn't ready

/**
 * Runs in <head> before first paint: the curtain is only for a first visit to
 * the home page in a session. Deep links (a shared case study, the résumé) and
 * reloads open straight onto the content.
 */
export const introInitScript = `(function(){try{var d=document.documentElement;if(location.pathname!=="/"||sessionStorage.getItem("intro-seen")){d.classList.add("no-intro")}else{sessionStorage.setItem("intro-seen","1")}}catch(e){}})()`;

/**
 * Full-screen curtain shown while the GPU scene boots, so the first thing people
 * see is a deliberate entrance instead of content popping in piece by piece.
 * The counter eases towards 90 while loading and only completes when the scene
 * is ready (or time is up); the curtain fades once it reads 100. As a fail-safe
 * for when JavaScript never runs, CSS fades it at 6s regardless, so it can never
 * trap the page.
 */
export function Intro() {
  const [done, setDone] = useState(false);
  const counter = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (document.documentElement.classList.contains("no-intro")) {
      markIntroDone();
      return;
    }
    let ready = false;
    let shown = 0;
    let frame = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      setDone(true);
      // Let the curtain start fading before the hero animates in underneath.
      window.setTimeout(markIntroDone, 350);
    };

    const tick = () => {
      const now = performance.now();
      const t = Math.min(1, now / FULL_MS);
      const byTime = 100 * (1 - Math.pow(1 - t, 3));
      const complete = ready || now >= FULL_MS;
      const target = complete ? 100 : Math.min(90, byTime);
      shown += (target - shown) * (complete ? 0.25 : 0.12);
      const value = shown > 99.5 ? 100 : Math.round(shown);
      if (counter.current) counter.current.textContent = String(value).padStart(3, "0");
      if (value === 100 && now >= MIN_MS) {
        finish();
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const check = () => {
      const { backend, fps } = getStats();
      if (backend === "Static" || fps > 0) ready = true;
    };
    const unsubscribe = subscribeStats(check);
    check();
    frame = requestAnimationFrame(tick);
    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
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
