"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * A pink circle grows from the middle of the section as it scrolls in, flooding
 * it with the accent colour, while the text colour crossfades to white.
 * Reduced motion gets the finished state.
 */
export function CircleReveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.25"] });
  const radius = useTransform(scrollYProgress, [0, 1], [4, 110]);
  const clipPath = useMotionTemplate`circle(${radius}% at 50% 45%)`;
  const color = useTransform(scrollYProgress, [0.4, 0.62], ["#0a0a0b", "#ffffff"]);

  return (
    <motion.div ref={ref} style={reduce ? { color: "#ffffff" } : { color }} className={`relative isolate ${className ?? ""}`}>
      <motion.div aria-hidden style={reduce ? undefined : { clipPath }} className="absolute inset-0 -z-10 bg-accent" />
      {children}
    </motion.div>
  );
}
