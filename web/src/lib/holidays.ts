// Holiday modes, by the visitor's own calendar. Preview any of them with
// ?holiday=christmas (or valentine, independence, halloween, newyear).
import { getIntroDone, subscribeIntro } from "./scene-store";
import { say } from "./say";

export type Holiday = {
  id: "valentine" | "independence" | "halloween" | "christmas" | "newyear";
  /** Spelled once per visit, after the intro. */
  greeting: string;
  /** Particle tint (linear RGB) for the day. */
  tint?: [number, number, number];
  /** The loose "dust" particles fall as snow. */
  snow?: boolean;
  /** Every tap sets off rainbow fireworks. */
  fireworks?: boolean;
};

function holidayOn(date: Date): Holiday | null {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const y = date.getFullYear();
  if (m === 2 && d === 14) return { id: "valentine", greeting: "♥" };
  if (m === 10 && d === 1) return { id: "independence", greeting: `NIGERIA AT ${y - 1960} 🇳🇬`, tint: [0, 0.242, 0.088] };
  if (m === 10 && d >= 29) return { id: "halloween", greeting: "BOO! 🎃", tint: [0.947, 0.168, 0.008] };
  if (m === 12 && d >= 20 && d <= 30) return { id: "christmas", greeting: "MERRY CHRISTMAS", snow: true };
  if ((m === 12 && d === 31) || (m === 1 && d <= 2)) return { id: "newyear", greeting: `HAPPY ${m === 12 ? y + 1 : y}`, fireworks: true };
  return null;
}

const PREVIEW: Record<Holiday["id"], string> = {
  valentine: "2026-02-14",
  independence: "2026-10-01",
  halloween: "2026-10-31",
  christmas: "2026-12-24",
  newyear: "2026-12-31",
};

let cached: Holiday | null | undefined;

export function currentHoliday(): Holiday | null {
  if (cached !== undefined) return cached;
  if (typeof window === "undefined") return null;
  const preview = new URLSearchParams(window.location.search).get("holiday") as Holiday["id"] | null;
  cached = holidayOn(preview && preview in PREVIEW ? new Date(`${PREVIEW[preview]}T12:00:00`) : new Date());
  return cached;
}

/** Greet the visitor for the day, once per visit, once the intro has lifted. */
export function startHolidays() {
  const holiday = currentHoliday();
  if (!holiday) return;
  const key = `greeted-${holiday.id}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {}
  const greet = () => window.setTimeout(() => say(holiday.greeting, 4500), 900);
  if (getIntroDone()) greet();
  else {
    const off = subscribeIntro(() => {
      off();
      greet();
    });
  }
}
