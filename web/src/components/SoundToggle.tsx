"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isSoundOn, playClick, playHover, setSound, subscribeSound } from "@/lib/sound";

/** Nav toggle with an animated equaliser; also wires hover/click sounds site-wide. */
export function SoundToggle({ className }: { className?: string }) {
  const on = useSyncExternalStore(subscribeSound, isSoundOn, () => false);

  useEffect(() => {
    const over = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest("a, button");
      const from = (e.relatedTarget as Element | null)?.closest("a, button");
      if (el && el !== from) playHover();
    };
    const down = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest("a, button")) playClick();
    };
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    return () => {
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
    };
  }, []);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
      data-cursor={on ? "Mute" : "Sound"}
      onClick={() => setSound(!on)}
      className={`flex h-10 items-center gap-2 rounded-full px-3 text-xs font-medium text-fg/70 transition-colors hover:bg-fg/5 hover:text-fg ${className ?? ""}`}
    >
      <span aria-hidden className="flex h-3.5 items-end gap-[2px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-[2px] rounded-full bg-accent"
            style={{
              height: on ? undefined : "3px",
              animation: on ? `eq 0.9s ${i * 0.15}s ease-in-out infinite alternate` : undefined,
            }}
          />
        ))}
      </span>
      <span className="hidden lg:inline">{on ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
