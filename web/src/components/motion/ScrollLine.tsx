"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/** Wraps a list with a vertical accent line that draws itself as you scroll through it. */
export function ScrollLine({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.6"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <div aria-hidden className="absolute top-0 bottom-0 left-0 w-px bg-line" />
      <motion.div
        aria-hidden
        style={reduce ? undefined : { scaleY }}
        className="absolute top-0 bottom-0 left-0 w-px origin-top bg-accent"
      />
      {children}
    </div>
  );
}
