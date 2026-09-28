// Light/dark theme. The attribute on <html> is the source of truth: an inline
// script in <head> sets it before first paint, and this module toggles it with
// a circular view-transition wipe from the click point.
//
// Automatic by the visitor's own clock: dark from 19:00 to 06:00, light
// otherwise. A manual choice wins until the next switch-over (so choosing light
// at night lasts the rest of that night; the next night is dark again).

export type Theme = "light" | "dark";

const KEY = "theme-choice"; // {"t":"dark"|"light","until":<ms>}
const THEME_COLOR: Record<Theme, string> = { light: "#ffffff", dark: "#09090b" };
const DARK_FROM = 19;
const DARK_UNTIL = 6;

const isNight = (d: Date) => d.getHours() >= DARK_FROM || d.getHours() < DARK_UNTIL;

/** When the current day/night period ends (the next 06:00 or 19:00). */
function periodEnd(d: Date) {
  const end = new Date(d);
  end.setMinutes(0, 0, 0);
  if (!isNight(d)) end.setHours(DARK_FROM);
  else {
    if (d.getHours() >= DARK_FROM) end.setDate(end.getDate() + 1);
    end.setHours(DARK_UNTIL);
  }
  return end.getTime();
}

export const themeInitScript = `(function(){try{var d=new Date(),h=d.getHours(),t=(h>=${DARK_FROM}||h<${DARK_UNTIL})?"dark":"light";var c=JSON.parse(localStorage.getItem("${KEY}")||"null");if(c&&(c.t==="dark"||c.t==="light")&&c.until>d.getTime())t=c.t;document.documentElement.setAttribute("data-theme",t);localStorage.removeItem("theme")}catch(e){}})()`;

/** The visitor's manual choice, if it still applies. */
function activeChoice(): Theme | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return c && (c.t === "dark" || c.t === "light") && c.until > Date.now() ? c.t : null;
  } catch {
    return null;
  }
}

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function subscribeTheme(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function apply(theme: Theme, remember: boolean) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  if (!remember) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ t: theme, until: periodEnd(new Date()) }));
  } catch {}
}

let watching = false;

/** Follow the clock while the page is open (e.g. turn dark at 19:00), unless the visitor chose. */
export function watchAutoTheme() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  const check = () => {
    if (activeChoice()) return;
    const auto: Theme = isNight(new Date()) ? "dark" : "light";
    if (getTheme() !== auto) apply(auto, false);
  };
  window.setInterval(check, 60_000);
  document.addEventListener("visibilitychange", () => !document.hidden && check());
}

/** Switch theme; where supported, the new theme grows as a circle from (x, y). */
export function toggleTheme(x = window.innerWidth / 2, y = 0) {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || reduce) {
    apply(next, true);
    return;
  }
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const transition = doc.startViewTransition(() => apply(next, true));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: "cubic-bezier(0.76, 0, 0.24, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
}
