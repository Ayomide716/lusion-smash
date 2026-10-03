"use client";

import { useSyncExternalStore } from "react";

const BUILT = Date.parse(process.env.BUILD_TIME ?? "");
const DAY = 86_400_000;

function label() {
  if (!Number.isFinite(BUILT)) return null;
  const days = Math.floor((Date.now() - BUILT) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(BUILT).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const noop = () => () => {};

/** "Last updated 2 days ago", from the time this deploy was built. */
export function LastUpdated() {
  const text = useSyncExternalStore(noop, label, () => null);
  if (!text) return null;
  return <span title={new Date(BUILT).toUTCString()}>Last updated {text}</span>;
}
