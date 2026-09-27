"use client";

import { useSyncExternalStore } from "react";
import { getMood, subscribeMood } from "@/lib/mood";

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
