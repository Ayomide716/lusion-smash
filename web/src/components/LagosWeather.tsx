"use client";

import { useSyncExternalStore } from "react";
import { getMood, subscribeMood } from "@/lib/mood";

const PHASE_ICON = { dawn: "🌅", day: "☀️", dusk: "🌆", night: "🌙" } as const;

/** "🌆 Lagos · dusk · 27°C": why the particles are the colour they are right now. */
export function MoodChip({ className = "" }: { className?: string }) {
  const mood = useSyncExternalStore(subscribeMood, getMood, () => null);
  if (!mood) return null;
  return (
    <span className={className} title="The particles follow the time and weather in Lagos">
      <span aria-hidden>{PHASE_ICON[mood.phase]}</span> Lagos · {mood.phase}
      {mood.weather ? ` · ${mood.weather.temperatureC}°C` : ""}
    </span>
  );
}

/** "29°C · partly cloudy", live from the mood service; nothing until it answers. */
export function LagosWeather({ className = "" }: { className?: string }) {
  const mood = useSyncExternalStore(subscribeMood, getMood, () => null);
  if (!mood?.weather) return null;
  return (
    <span className={className}>
      {mood.weather.temperatureC}°C · {mood.weather.description}
    </span>
  );
}
