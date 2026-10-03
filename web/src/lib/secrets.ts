// Secret commands: type a word anywhere on the page (or into the hero name
// box on a phone) and the particles do something.
//   gravity  they fall and pile up on the floor, then fly back
//   party    rainbow confetti with bursts
//   matrix   green digital rain
//   boom     a full-power supernova from the middle of the screen
import { sceneState, type SecretMode } from "./scene-store";

const LASTS: Record<SecretMode, number> = { gravity: 8000, party: 7000, matrix: 8000 };
export const SECRETS = ["gravity", "party", "matrix", "boom"] as const;

/** Run `word` if it's a secret command; returns whether it was one. */
export function runSecret(word: string) {
  const w = word.trim().toLowerCase();
  if (w === "boom") {
    Object.assign(sceneState.shock, { x: 0, y: 0, age: 0, power: 3 });
    sceneState.energy = 1;
    return true;
  }
  if (w in LASTS) {
    const mode = w as SecretMode;
    sceneState.fx.mode = mode;
    sceneState.fx.until = performance.now() + LASTS[mode];
    sceneState.energy = Math.max(sceneState.energy, 0.6);
    return true;
  }
  return false;
}

/** Listen for the words typed on the page (outside form fields). */
export function startSecretKeys() {
  let typed = "";
  const key = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    if ((e.target as Element | null)?.closest("input, textarea, select, [contenteditable]")) return;
    typed = (typed + e.key.toLowerCase()).slice(-12);
    for (const word of SECRETS) {
      if (typed.endsWith(word)) {
        runSecret(word);
        typed = "";
        return;
      }
    }
  };
  window.addEventListener("keydown", key);
  console.log(
    "%c✦ Psst, developer.%c Type one of these anywhere on the page: gravity · party · matrix · boom",
    "color:#ec4899;font-weight:700",
    "color:inherit",
  );
  return () => window.removeEventListener("keydown", key);
}
