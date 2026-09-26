"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import type { Project } from "@/content/site";
import { site } from "@/content/site";
import { ProjectCard } from "@/components/ProjectCard";
import { Reveal } from "@/components/Reveal";
import { sceneState } from "@/lib/scene-store";
import { useReducedMotion } from "@/lib/useReducedMotion";

const DESKTOP = "(min-width: 768px)";

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function EndCard() {
  const github = site.socials.find((s) => s.label === "GitHub")?.href ?? "#";
  return (
    <a
      href={github}
      target="_blank"
      rel="noreferrer"
      data-cursor="Open"
      className="group flex h-full flex-col justify-between rounded-3xl border border-dashed border-accent/40 p-8 transition-colors duration-500 hover:bg-accent hover:text-on-accent"
    >
      <span className="font-mono text-xs tracking-widest text-accent uppercase group-hover:text-on-accent/80">More</span>
      <span className="font-display text-3xl leading-tight font-bold tracking-tight lg:text-4xl">
        Side projects &amp; experiments on GitHub <span aria-hidden className="inline-block transition-transform duration-500 group-hover:translate-x-2">→</span>
      </span>
    </a>
  );
}

/**
 * Desktop: the section pins while vertical scroll drives the cards sideways,
 * with a progress bar and counter. Mobile and reduced motion: a plain list.
 */
export function WorkGallery({ projects }: { projects: Project[] }) {
  const desktop = useMedia(DESKTOP);
  const reduce = useReducedMotion();
  const horizontal = desktop && !reduce;

  const section = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const distance = useMotionValue(0);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = track.current;
    if (!horizontal || !el) return;
    const measure = () => {
      const d = Math.max(0, el.scrollWidth - window.innerWidth);
      distance.set(d);
      setHeight(d + window.innerHeight);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [horizontal, distance]);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.0005 });
  const x = useTransform(() => -smooth.get() * distance.get());
  const [active, setActive] = useState(1);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.min(projects.length, Math.floor(v * (projects.length + 0.999)) + 1);
    if (i !== active) setActive(i);
  });

  // Touch screens can't hover, so in the list the particles spell whichever
  // project is crossing the middle of the screen instead.
  useEffect(() => {
    const list = section.current;
    if (horizontal || !list || !window.matchMedia("(pointer: coarse)").matches) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
        const card = [...visible][0] as HTMLElement | undefined;
        sceneState.word = card?.querySelector<HTMLElement>("[data-particles]")?.dataset.particles ?? null;
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    list.querySelectorAll("li").forEach((li) => observer.observe(li));
    return () => {
      observer.disconnect();
      sceneState.word = null;
    };
  }, [horizontal]);

  if (!horizontal) {
    return (
      // The scroll target ref stays attached here too, so useScroll never points at nothing.
      <div ref={section}>
      <ul className="container-page mt-14 grid gap-5">
        {projects.map((p, i) => (
          <li key={p.slug}>
            <Reveal className="h-full">
              <ProjectCard project={p} index={i} />
            </Reveal>
          </li>
        ))}
      </ul>
      </div>
    );
  }

  return (
    <div ref={section} className="relative mt-10" style={{ height: height ?? "300vh" }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-16">
        <motion.ul ref={track} style={{ x }} className="flex w-max gap-8 pr-[10vw] pl-[max(2.5rem,calc((100vw-80rem)/2+2.5rem))]">
          {projects.map((p, i) => (
            <li key={p.slug} className="h-[min(34rem,66vh)] w-[min(36rem,44vw)] shrink-0">
              <ProjectCard project={p} index={i} />
            </li>
          ))}
          <li className="h-[min(34rem,66vh)] w-[min(26rem,32vw)] shrink-0">
            <EndCard />
          </li>
        </motion.ul>

        <div className="container-page mt-10 flex items-center gap-6">
          <span className="font-mono text-xs tracking-widest text-muted tabular-nums">
            {String(active).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
          </span>
          <div className="relative h-px flex-1 bg-line">
            <motion.div style={{ scaleX: smooth }} className="absolute inset-0 origin-left bg-accent" />
          </div>
          <span className="font-mono text-xs tracking-widest text-muted uppercase">Scroll</span>
        </div>
      </div>
    </div>
  );
}
