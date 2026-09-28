"use client";

import { useEffect, useRef } from "react";
import { sceneState } from "@/lib/scene-store";

const MAX = 14;

/** "Type your name": the particles swirl apart and spell whatever is typed. */
export function NameSpell({ className }: { className?: string }) {
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      sceneState.name = null;
    },
    [],
  );

  return (
    <label className={className}>
      <span className="sr-only">Type your name and the particles spell it</span>
      <span aria-hidden className="text-accent">
        ✦
      </span>
      <input
        type="text"
        maxLength={MAX}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        placeholder="Type your name →"
        className="w-40 bg-transparent text-base text-fg md:text-xs placeholder:text-fg/60 focus:outline-none sm:w-44"
        onChange={(e) => {
          const value = e.target.value.trim().toUpperCase();
          window.clearTimeout(timer.current);
          // Wait for a pause in typing, so each keystroke doesn't restart the morph.
          timer.current = window.setTimeout(() => {
            sceneState.name = value || null;
            if (value) sceneState.energy = Math.max(sceneState.energy, 0.6);
          }, 280);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}
