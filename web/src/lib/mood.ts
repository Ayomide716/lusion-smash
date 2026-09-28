// Client for the mood service (services/mood): Lagos's time of day and weather,
// turned into gentle scene parameters. Optional: without NEXT_PUBLIC_MOOD_URL,
// or while the free server is waking up, the site keeps its default look.

import { sceneState } from "@/lib/scene-store";

export type Mood = {
  localTime: string;
  phase: "dawn" | "day" | "dusk" | "night";
  weather: { temperatureC: number; description: string } | null;
};

const URL = process.env.NEXT_PUBLIC_MOOD_URL?.replace(/\/$/, "");
const REFRESH_MS = 15 * 60 * 1000;
// A free Render service can take up to a minute to wake from sleep.
const TIMEOUT_MS = 75_000;
const PHASES = new Set(["dawn", "day", "dusk", "night"]);

let mood: Mood | null = null;
/** Whether the service is configured at all (the build inlines the URL). */
export const moodConfigured = Boolean(URL);
const listeners = new Set<() => void>();

export function getMood() {
  return mood;
}

export function subscribeMood(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const num = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

/** sRGB hex → linear RGB (the particle shader works in linear space). */
function hexToLinear(hex: unknown): [number, number, number] | null {
  if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const c = (i: number) => {
    const s = parseInt(hex.slice(i, i + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return [c(1), c(3), c(5)];
}

/** Validate and apply a response. Returns whether it included the weather. */
function apply(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  const p = (b.params ?? {}) as Record<string, unknown>;
  const tint = hexToLinear(p.tint);
  const target = sceneState.mood;
  target.turbulence = num(p.turbulence, 0.5, 1.8, 1);
  target.calm = num(p.calm, 0.5, 1.2, 1);
  target.energy = num(p.energy, 0, 1, 0);
  target.tintMix = tint ? num(p.tint_mix, 0, 1, 0) : 0;
  if (tint) target.tint = tint;

  const w = b.weather as Record<string, unknown> | null;
  mood = {
    localTime: typeof b.local_time === "string" ? b.local_time.slice(0, 5) : "",
    phase: PHASES.has(b.phase as string) ? (b.phase as Mood["phase"]) : "day",
    weather:
      w && typeof w === "object" && typeof w.description === "string"
        ? { temperatureC: Math.round(num(w.temperature_c, -50, 60, 0)), description: w.description.slice(0, 40) }
        : null,
  };
  listeners.forEach((l) => l());
  return mood.weather !== null;
}

let started = false;

/**
 * Fetch the mood now, then every 15 minutes while the page is open. A free
 * server that's still waking (or a missing weather reading) is retried after
 * 10, 20, 40… seconds, up to 5 minutes apart, instead of waiting 15 minutes.
 */
export function startMood() {
  if (started || !URL || typeof window === "undefined") return;
  started = true;
  let retry = 10_000;
  let timer = 0;
  const schedule = (ms: number) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(load, ms);
  };
  async function load() {
    if (document.hidden) {
      // Try again when the tab is visible.
      document.addEventListener("visibilitychange", load, { once: true });
      return;
    }
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), TIMEOUT_MS);
    let complete = false;
    try {
      const res = await fetch(`${URL}/mood`, { signal: abort.signal });
      if (res.ok) complete = apply(await res.json());
    } catch {
      // Asleep, offline or blocked: keep the default look for now.
    } finally {
      window.clearTimeout(timeout);
    }
    if (complete) {
      retry = 10_000;
      schedule(REFRESH_MS);
    } else {
      schedule(retry);
      retry = Math.min(retry * 2, 5 * 60_000);
    }
  }
  load();
}
