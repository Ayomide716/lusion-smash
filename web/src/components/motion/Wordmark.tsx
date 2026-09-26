"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/** Giant name that rises letter by letter when the footer scrolls into view. */
export function Wordmark({ text }: { text: string }) {
  const reduce = useReducedMotion();
  return (
    <p aria-label={text} className="flex overflow-hidden font-display text-[9vw] leading-[0.85] font-bold tracking-[-0.06em] whitespace-nowrap select-none">
      {[...text].map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          data-reveal
          className={ch === " " ? "w-[0.25em]" : "inline-block"}
          initial={reduce ? false : { y: "100%" }}
          whileInView={{ y: "0%" }}
          viewport={{ once: true, margin: "0px 0px -5% 0px" }}
          transition={reduce ? { duration: 0 } : { duration: 1, delay: i * 0.035, ease: [0.16, 1, 0.3, 1] }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </p>
  );
}
