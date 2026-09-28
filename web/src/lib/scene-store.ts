// Frame-rate state shared between the DOM and the WebGPU scene.
// Hot values (pointer, scroll) are plain mutable fields read inside the render
// loop, so they never trigger React renders. Only the low-frequency `stats`
// snapshot is exposed to React via subscribe/getStats.

export type SceneStats = {
  backend: "WebGPU" | "WebGL 2" | "Static" | "Starting";
  particles: number;
  fps: number;
  motion: "Full" | "Reduced" | "—";
  /** Average cost of one WebAssembly engine frame, or null before it loads. */
  engineMs: number | null;
};

type Listener = () => void;

const listeners = new Set<Listener>();

let stats: SceneStats = { backend: "Starting", particles: 0, fps: 0, motion: "—", engineMs: null };

export const sceneState = {
  /** Pointer in normalised device coordinates (-1..1). */
  pointer: { x: 0, y: 0, active: false },
  /** Page-level energy spike (e.g. hovering a project), decays in the loop. */
  energy: 0,
  /** Last click in NDC and seconds since it (large = no active shockwave). */
  shock: { x: 0, y: 0, age: 99, power: 1 },
  /** Press and hold: particles are drawn in (level 0..1), and burst on release. */
  charge: { held: false, x: 0, y: 0, since: 0, level: 0 },
  /** Word the particles should spell while something with data-particles is hovered. */
  word: null as string | null,
  /** A visitor's name typed into the hero; spelled while the hero is on screen. */
  name: null as string | null,
  /** When the visitor last moved, scrolled, tapped or typed (performance.now()). */
  lastInput: 0,
  /** Device tilt on phones, -1..1 per axis. */
  tilt: { x: 0, y: 0 },
  /**
   * Targets from the mood service (Lagos time of day and weather); the scene
   * eases towards them. Defaults are the site's own look.
   */
  mood: {
    turbulence: 1,
    calm: 1,
    energy: 0,
    tintMix: 0,
    /** Linear RGB. */
    tint: [0.838, 0.064, 0.319] as [number, number, number],
  },
  /** Sky over the page (drawn in PostFX): Lagos phase of day, and rain from 0 to 1. */
  sky: { phase: null as "dawn" | "day" | "dusk" | "night" | null, rain: 0 },
};

export function getStats(): SceneStats {
  return stats;
}

export function setStats(next: Partial<SceneStats>) {
  stats = { ...stats, ...next };
  listeners.forEach((l) => l());
}

// Intro curtain: lifted once the scene has drawn (or after a timeout). The hero
// waits for it so its entrance isn't hidden behind the curtain.
let introDone = false;
const introListeners = new Set<Listener>();

export function getIntroDone() {
  return introDone;
}

export function markIntroDone() {
  if (introDone) return;
  introDone = true;
  introListeners.forEach((l) => l());
}

export function subscribeIntro(listener: Listener) {
  introListeners.add(listener);
  return () => {
    introListeners.delete(listener);
  };
}

export function subscribeStats(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
