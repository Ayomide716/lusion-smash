"use client";

import Link from "next/link";
import type { Project } from "@/content/site";
import { sceneState } from "@/lib/scene-store";
import { CountUp } from "@/components/motion/CountUp";
import { ProjectVisual } from "@/components/ProjectVisual";

/** 3D tilt towards the pointer plus a spotlight that follows it, via CSS variables (no re-renders). */
function track(e: React.PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const box = el.getBoundingClientRect();
  const px = (e.clientX - box.left) / box.width;
  const py = (e.clientY - box.top) / box.height;
  el.style.setProperty("--mx", `${px * 100}%`);
  el.style.setProperty("--my", `${py * 100}%`);
  el.style.setProperty("--ry", `${(px - 0.5) * 8}deg`);
  el.style.setProperty("--rx", `${(0.5 - py) * 8}deg`);
}

function reset(e: React.PointerEvent<HTMLElement>) {
  e.currentTarget.style.setProperty("--rx", "0deg");
  e.currentTarget.style.setProperty("--ry", "0deg");
}

export function ProjectCard({ project, index }: { project: Project; index: number }) {
  const excite = () => {
    sceneState.energy = 1;
  };

  return (
    <Link
      href={`/work/${project.slug}`}
      data-cursor="View"
      data-particles={project.title.toUpperCase()}
      onPointerEnter={excite}
      onPointerMove={track}
      onPointerLeave={reset}
      onFocus={excite}
      className="glass group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transition-transform duration-500 ease-out-expo [transform:perspective(1000px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] hover:duration-150 motion-reduce:[transform:none] md:p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgb(236 72 153 / 0.14), transparent 60%)" }}
      />
      <div
        aria-hidden
        className="absolute -top-24 -right-24 size-64 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-80"
        style={{ background: `hsl(${project.hue} 90% 60% / 0.5)` }}
      />
      {(project.image || project.live) && (
        // Peeks up from the bottom-right corner; lifts and straightens on hover.
        <div
          aria-hidden
          className={`pointer-events-none absolute right-5 transition-transform duration-700 ease-out-expo group-hover:-translate-y-4 group-hover:rotate-[-2deg] motion-reduce:transition-none ${
            project.image
              ? "-bottom-28 w-[30%] max-w-[10rem] rotate-[-7deg] sm:-bottom-20 sm:w-[34%] sm:max-w-[11rem]"
              : "-bottom-10 w-[40%] max-w-[15rem] rotate-[-4deg] sm:w-[46%]"
          }`}
        >
          <ProjectVisual project={project} size="card" />
        </div>
      )}
      <div className="relative flex items-center justify-between font-mono text-xs text-muted">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span>{project.year}</span>
      </div>
      <h3 className="relative mt-16 text-3xl font-bold tracking-tight transition-transform duration-500 ease-out-expo group-hover:translate-x-1 md:text-4xl">
        {project.title}
      </h3>
      <p className="relative mt-3 max-w-[62%] text-fg/70 sm:max-w-md">{project.tagline}</p>
      <ul className="relative mt-6 flex max-w-[62%] flex-wrap gap-2 sm:max-w-[70%]">
        {project.stack.slice(0, 4).map((s) => (
          <li key={s} className="rounded-full border border-line px-3 py-1 text-xs text-fg/70">
            {s}
          </li>
        ))}
      </ul>
      <div className="relative mt-auto flex max-w-[62%] items-end justify-between gap-4 pt-10 sm:max-w-none">
        <p>
          <CountUp value={project.metrics[0].value} className="block font-display text-3xl font-bold text-accent" />
          <span className="text-sm text-muted">{project.metrics[0].label}</span>
        </p>
        <span
          aria-hidden
          className={`relative size-11 items-center justify-center rounded-full border border-line bg-panel transition-all duration-500 ease-out-expo group-hover:rotate-[-45deg] group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent ${
            project.image || project.live ? "hidden" : "flex"
          }`}
        >
          →
        </span>
      </div>
    </Link>
  );
}
