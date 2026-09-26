"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useReducedMotion } from "@/lib/useReducedMotion";

function Word({ word, progress, range, accent }: { word: string; progress: MotionValue<number>; range: [number, number]; accent: boolean }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className={accent ? "text-accent" : undefined}>
      {word}{" "}
    </motion.span>
  );
}

/**
 * A statement whose words light up one by one as it scrolls through the
 * viewport. Words wrapped in *asterisks* are highlighted in the accent colour.
 */
export function ScrollHighlight({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");
  const plain = text.replaceAll("*", "");

  if (reduce) {
    return (
      <p ref={ref} className={className}>
        {words.map((w, i) => (
          <span key={i} className={w.startsWith("*") ? "text-accent" : undefined}>
            {w.replaceAll("*", "")}{" "}
          </span>
        ))}
      </p>
    );
  }

  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{plain}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <Word
            key={i}
            word={w.replaceAll("*", "")}
            accent={w.startsWith("*")}
            progress={scrollYProgress}
            range={[i / words.length, (i + 1) / words.length]}
          />
        ))}
      </span>
    </p>
  );
}
