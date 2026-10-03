"use client";

import Link from "next/link";
import { useRef, useSyncExternalStore, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { site } from "@/content/site";
import { getIntroDone, subscribeIntro } from "@/lib/scene-store";
import { Magnetic } from "@/components/motion/Magnetic";
import { ReactiveText } from "@/components/motion/ReactiveText";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { NameSpell } from "@/components/NameSpell";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Slides a line up from behind a mask once the intro curtain has lifted. */
function Line({ children, delay, play }: { children: ReactNode; delay: number; play: boolean }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        data-reveal
        className="block"
        initial={{ y: "110%" }}
        animate={play ? { y: "0%" } : undefined}
        transition={{ duration: 1.1, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Fade({ children, delay, play, className }: { children: ReactNode; delay: number; play: boolean; className?: string }) {
  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={play ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function Hero() {
  const introDone = useSyncExternalStore(subscribeIntro, getIntroDone, () => false);
  const reduce = useReducedMotion();
  const play = introDone || !!reduce;

  // Parallax exit: the hero drifts up and fades as you scroll past it.
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const [first, ...rest] = site.name.split(" ");

  return (
    <section
      ref={ref}
      data-shape="initials"
      data-shape-x="0.38"
      data-shape-y="0.22"
      data-shape-scale="0.95"
      aria-labelledby="hero-title"
      className="relative flex min-h-dvh flex-col justify-end"
    >
      <motion.div style={reduce ? undefined : { y, opacity }} className="container-page pt-32 pb-16 md:pb-24">
        <Fade play={play} delay={0}>
          <div className="mb-8 flex flex-wrap items-center gap-2">
          <p className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-fg/80">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent/60 motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-accent" />
            </span>
            {site.availability}
          </p>
          <NameSpell className="glass inline-flex cursor-text items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium focus-within:ring-2 focus-within:ring-accent/40" />
          </div>
        </Fade>

        <h1
          id="hero-title"
          className="max-w-5xl text-[13vw] leading-[0.9] font-bold tracking-[-0.05em] sm:text-7xl lg:text-[7.5rem]"
        >
          <Line play={play} delay={0.05}>
            <ReactiveText text={first} />
          </Line>
          <Line play={play} delay={0.15}>
            <span className="text-accent">
              <ReactiveText text={rest.join(" ")} />
            </span>
          </Line>
        </h1>

        <Fade play={play} delay={0.35}>
          <p className="mt-8 max-w-xl text-lg text-balance text-fg/75 md:text-xl">
            <strong className="font-display font-semibold text-fg">{site.role}.</strong> {site.pitch}
          </p>
        </Fade>

        <Fade play={play} delay={0.45} className="mt-10 flex flex-wrap items-center gap-3">
          <Magnetic>
            <Link
              href="/#work"
              className="group inline-flex h-14 items-center gap-2 rounded-full bg-fg px-7 text-sm font-medium text-canvas transition-colors duration-300 hover:bg-accent"
            >
              See selected work
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-y-0.5">
                ↓
              </span>
            </Link>
          </Magnetic>
          <Link
            href="/#contact"
            className="glass inline-flex h-14 items-center rounded-full px-7 text-sm font-medium transition-colors hover:bg-fg/5"
          >
            Get in touch
          </Link>
        </Fade>
      </motion.div>

      <p
        aria-hidden
        className="absolute right-5 bottom-8 hidden font-mono text-[11px] tracking-widest text-muted uppercase md:right-10 md:block"
      >
        Move your cursor · Scroll to morph
      </p>
    </section>
  );
}
