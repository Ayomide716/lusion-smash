"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/** A letter as a physics body: centre position, velocity and spin, in px relative to the line. */
type Body = {
  el: HTMLElement;
  x0: number;
  y0: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  hw: number;
  hh: number;
  r: number;
};

const GRAVITY = 2600; // px/s²
const BOUNCE = 0.3;

/** The letters' physics, outside React: it moves DOM nodes directly, every frame. */
class LetterPile {
  bodies: Body[] = [];
  private raf = 0;
  private last = 0;
  private still = 0;
  private drag: null | { body: Body; dx: number; dy: number; px: number; py: number; t: number; vx: number; vy: number } = null;

  constructor(private line: HTMLElement) {}

  private local(e: { clientX: number; clientY: number }) {
    const r = this.line.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  }

  private step(dt: number) {
    const w = this.line.clientWidth;
    const floor = this.line.clientHeight;
    const ceiling = -window.innerHeight * 0.6;
    const held = this.drag?.body;
    for (const b of this.bodies) {
      if (b === held) continue;
      b.vy += GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;
      if (b.x - b.hw < 0) {
        b.x = b.hw;
        b.vx = Math.abs(b.vx) * BOUNCE;
      } else if (b.x + b.hw > w) {
        b.x = w - b.hw;
        b.vx = -Math.abs(b.vx) * BOUNCE;
      }
      if (b.y < ceiling) {
        b.y = ceiling;
        b.vy = Math.abs(b.vy) * BOUNCE;
      }
      if (b.y + b.hh > floor) {
        b.y = floor - b.hh;
        b.vy = Math.abs(b.vy) < 80 ? 0 : -b.vy * BOUNCE;
        b.vx *= 0.9; // ground friction
        b.va = b.va * 0.8 + (b.vx / b.r) * 0.1;
      }
    }
    // Letters bump into each other (as circles); a held letter shoves the rest.
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < this.bodies.length; i++) {
        for (let j = i + 1; j < this.bodies.length; j++) {
          const p = this.bodies[i];
          const q = this.bodies[j];
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const d = Math.hypot(dx, dy) || 0.01;
          const overlap = p.r + q.r - d;
          if (overlap <= 0) continue;
          const nx = dx / d;
          const ny = dy / d;
          const share = p === held ? 0 : q === held ? 1 : 0.5;
          p.x -= nx * overlap * share;
          p.y -= ny * overlap * share;
          q.x += nx * overlap * (1 - share);
          q.y += ny * overlap * (1 - share);
          const vn = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
          if (vn < 0) {
            const impulse = -vn * (1 + BOUNCE);
            if (p !== held) {
              p.vx -= nx * impulse * share;
              p.vy -= ny * impulse * share;
            }
            if (q !== held) {
              q.vx += nx * impulse * (1 - share);
              q.vy += ny * impulse * (1 - share);
            }
          }
        }
      }
    }
  }

  private frame = (t: number) => {
    // Real time in small steps, so slow devices see the same physics, just with fewer frames.
    const dt = Math.min((t - this.last) / 1000, 0.25);
    this.last = t;
    const steps = Math.ceil(dt / (1 / 120));
    for (let i = 0; i < steps; i++) this.step(dt / steps);
    for (const b of this.bodies) {
      b.el.style.transform = `translate(${b.x - b.x0}px, ${b.y - b.y0}px) rotate(${b.a}rad)`;
    }
    // Sleep once everything has settled, so an idle pile costs nothing.
    const moving = this.drag || this.bodies.some((b) => Math.abs(b.vx) + Math.abs(b.vy) > 6);
    this.still = moving ? 0 : this.still + dt;
    this.raf = this.still > 0.5 ? 0 : requestAnimationFrame(this.frame);
  };

  private wake() {
    this.still = 0;
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  /** Turn each letter into a body where it stands, give them a kick and let go. */
  shatter(letters: (HTMLElement | null)[], hit: number) {
    const line = this.line.getBoundingClientRect();
    this.bodies = letters.flatMap((el, i) => {
      if (!el) return [];
      const r = el.getBoundingClientRect();
      const x = r.left - line.left + r.width / 2;
      const y = r.top - line.top + r.height / 2;
      const near = i === hit ? 1.6 : 1;
      return [
        {
          el,
          x0: x,
          y0: y,
          x,
          y,
          vx: (Math.random() - 0.5) * 500 * near,
          vy: -(250 + Math.random() * 550) * near,
          a: 0,
          va: (Math.random() - 0.5) * 8,
          hw: r.width / 2,
          hh: r.height * 0.42,
          r: Math.max(r.width, r.height * 0.7) * 0.45,
        },
      ];
    });
    this.wake();
  }

  grab(el: HTMLElement, e: { clientX: number; clientY: number }) {
    const body = this.bodies.find((b) => b.el === el);
    if (!body) return;
    const [px, py] = this.local(e);
    this.drag = { body, dx: body.x - px, dy: body.y - py, px, py, t: performance.now(), vx: 0, vy: 0 };
    this.wake();
  }

  move(e: { clientX: number; clientY: number }) {
    const drag = this.drag;
    if (!drag) return;
    const [px, py] = this.local(e);
    const now = performance.now();
    const dt = Math.max((now - drag.t) / 1000, 1 / 240);
    // Smoothed pointer velocity becomes the throw.
    drag.vx = drag.vx * 0.5 + ((px - drag.px) / dt) * 0.5;
    drag.vy = drag.vy * 0.5 + ((py - drag.py) / dt) * 0.5;
    Object.assign(drag, { px, py, t: now });
    drag.body.x = px + drag.dx;
    drag.body.y = py + drag.dy;
    drag.body.va = drag.vx * 0.004;
  }

  release() {
    const drag = this.drag;
    if (!drag) return;
    const clamp = (v: number) => Math.max(-4000, Math.min(4000, v));
    drag.body.vx = clamp(drag.vx);
    drag.body.vy = clamp(drag.vy);
    this.drag = null;
    this.wake();
  }

  /** Glide every letter home and hand them back to the layout. */
  rebuild() {
    this.stop();
    const els = this.bodies.map((b) => b.el);
    for (const el of els) {
      el.style.transition = "transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)";
      el.style.transform = "";
    }
    window.setTimeout(() => els.forEach((el) => (el.style.transition = "")), 950);
    this.bodies = [];
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.drag = null;
  }
}

/**
 * Giant name that rises letter by letter when the footer scrolls into view.
 * Tap or grab a letter and the name breaks into physical letters: they tumble,
 * pile up, knock each other about, and can be flicked or thrown.
 */
export function Wordmark({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const lineRef = useRef<HTMLParagraphElement>(null);
  const letters = useRef<(HTMLSpanElement | null)[]>([]);
  const pile = useRef<LetterPile | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => () => pile.current?.stop(), []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (reduce || !lineRef.current) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-letter]");
    if (!el) return;
    pile.current ??= new LetterPile(lineRef.current);
    if (!broken) {
      pile.current.shatter(letters.current, Number(el.dataset.letter));
      setBroken(true);
      return;
    }
    el.setPointerCapture?.(e.pointerId);
    pile.current.grab(el, e);
  };

  const rebuild = () => {
    pile.current?.rebuild();
    setBroken(false);
  };

  // The line (not each letter) watches the viewport: letters start fully below
  // the mask, where they'd never count as "in view" themselves. Bottom padding
  // keeps the g and y descenders inside the mask. Once broken, the mask opens
  // so letters can be thrown above the line.
  return (
    <div className="relative">
      <motion.p
        ref={lineRef}
        className={`flex pb-[0.16em] font-display text-[9vw] leading-[0.85] font-bold tracking-[-0.06em] whitespace-nowrap select-none ${broken ? "overflow-visible" : "overflow-hidden"}`}
        initial={reduce ? false : "hidden"}
        whileInView="shown"
        viewport={{ once: true, margin: "0px 0px -5% 0px" }}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => pile.current?.move(e)}
        onPointerUp={() => pile.current?.release()}
        onPointerCancel={() => pile.current?.release()}
      >
        <span className="sr-only">{text}</span>
        {[...text].map((ch, i) => (
          <motion.span
            key={i}
            aria-hidden
            data-reveal
            className={ch === " " ? "w-[0.25em]" : "inline-block"}
            variants={{ hidden: { y: "125%" }, shown: { y: "0%" } }}
            transition={reduce ? { duration: 0 } : { duration: 1, delay: i * 0.035, ease: [0.16, 1, 0.3, 1] }}
          >
            {ch === " " ? (
              " "
            ) : (
              <span
                ref={(el) => {
                  letters.current[i] = el;
                }}
                data-letter={i}
                className={`inline-block will-change-transform ${reduce ? "" : broken ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer"}`}
              >
                {ch}
              </span>
            )}
          </motion.span>
        ))}
      </motion.p>
      {!reduce && (
        <p className="absolute -top-7 right-0 font-mono text-[11px] tracking-widest text-muted uppercase">
          {broken ? (
            <button type="button" onClick={rebuild} className="uppercase underline decoration-accent/50 underline-offset-4 hover:text-fg">
              Rebuild my name ↺
            </button>
          ) : (
            <span aria-hidden>Tap a letter ✦</span>
          )}
        </p>
      )}
    </div>
  );
}
