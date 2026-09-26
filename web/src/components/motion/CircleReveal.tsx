"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionTemplate, useScroll, useTransform } from "motion/react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * A pink circle grows from the middle of the section as it scrolls in, flooding
 * it with the accent colour, while the text colour crossfades from the theme's
 * foreground to the on-accent colour (via a CSS variable, so it follows the theme).
 * Reduced motion gets the finished state.
 */
export function CircleReveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.25"] });
  const radius = useTransform(scrollYProgress, [0, 1], [4, 110]);
  const clipPath = useMotionTemplate`circle(${radius}% at 50% 45%)`;
  const mixPct = useTransform(scrollYProgress, [0.4, 0.62], [0, 100]);
  const reveal = useMotionTemplate`${mixPct}%`;

  return (
    <motion.div
      ref={ref}
      style={{ ["--reveal" as string]: reduce ? "100%" : reveal }}
      className={`relative isolate [color:color-mix(in_oklab,var(--color-fg),var(--color-on-accent)_var(--reveal))] ${className ?? ""}`}
    >
      <motion.div aria-hidden style={reduce ? undefined : { clipPath }} className="absolute inset-0 -z-10 bg-accent" />
      {children}
    </motion.div>
  );
}
