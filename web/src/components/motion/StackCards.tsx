"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useReducedMotion } from "@/lib/useReducedMotion";

type Item = { title: string; body: string };

const TONES = [
  "bg-panel text-fg border-line",
  "bg-accent-soft text-fg border-accent/15",
  "bg-fg text-canvas border-fg",
];

function Card({ item, i, n, progress }: { item: Item; i: number; n: number; progress: MotionValue<number> }) {
  const reduce = useReducedMotion();
  // Earlier cards shrink a little as later ones slide over them.
  const scale = useTransform(progress, [i / n, 1], [1, 1 - (n - 1 - i) * 0.05]);
  return (
    <li className="sticky" style={{ top: `calc(6.5rem + ${i * 1.75}rem)` }}>
      <motion.article
        style={reduce ? undefined : { scale }}
        className={`grid origin-top gap-6 rounded-[2rem] border p-8 shadow-[0_30px_80px_-40px_rgb(219_39_119/0.35)] md:min-h-[22rem] md:grid-cols-[10rem_1fr] md:p-12 ${TONES[i % TONES.length]}`}
      >
        <span className="font-display text-7xl leading-none font-bold tracking-[-0.06em] text-accent md:text-8xl">0{i + 1}</span>
        <div className="self-end">
          <h3 className="font-display text-3xl font-bold tracking-[-0.03em] md:text-5xl">{item.title}</h3>
          <p className="mt-4 max-w-xl text-lg opacity-75">{item.body}</p>
        </div>
      </motion.article>
    </li>
  );
}

/** Principles as sticky cards that stack on top of each other while scrolling. */
export function StackCards({ items }: { items: Item[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return (
    <ul ref={ref} className="mt-20 space-y-[14vh] pb-[4vh]">
      {items.map((item, i) => (
        <Card key={item.title} item={item} i={i} n={items.length} progress={scrollYProgress} />
      ))}
    </ul>
  );
}
