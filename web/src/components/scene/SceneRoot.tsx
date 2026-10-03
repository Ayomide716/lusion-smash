"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { startMood } from "@/lib/mood";
import { startHolidays } from "@/lib/holidays";
import { startPresence } from "@/lib/presence";
import { FluidSmoke } from "./FluidSmoke";
import { PeerCursors } from "./PeerCursors";

// The GPU scene is client-only and loaded after the page is interactive,
// so the text content never waits on three.js.
const SceneCanvas = dynamic(() => import("./SceneCanvas"), { ssr: false });

export function SceneRoot() {
  // The optional live services (step 4) connect once the page has settled, so
  // they never compete with first paint. Both are no-ops without their URLs.
  useEffect(() => {
    const start = () => {
      startMood();
      startPresence();
      startHolidays();
    };
    const idle = window.requestIdleCallback?.(start, { timeout: 3000 }) ?? window.setTimeout(start, 1500);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  return (
    <>
      {/* Behind the canvas while it boots, and the whole backdrop if the scene can't run. */}
      <div aria-hidden className="scene-fallback pointer-events-none fixed inset-0 -z-20 overflow-hidden print:hidden">
        <div className="absolute top-[18%] left-[58%] size-[42vmax] rounded-full bg-pink/25 blur-[90px] motion-safe:animate-[drift_18s_ease-in-out_infinite]" />
        <div className="absolute top-[55%] left-[12%] size-[34vmax] rounded-full bg-accent-soft blur-[80px] motion-safe:animate-[drift_22s_ease-in-out_infinite_reverse]" />
      </div>
      <SceneCanvas />
      <FluidSmoke />
      <PeerCursors />
    </>
  );
}
