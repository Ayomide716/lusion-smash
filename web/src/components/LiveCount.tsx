"use client";

import { useSyncExternalStore } from "react";
import { getPresenceCount, subscribePresence } from "@/lib/presence";

/** "3 here now": only shown when someone else is on the site too. */
export function LiveCount({ className = "" }: { className?: string }) {
  const n = useSyncExternalStore(subscribePresence, getPresenceCount, () => 0);
  if (n < 2) return null;
  return (
    <span
      title="People on this site right now"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-fg/70 ${className}`}
    >
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inset-0 rounded-full bg-accent/60 motion-safe:animate-ping" />
        <span className="relative size-2 rounded-full bg-accent" />
      </span>
      {n} here now
    </span>
  );
}
