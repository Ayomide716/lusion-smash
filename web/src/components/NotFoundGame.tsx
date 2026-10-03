"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { sceneState } from "@/lib/scene-store";
import { say, unsay } from "@/lib/say";
import { playClick } from "@/lib/sound";

const ROUND_MS = 30_000;
/** Seconds the 404 takes to rebuild; a hit on a fully rebuilt 404 scores most. */
const REBUILD = 1.6;
const BEST = "smash-best";

type Pop = { id: number; x: number; y: number; text: string };

/** Is a tap (NDC) on the particle "404"? Mirrors how simulation.ts sizes and places words. */
function onWord(x: number, y: number) {
  const aspect = window.innerWidth / window.innerHeight;
  const halfX = Math.min(0.8, 1.4 / aspect);
  const halfY = 0.42 * Math.min(0.8 * aspect, 1.4);
  return Math.abs(x) < halfX * 1.05 && Math.abs(y - 0.05) < halfY * 1.25;
}

// Best score, saved on this device.
const bestListeners = new Set<() => void>();
function readBest() {
  try {
    return Number(localStorage.getItem(BEST)) || 0;
  } catch {
    return 0;
  }
}
function saveBest(score: number) {
  try {
    localStorage.setItem(BEST, String(score));
  } catch {}
  bestListeners.forEach((l) => l());
}
function subscribeBest(listener: () => void) {
  bestListeners.add(listener);
  return () => {
    bestListeners.delete(listener);
  };
}

/**
 * The 404 page is a game: the particles spell "404", and you smash it. Each
 * hit scores more the more the 404 has rebuilt since the last one; a charged
 * supernova (press and hold, then let go) on it scores triple.
 */
export function NotFoundGame() {
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(ROUND_MS);
  const [state, setState] = useState<"ready" | "playing" | "over">("ready");
  const best = useSyncExternalStore(subscribeBest, readBest, () => 0);
  const [newBest, setNewBest] = useState(false);
  const [pops, setPops] = useState<Pop[]>([]);
  const game = useRef({ state: "ready" as "ready" | "playing" | "over", endsAt: 0, lastHit: -Infinity, score: 0, popId: 0 });

  useEffect(() => {
    unsay();
    say("404", Infinity);
    return unsay;
  }, []);

  useEffect(() => {
    const g = game.current;
    const pop = (clientX: number, clientY: number, text: string) => {
      const id = ++g.popId;
      setPops((p) => [...p.slice(-6), { id, x: clientX, y: clientY, text }]);
      window.setTimeout(() => setPops((p) => p.filter((q) => q.id !== id)), 900);
    };
    const ndc = (e: PointerEvent) => [(e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1] as const;
    const ignored = (e: PointerEvent) => !!(e.target as Element | null)?.closest("a, button, input, textarea");

    const hit = (e: PointerEvent, multiplier: number) => {
      const now = performance.now();
      if (g.state === "over") return;
      if (g.state === "ready") {
        g.state = "playing";
        g.endsAt = now + ROUND_MS;
        setState("playing");
      }
      const [x, y] = ndc(e);
      if (!onWord(x, y)) return;
      const rebuilt = Math.min(1, (now - g.lastHit) / 1000 / REBUILD);
      const points = Math.round((10 + 90 * rebuilt) * multiplier);
      g.lastHit = now;
      g.score += points;
      setScore(g.score);
      pop(e.clientX, e.clientY, multiplier > 1 ? `SUPERNOVA +${points}` : `+${points}`);
      playClick();
    };
    // Capture on document: runs before the scene's own window listeners, so a
    // released charge can still be read before it resets.
    const down = (e: PointerEvent) => {
      if (!ignored(e)) hit(e, 1);
    };
    const up = (e: PointerEvent) => {
      if (!ignored(e) && sceneState.charge.held && sceneState.charge.level > 0.15) hit(e, 3);
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", up, true);

    const tick = window.setInterval(() => {
      if (g.state !== "playing") return;
      const remaining = Math.max(0, g.endsAt - performance.now());
      setLeft(remaining);
      if (remaining === 0) {
        g.state = "over";
        setState("over");
        if (g.score > readBest()) {
          setNewBest(true);
          saveBest(g.score);
          unsay();
          say("NEW BEST!", Infinity);
        }
      }
    }, 100);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      window.clearInterval(tick);
    };
  }, []);

  const again = () => {
    const g = game.current;
    Object.assign(g, { state: "ready", score: 0, lastHit: -Infinity });
    setNewBest(false);
    setScore(0);
    setLeft(ROUND_MS);
    setState("ready");
    unsay();
    say("404", Infinity);
  };

  return (
    <section data-shape="galaxy" className="container-page relative flex min-h-dvh flex-col justify-between pt-28 pb-10">
      <div>
        <p className="font-mono text-xs tracking-widest text-accent uppercase">404 · Lost in the particles</p>
        <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-balance md:text-5xl">
          This page doesn&rsquo;t exist. <span className="text-accent">Smash it anyway.</span>
        </h1>
        <p className="mt-3 max-w-md text-fg/70">
          Tap the 404 before it rebuilds. Press and hold to charge, then let go on it for a supernova worth 3×.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div aria-live="polite" className="glass flex gap-6 rounded-2xl px-5 py-4 font-mono text-sm">
          <p>
            <span className="block text-[11px] tracking-widest text-muted uppercase">Score</span>
            <span className="text-2xl font-semibold text-fg tabular-nums">{score}</span>
          </p>
          <p>
            <span className="block text-[11px] tracking-widest text-muted uppercase">Time</span>
            <span className="text-2xl font-semibold text-fg tabular-nums">{Math.ceil(left / 1000)}s</span>
          </p>
          <p>
            <span className="block text-[11px] tracking-widest text-muted uppercase">Best</span>
            <span className="text-2xl font-semibold text-accent tabular-nums">{best}</span>
          </p>
        </div>
        <div className="flex gap-3">
          {state === "over" && (
            <button
              type="button"
              onClick={again}
              className="inline-flex h-12 items-center rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-transform duration-300 hover:scale-[1.03]"
            >
              Play again
            </button>
          )}
          <Link
            href="/"
            className="inline-flex h-12 items-center rounded-full bg-fg px-6 text-sm font-medium text-canvas transition-transform duration-300 hover:scale-[1.03]"
          >
            Back home
          </Link>
        </div>
      </div>

      {state === "over" && (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-display text-lg font-semibold">
          Time! You scored <span className="text-accent">{score}</span>
          {newBest ? " — a new best." : "."}
        </p>
      )}

      <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
        {pops.map((p) => (
          <span key={p.id} className="score-pop" style={{ left: p.x, top: p.y }}>
            {p.text}
          </span>
        ))}
      </div>
    </section>
  );
}
