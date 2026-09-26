"use client";

import { useSyncExternalStore } from "react";
import { getStats, subscribeStats } from "@/lib/scene-store";

const serverStats = { backend: "Starting", particles: 0, fps: 0, motion: "—", engineMs: null } as const;

export function LiveStats() {
  const stats = useSyncExternalStore(subscribeStats, getStats, () => serverStats);
  const items = [
    { label: "Renderer", value: stats.backend },
    { label: "GPU particles", value: stats.particles ? stats.particles.toLocaleString() : "—" },
    { label: "Frame rate", value: stats.fps ? `${stats.fps} fps` : "—" },
    { label: "WASM fluid", value: stats.engineMs === null ? "—" : `${stats.engineMs.toFixed(2)} ms` },
    { label: "Motion", value: stats.motion },
  ];
  return (
    <dl className="glass grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-line sm:grid-cols-3 lg:grid-cols-5" aria-live="off">
      {items.map((i) => (
        <div key={i.label} className="bg-ink-2/90 p-5 md:p-6">
          <dt className="font-mono text-[11px] tracking-widest text-muted uppercase">{i.label}</dt>
          <dd className="mt-2 text-xl font-semibold tabular-nums md:text-2xl">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
