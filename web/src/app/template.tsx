"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { sceneState } from "@/lib/scene-store";

// The intro curtain covers the very first load; transitions are for navigations after it.
const mounts = { count: 0 };

/**
 * Page transition: a pink curtain sweeps up off the new page while, behind it,
 * the particle field blasts outward from the centre and reassembles into the
 * new page's shapes; the page itself fades up.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [first] = useState(() => mounts.count === 0);
  const skip = first || reduce;

  useEffect(() => {
    mounts.count++;
    if (skip) return;
    sceneState.shock.x = 0;
    sceneState.shock.y = 0;
    sceneState.shock.age = 0;
    sceneState.shock.power = 1;
    sceneState.energy = 1;
  }, [skip]);

  return (
    <>
      {!skip && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[80] bg-accent print:hidden"
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          animate={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        />
      )}
      <motion.div
        initial={skip ? false : { opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
