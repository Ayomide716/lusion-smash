"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * Moves its children against the scroll direction by `speed` × 120px across the
 * element's journey through the viewport. Disabled under reduced motion.
 */
export function Parallax({
  children,
  speed = 0.2,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [speed * 120, -speed * 120]);
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  );
}

/** Oversized outline word drifting behind a section for depth. */
export function ParallaxWord({ text, className = "" }: { text: string; className?: string }) {
  return (
    <Parallax speed={0.6} className={`pointer-events-none absolute -z-10 select-none ${className}`}>
      <span
        aria-hidden
        className="block font-display text-[22vw] leading-none font-bold tracking-[-0.06em] text-transparent uppercase [-webkit-text-stroke:1px_rgb(219_39_119/0.14)]"
      >
        {text}
      </span>
    </Parallax>
  );
}
