"use client";

import { useSyncExternalStore } from "react";
import { getStats, subscribeStats } from "@/lib/scene-store";

const serverStats = { backend: "Starting", particles: 0, fps: 0, motion: "—" } as const;

export function LiveStats() {
  const stats = useSyncExternalStore(subscribeStats, getStats, () => serverStats);
  const items = [
    { label: "Renderer", value: stats.backend },
    { label: "GPU particles", value: stats.particles ? stats.particles.toLocaleString() : "—" },
    { label: "Frame rate", value: stats.fps ? `${stats.fps} fps` : "—" },
    { label: "Motion", value: stats.motion },
  ];
  return (
    <dl className="glass grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x [&>div:nth-child(n+3)]:border-t [&>div:nth-child(n+3)]:border-line sm:[&>div:nth-child(n+3)]:border-t-0 rounded-3xl" aria-live="off">
      {items.map((i) => (
        <div key={i.label} className="p-5 md:p-6">
          <dt className="font-mono text-[11px] tracking-widest text-muted uppercase">{i.label}</dt>
          <dd className="mt-2 text-xl font-semibold tabular-nums md:text-3xl">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
