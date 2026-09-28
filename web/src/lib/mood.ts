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
// A free Render service can take up to a minute to wake from sleep, so don't wait on it:
const TIMEOUT_MS = 8_000; // then fall back to asking Open-Meteo directly (the request still wakes the service)
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
  sceneState.sky.phase = mood.phase;
  document.documentElement.dataset.phase = mood.phase;
  const desc = mood.weather?.description ?? "";
  sceneState.sky.rain = /thunder/.test(desc) ? 1 : /heavy/.test(desc) ? 0.85 : /rain|shower/.test(desc) ? 0.6 : /drizzle/.test(desc) ? 0.35 : 0;
  listeners.forEach((l) => l());
  return mood.weather !== null;
}

// --- Direct fallback --------------------------------------------------------
// If the mood service is asleep, down or has no weather reading, the browser
// asks Open-Meteo itself (free, no key, CORS-enabled) and applies the same rules
// as services/mood/app/mood.py, so the weather and colours still show.

const WMO: Record<number, string> = {
  0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "fog",
  51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 61: "light rain", 63: "rain", 65: "heavy rain",
  80: "light showers", 81: "showers", 82: "heavy showers", 95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with hail",
};
const RAIN = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82]);
const STORM = new Set([95, 96, 99]);
const TINTS = { dawn: ["#fb923c", 0.6], day: ["#ec4899", 0], dusk: ["#f97316", 0.65], night: ["#7c3aed", 0.7] } as const;
const OPEN_METEO =
  "https://api.open-meteo.com/v1/forecast?latitude=6.5244&longitude=3.3792&timezone=Africa%2FLagos&forecast_days=1" +
  "&current=temperature_2m,precipitation,weather_code,wind_speed_10m&daily=sunrise,sunset";

/** "HH:MM" of an ISO local time, as minutes since midnight. */
const minutes = (iso: string) => {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return h * 60 + m;
};

async function direct(signal: AbortSignal): Promise<boolean> {
  const res = await fetch(OPEN_METEO, { signal });
  if (!res.ok) return false;
  const data = await res.json();
  const cur = data?.current;
  const sunrise = data?.daily?.sunrise?.[0];
  const sunset = data?.daily?.sunset?.[0];
  if (!cur || typeof sunrise !== "string" || typeof sunset !== "string") return false;
  const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  const now = minutes(`0000-00-00T${clock}`);
  const rise = minutes(sunrise);
  const set = minutes(sunset);
  const phase = Math.abs(now - rise) <= 50 ? "dawn" : Math.abs(now - set) <= 50 ? "dusk" : now > rise && now < set ? "day" : "night";
  const code = Number(cur.weather_code);
  const wind = Number(cur.wind_speed_10m) || 0;
  let turbulence = phase === "night" ? 0.85 : 1;
  let calm = phase === "night" ? 0.9 : 1;
  let energy = 0;
  turbulence *= 1 + Math.min(1, Math.max(0, wind / 40)) * 0.6;
  if (RAIN.has(code) || Number(cur.precipitation) > 0.2) {
    calm *= 0.75;
    turbulence *= 0.8;
  }
  if (STORM.has(code)) {
    turbulence *= 1.35;
    energy = 0.35;
  }
  const [tint, tintMix] = TINTS[phase];
  return apply({
    local_time: clock,
    phase,
    weather: { temperature_c: Number(cur.temperature_2m), description: WMO[code] ?? "unsettled" },
    params: { turbulence, calm, energy, tint, tint_mix: tintMix },
  });
}

let started = false;

/**
 * Fetch the mood now, then every 15 minutes while the page is open. A free
 * server that's still waking (or a missing weather reading) is retried after
 * 10, 20, 40… seconds, up to 5 minutes apart, instead of waiting 15 minutes.
 */
export function startMood() {
  if (started || typeof window === "undefined") return;
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
      if (URL) {
        const res = await fetch(`${URL}/mood`, { signal: abort.signal });
        if (res.ok) complete = apply(await res.json());
      }
    } catch {
      // Asleep, offline or blocked: fall through to the direct fetch.
    }
    try {
      if (!complete) complete = await direct(AbortSignal.timeout(10_000));
    } catch {
      // Offline too: keep the default look for now.
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
