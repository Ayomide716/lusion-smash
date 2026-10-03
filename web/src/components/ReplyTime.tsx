"use client";

import { useSyncExternalStore } from "react";

/** Hours (Lagos time) when replies are usually quick. */
const AWAKE_FROM = 8;
const AWAKE_UNTIL = 22;

function lagosHour() {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date()));
}

/** Re-check once a minute. */
function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}

const getOnline = () => {
  const h = lagosHour();
  return h >= AWAKE_FROM && h < AWAKE_UNTIL;
};

/** True during Lagos working hours; null on the server (the clock is the visitor's). */
export function useOnline() {
  return useSyncExternalStore(subscribe, getOnline, () => null);
}

/** "Online now · usually replies within an hour", or when to expect a reply. */
export function ReplyTime({ className }: { className?: string }) {
  const online = useOnline();
  if (online === null) return null;
  return (
    <p className={`flex items-center gap-2 text-sm ${className ?? ""}`}>
      <span aria-hidden className="relative flex size-2">
        {online && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70 motion-reduce:hidden" />}
        <span className={`relative size-2 rounded-full ${online ? "bg-emerald-400" : "bg-current opacity-40"}`} />
      </span>
      {online ? "Online now · usually replies within an hour" : "It's night in Lagos · replies first thing in the morning"}
    </p>
  );
}
