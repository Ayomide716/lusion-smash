// Phone vibration for hold-to-charge (Android; iOS has no Vibration API and
// simply ignores it). Off for anyone who prefers reduced motion.

const can = () =>
  typeof navigator !== "undefined" &&
  "vibrate" in navigator &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Faint ticks that get closer and stronger as the charge builds, then a steady buzz. */
export function buzzCharge() {
  if (!can()) return;
  const pattern: number[] = [];
  for (let i = 0; i < 10; i++) pattern.push(6 + i * 2, Math.max(15, 90 - i * 8));
  pattern.push(1500); // full charge: hold a buzz until release (or 1.5s)
  navigator.vibrate(pattern);
}

/** The supernova: one strong pulse, longer the more it was charged. */
export function buzzRelease(level: number) {
  if (!can()) return;
  navigator.vibrate(0);
  navigator.vibrate(Math.round(40 + level * 60));
}

export function buzzStop() {
  if (can()) navigator.vibrate(0);
}
