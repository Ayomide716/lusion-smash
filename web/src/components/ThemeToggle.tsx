"use client";

import { useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { getTheme, subscribeTheme, toggleTheme } from "@/lib/theme";

/** Sun ↔ moon: the sun's rays retract and a bite slides across to make a crescent. */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, () => getTheme() === "dark", () => false);
  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      data-cursor={dark ? "Light" : "Dark"}
      onClick={(e) => toggleTheme(e.clientX || undefined, e.clientY || undefined)}
      className="flex size-10 items-center justify-center rounded-full text-fg/80 transition-colors hover:bg-fg/5 hover:text-fg"
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <mask id="moon-bite">
          <rect width="24" height="24" fill="white" />
          <motion.circle
            r="7"
            fill="black"
            initial={false}
            animate={{ cx: dark ? 16 : 30, cy: dark ? 8 : 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </mask>
        <motion.circle
          cx="12"
          cy="12"
          fill="currentColor"
          mask="url(#moon-bite)"
          initial={false}
          animate={{ r: dark ? 8 : 5 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
        <g
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`origin-center transition-all duration-500 ease-out-expo ${dark ? "scale-50 rotate-90 opacity-0" : ""}`}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="12" y1="1.5" x2="12" y2="3.5" transform={`rotate(${a} 12 12)`} />
          ))}
        </g>
      </svg>
    </button>
  );
}
