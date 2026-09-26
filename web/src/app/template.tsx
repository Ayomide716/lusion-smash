"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

// The intro curtain covers the very first load; the wipe is for navigations after it.
const mounts = { count: 0 };

/** Page transition: a pink panel sweeps up to reveal each newly navigated page. */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [first] = useState(() => mounts.count === 0);
  useEffect(() => {
    mounts.count++;
  }, []);
  const skip = first || reduce;

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
        initial={skip ? false : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
