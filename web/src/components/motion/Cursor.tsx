"use client";

import { useEffect, useRef } from "react";

/**
 * Two-part cursor: a dot that tracks the pointer exactly and a ring that trails
 * it with easing. The ring grows over links and shows a label for elements with
 * `data-cursor="Label"`. Fine pointers only; touch and reduced motion keep the
 * native cursor.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce || !dot.current || !ring.current || !label.current) return;
    const d = dot.current;
    const r = ring.current;
    const l = label.current;
    document.documentElement.classList.add("has-custom-cursor");

    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let press = 1;
    let pressTarget = 1;
    let visible = false;
    let frame = 0;

    // Size changes are CSS transitions on the ring's width/height (see data-state
    // classes) so the label renders at its real size instead of being scaled.
    const hitTest = (el: Element | null) => {
      const hit = el?.closest<HTMLElement>("[data-cursor], a, button, input, textarea, label");
      const text = hit?.dataset.cursor ?? "";
      const field = hit?.matches("input, textarea") ?? false;
      if (l.textContent !== text) l.textContent = text;
      r.dataset.state = text ? "label" : field ? "field" : hit ? "hover" : "idle";
    };

    const move = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!visible) {
        visible = true;
        pos.x = target.x;
        pos.y = target.y;
        d.style.opacity = r.style.opacity = "1";
      }
      hitTest(e.target as Element | null);
    };
    // Content moves under a still pointer while scrolling; re-check what's beneath it.
    const scroll = () => {
      if (visible) hitTest(document.elementFromPoint(target.x, target.y));
    };
    const leave = () => {
      visible = false;
      d.style.opacity = r.style.opacity = "0";
    };
    const down = () => (pressTarget = 0.82);
    const up = () => (pressTarget = 1);

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.18;
      pos.y += (target.y - pos.y) * 0.18;
      press += (pressTarget - press) * 0.2;
      d.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;
      r.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${press})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[120] print:hidden">
      <div
        ref={ring}
        data-state="idle"
        className="absolute top-0 left-0 flex size-9 items-center justify-center rounded-full border border-accent/60 opacity-0 transition-[width,height,background-color,border-color,opacity] duration-300 ease-out-expo data-[state=field]:size-3 data-[state=hover]:size-16 data-[state=hover]:border-accent data-[state=hover]:bg-accent/10 data-[state=label]:size-24 data-[state=label]:border-transparent data-[state=label]:bg-accent"
      >
        <span ref={label} className="font-display text-xs font-bold tracking-wider whitespace-nowrap text-on-accent uppercase" />
      </div>
      <div ref={dot} className="absolute top-0 left-0 size-1.5 rounded-full bg-accent opacity-0" />
    </div>
  );
}
