// Frame-rate state shared between the DOM and the WebGPU scene.
// Hot values (pointer, scroll) are plain mutable fields read inside the render
// loop, so they never trigger React renders. Only the low-frequency `stats`
// snapshot is exposed to React via subscribe/getStats.

export type SceneStats = {
  backend: "WebGPU" | "WebGL 2" | "Static" | "Starting";
  particles: number;
  fps: number;
  motion: "Full" | "Reduced" | "—";
};

type Listener = () => void;

const listeners = new Set<Listener>();

let stats: SceneStats = { backend: "Starting", particles: 0, fps: 0, motion: "—" };

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

export function subscribeStats(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
