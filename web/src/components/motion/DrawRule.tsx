"use client";

import { motion, MotionConfig } from "motion/react";

/** A horizontal accent rule that draws itself left to right when scrolled into view. */
export function DrawRule({ delay = 0, className = "" }: { delay?: number; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.span
        aria-hidden
        className={`block h-px origin-left bg-accent ${className}`}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </MotionConfig>
  );
}
