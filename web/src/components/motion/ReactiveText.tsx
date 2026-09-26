"use client";

import { useEffect, useRef } from "react";

const MIN = 400;
const MAX = 700;
const RADIUS = 260; // px of influence around the cursor

/**
 * Letters thin out (variable font weight axis) as the cursor passes over them,
 * like a lens moving across the word. Fine pointers only; static under reduced motion.
 */
export function ReactiveText({ text }: { text: string }) {
  const letters = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    const els = letters.current.filter((e): e is HTMLSpanElement => !!e);
    const current = els.map(() => MAX);
    const target = els.map(() => MAX);
    let frame = 0;
    let running = false;

    const tick = () => {
      let moving = false;
      els.forEach((el, i) => {
        const next = current[i] + (target[i] - current[i]) * 0.15;
        if (Math.abs(next - current[i]) > 0.5) moving = true;
        current[i] = next;
        el.style.fontVariationSettings = `"wght" ${next.toFixed(0)}`;
      });
      running = moving;
      if (moving) frame = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!running) {
        running = true;
        frame = requestAnimationFrame(tick);
      }
    };
    const move = (e: PointerEvent) => {
      els.forEach((el, i) => {
        const b = el.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2));
        const t = Math.max(0, 1 - d / RADIUS);
        // Thin under the cursor, full weight away from it.
        target[i] = MAX - (MAX - MIN) * t * t * (3 - 2 * t);
      });
      kick();
    };
    const leave = () => {
      target.fill(MAX);
      kick();
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [text]);

  return (
    <span>
      <span className="sr-only">{text}</span>
      {[...text].map((ch, i) => (
        <span
          key={i}
          aria-hidden
          ref={(el) => {
            letters.current[i] = el;
          }}
          className="inline-block"
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
