"use client";

import { useEffect, useRef } from "react";
import { animate, useInView } from "motion/react";
import { useReducedMotion } from "@/lib/useReducedMotion";

const NUMBER = /^(\D*?)(\d+(?:\.\d+)?)(.*)$/;

/**
 * Counts the first number in `value` up from zero when scrolled into view,
 * keeping any prefix/suffix ("<150ms", "3.2×"). Server HTML carries the final
 * value, so it reads correctly without JavaScript.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const primed = useRef(false);

  // Before it's seen, show the zero state so the count has somewhere to start.
  useEffect(() => {
    const m = value.match(NUMBER);
    if (!m || reduce || !ref.current || primed.current) return;
    primed.current = true;
    if (!inView) ref.current.textContent = `${m[1]}${(0).toFixed(decimals(m[2]))}${m[3]}`;
  }, [value, reduce, inView]);

  useEffect(() => {
    const m = value.match(NUMBER);
    if (!m || !inView || reduce) return;
    const [, prefix, num, suffix] = m;
    const controls = animate(0, parseFloat(num), {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${prefix}${v.toFixed(decimals(num))}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {value}
    </span>
  );
}

function decimals(num: string) {
  return num.includes(".") ? num.split(".")[1].length : 0;
}
