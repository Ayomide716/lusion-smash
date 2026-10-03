"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/** Giant name that rises letter by letter when the footer scrolls into view. */
export function Wordmark({ text }: { text: string }) {
  const reduce = useReducedMotion();
  // The line (not each letter) watches the viewport: letters start fully below
  // the mask, where they'd never count as "in view" themselves. Bottom padding
  // keeps the g and y descenders inside the mask.
  return (
    <motion.p
      className="flex overflow-hidden pb-[0.16em] font-display text-[9vw] leading-[0.85] font-bold tracking-[-0.06em] whitespace-nowrap select-none"
      initial={reduce ? false : "hidden"}
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -5% 0px" }}
    >
      <span className="sr-only">{text}</span>
      {[...text].map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          data-reveal
          className={ch === " " ? "w-[0.25em]" : "inline-block"}
          variants={{ hidden: { y: "125%" }, shown: { y: "0%" } }}
          transition={reduce ? { duration: 0 } : { duration: 1, delay: i * 0.035, ease: [0.16, 1, 0.3, 1] }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </motion.p>
  );
}
