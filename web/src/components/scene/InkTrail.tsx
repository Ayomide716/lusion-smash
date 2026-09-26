"use client";

import { useEffect, useRef } from "react";
import { FIELD_SIZE, loadEngine, type Engine } from "@/lib/engine";
import { getTheme } from "@/lib/theme";

/**
 * Draws the WebAssembly fluid's ink field: an 80×80 canvas stretched to the
 * viewport and blurred, so the cursor leaves soft pink ink that the
 * Navier–Stokes flow swirls and fades. Reads the engine's memory directly;
 * the particle scene drives the simulation, so no scene means no ink.
 */
export function InkTrail() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || !fine || reduce) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const n = FIELD_SIZE;
    const image = ctx.createImageData(n, n);
    const px = image.data;
    let engine: Engine | null = null;
    let frame = 0;
    let cancelled = false;
    loadEngine().then((e) => {
      if (!cancelled) engine = e;
    });

    const draw = () => {
      frame = requestAnimationFrame(draw);
      if (!engine || document.hidden) return;
      const ink = engine.ink;
      const dark = getTheme() === "dark";
      // Pink-500 on white; pink-400 (and a touch stronger) on dark.
      const [r, g, b, gain] = dark ? [244, 114, 182, 4] : [236, 72, 153, 3.4];
      for (let j = 0; j < n; j++) {
        const row = (n - 1 - j) * n; // fluid row 0 is the bottom of the screen
        for (let i = 0; i < n; i++) {
          const o = (row + i) * 4;
          px[o] = r;
          px[o + 1] = g;
          px[o + 2] = b;
          px[o + 3] = Math.min(255, ink[j * n + i] * gain);
        }
      }
      ctx.putImageData(image, 0, 0);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      width={FIELD_SIZE}
      height={FIELD_SIZE}
      className="pointer-events-none fixed inset-0 -z-[5] h-full w-full opacity-70 blur-2xl print:hidden"
    />
  );
}
