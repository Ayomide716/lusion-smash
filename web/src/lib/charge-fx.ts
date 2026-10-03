// Feedback for hold-to-charge beyond the particles: vibration (and sound).
// The charge itself starts building 250ms into a press (see simulation.ts),
// so the effects wait for that too and plain taps stay silent.
import { sceneState } from "./scene-store";
import { buzzCharge, buzzRelease, buzzStop } from "./haptics";

const DELAY_MS = 250;
let timer: number | undefined;
let charging = false;

export const chargeFx = {
  press() {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!sceneState.charge.held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      charging = true;
      buzzCharge();
    }, DELAY_MS);
  },
  /** `level` is the charge released into a supernova, or null for a fizzle. */
  end(level: number | null) {
    window.clearTimeout(timer);
    if (!charging) return;
    charging = false;
    if (level === null) buzzStop();
    else buzzRelease(level);
  },
};
