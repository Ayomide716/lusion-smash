"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";

/**
 * Infinite marquee whose speed and skew react to scroll velocity: scrolling
 * down pushes it faster, scrolling up reverses it, and it eases back after.
 */
export function Marquee({ children, speed = 40, className }: { children: ReactNode; speed?: number; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const track = useRef<HTMLDivElement>(null);
  const direction = useRef(1);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 300 });
  const boost = useTransform(velocity, [-2000, 0, 2000], [-4, 0, 4], { clamp: false });
  const skew = useTransform(velocity, [-2500, 0, 2500], [6, 0, -6]);

  useAnimationFrame((_, delta) => {
    if (reduce || !track.current) return;
    const half = track.current.scrollWidth / 2;
    if (half === 0) return;
    const b = boost.get();
    if (b < 0) direction.current = -1;
    else if (b > 0) direction.current = 1;
    const move = direction.current * speed * (delta / 1000) * (1 + Math.abs(b));
    let next = x.get() - move;
    // Wrap within one copy's width so the loop is seamless.
    if (next <= -half) next += half;
    if (next > 0) next -= half;
    x.set(next);
  });

  return (
    <div className={`overflow-hidden ${className ?? ""}`}>
      <motion.div ref={track} style={reduce ? undefined : { x, skewX: skew }} className="flex w-max">
        <div className="flex shrink-0 items-center">{children}</div>
        <div aria-hidden className="flex shrink-0 items-center">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
