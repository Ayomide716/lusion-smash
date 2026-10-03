"use client";

import { useEffect, useRef } from "react";
import { getIntroDone, sceneState, subscribeIntro } from "@/lib/scene-store";
import { say } from "@/lib/say";

const MAX = 14;
/** The last name typed, kept on this device only, for "welcome back". */
const STORE = "visitor-name";

function storage(kind: "local" | "session") {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null; // blocked (private mode, strict settings)
  }
}

/** Returning visitors are greeted by name, once per visit, after the intro. */
function useWelcomeBack() {
  useEffect(() => {
    const name = storage("local")?.getItem(STORE);
    const session = storage("session");
    if (!name || session?.getItem("welcomed")) return;
    let timer: number | undefined;
    const greet = () => {
      session?.setItem("welcomed", "1");
      timer = window.setTimeout(() => say(`WELCOME BACK, ${name}`, 4500), 1200);
    };
    if (getIntroDone()) {
      greet();
      return () => window.clearTimeout(timer);
    }
    const unsubscribe = subscribeIntro(() => {
      unsubscribe();
      greet();
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);
}

/** "Type your name": the particles swirl apart and spell whatever is typed. */
export function NameSpell({ className }: { className?: string }) {
  const timer = useRef<number | undefined>(undefined);
  useWelcomeBack();

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
            // Remembered for next time; clearing the box forgets it.
            if (value) storage("local")?.setItem(STORE, value);
            else storage("local")?.removeItem(STORE);
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
