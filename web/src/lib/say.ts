// Messages the particles spell for a moment ("WELCOME BACK, SARAH", holiday
// greetings…), one after another. A name being typed or a hovered word
// still takes over; see the word priority in simulation.ts.
import { sceneState } from "./scene-store";

const queue: { text: string; ms: number }[] = [];
let timer: number | undefined;
let busy = false;

function next() {
  const item = queue.shift();
  busy = !!item;
  sceneState.message = item?.text ?? null;
  if (item && Number.isFinite(item.ms)) timer = window.setTimeout(next, item.ms);
}

/** Spell `text` for `ms` (Infinity: until `unsay`), after anything already queued. */
export function say(text: string, ms = 4000) {
  queue.push({ text, ms });
  if (!busy) next();
}

/** Drop the current message and everything queued. */
export function unsay() {
  window.clearTimeout(timer);
  queue.length = 0;
  busy = false;
  sceneState.message = null;
}
