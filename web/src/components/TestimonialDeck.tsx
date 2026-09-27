"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { Testimonial } from "@/content/site";
import { useReducedMotion } from "@/lib/useReducedMotion";

const SECONDS = 7;

/**
 * One quote at a time, cycling on its own. The active client's progress bar is
 * a CSS animation whose end advances the deck, so pausing (hover, focus, off
 * screen) is just `animation-play-state`. Clients are tabs: click or use the
 * arrow keys. All quotes share one grid cell, so the card is always as tall as
 * the longest one and nothing below it jumps when they change.
 */
export function TestimonialDeck({ items }: { items: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const list = useRef<HTMLDivElement>(null);
  const running = !reduce && visible && !hovered && !focused;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // On phones the clients scroll sideways: keep the active one in view.
  useEffect(() => {
    const row = list.current;
    const tab = tabs.current[index];
    if (!row || !tab || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: tab.offsetLeft - row.offsetLeft - 8, behavior: reduce ? "auto" : "smooth" });
  }, [index, reduce]);

  const select = (i: number, focus = false) => {
    const next = (i + items.length) % items.length;
    setIndex(next);
    if (focus) tabs.current[next]?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (e.key in keys) {
      e.preventDefault();
      select(index + keys[e.key], true);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      select(e.key === "Home" ? 0 : items.length - 1, true);
    }
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      ref={root}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
      className="glass relative isolate grid gap-10 overflow-hidden rounded-3xl p-6 md:grid-cols-12 md:gap-12 md:p-12"
    >
      {/* Giant outlined index behind the quote. */}
      <motion.span
        key={`n-${index}`}
        aria-hidden
        initial={reduce ? false : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute -right-4 -bottom-10 -z-10 font-display text-[11rem] leading-none font-bold tracking-[-0.06em] text-transparent select-none [-webkit-text-stroke:1px_rgb(219_39_119/0.18)] md:text-[16rem]"
      >
        {pad(index + 1)}
      </motion.span>

      <div className="md:col-span-8">
        <div className="flex items-start justify-between">
          <span aria-hidden className="font-display text-[6rem] leading-[0.6] text-accent/30 md:text-[8rem]">
            “
          </span>
          <span className="font-mono text-xs tracking-widest text-muted">
            {pad(index + 1)} / {pad(items.length)}
          </span>
        </div>

        <div id="testimonial-panel" role="tabpanel" aria-labelledby={`testimonial-tab-${index}`} className="mt-8 grid">
          {items.map((t, i) => (
            <figure
              key={t.name}
              aria-hidden={i !== index}
              className={`[grid-area:1/1] ${i === index ? "" : "invisible"}`}
            >
              <blockquote className="font-display text-2xl leading-snug font-medium tracking-tight text-balance md:text-[2.1rem] md:leading-[1.25]">
                {i === index && !reduce
                  ? t.quote.split(" ").map((word, w) => (
                      <motion.span
                        key={`${index}-${w}`}
                        className="inline-block whitespace-pre"
                        initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.6, delay: w * 0.022, ease: [0.16, 1, 0.3, 1] }}
                      >
                        {word}{" "}
                      </motion.span>
                    ))
                  : t.quote}
              </blockquote>
              <figcaption className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-semibold text-fg">{t.name}</span>
                <span aria-hidden className="h-px w-6 bg-accent" />
                {t.project ? (
                  <Link
                    href={`/work/${t.project}`}
                    tabIndex={i === index ? undefined : -1}
                    data-cursor="View"
                    className="text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
                  >
                    {t.context}
                  </Link>
                ) : (
                  <span className="text-muted">{t.context}</span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div
        ref={list}
        role="tablist"
        aria-label="Client testimonials"
        aria-orientation="vertical"
        onKeyDown={onKey}
        className="-mx-2 flex snap-x gap-2 overflow-x-auto px-2 pb-1 md:col-span-4 md:mx-0 md:flex-col md:justify-center md:overflow-visible md:px-0"
      >
        {items.map((t, i) => {
          const on = i === index;
          return (
            <button
              key={t.name}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`testimonial-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="testimonial-panel"
              tabIndex={on ? 0 : -1}
              data-particles={t.name.toUpperCase()}
              onClick={() => select(i)}
              className={`group relative shrink-0 snap-start overflow-hidden rounded-2xl px-4 py-3 text-left transition-colors duration-300 md:w-full ${
                on ? "bg-accent-soft/70 text-fg" : "text-fg/45 hover:bg-fg/5 hover:text-fg"
              }`}
            >
              <span
                aria-hidden
                className={`absolute top-3 bottom-3 left-0 w-0.5 origin-center rounded-full bg-accent transition-transform duration-500 ease-out-expo ${on ? "scale-y-100" : "scale-y-0"}`}
              />
              <span className="flex items-baseline gap-3">
                <span className={`font-mono text-[11px] ${on ? "text-accent" : "text-muted"}`}>{pad(i + 1)}</span>
                <span className="font-display text-base font-semibold tracking-tight md:text-lg">{t.name}</span>
              </span>
              <span className="mt-0.5 block pl-8 text-xs text-muted">{t.context}</span>
              {/* Progress: fills over the quote's time on screen, then moves on. */}
              <span aria-hidden className="absolute inset-x-4 bottom-1.5 h-px overflow-hidden bg-line">
                {on && (
                  <span
                    key={index}
                    onAnimationEnd={() => select(index + 1)}
                    className="block h-full origin-left bg-accent"
                    style={
                      reduce
                        ? { transform: "scaleX(1)" }
                        : {
                            animation: `deck-progress ${SECONDS}s linear forwards`,
                            animationPlayState: running ? "running" : "paused",
                          }
                    }
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
