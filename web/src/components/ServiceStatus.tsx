"use client";

import { useSyncExternalStore } from "react";
import { getMood, moodConfigured, subscribeMood } from "@/lib/mood";
import { getPresenceStatus, subscribePresence } from "@/lib/presence";

type State = "live" | "waking" | "off";

const LABEL: Record<State, string> = { live: "Live", waking: "Waking up", off: "Not configured" };

/** Live status of an optional service, from the site's own connection to it. */
export function ServiceStatus({ service }: { service: "mood" | "presence" }) {
  const state = useSyncExternalStore<State>(
    service === "mood" ? subscribeMood : subscribePresence,
    () => {
      if (service === "mood") return getMood() ? "live" : moodConfigured ? "waking" : "off";
      const s = getPresenceStatus();
      return s === "live" ? "live" : s === "connecting" ? "waking" : "off";
    },
    () => "waking",
  );
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${state === "live" ? "bg-accent/15 text-accent" : "bg-fg/5 text-fg/60"}`}
    >
      {LABEL[state]}
    </span>
  );
}
