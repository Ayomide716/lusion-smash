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
