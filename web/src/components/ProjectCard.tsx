"use client";

import Link from "next/link";
import type { Project } from "@/content/site";
import { sceneState } from "@/lib/scene-store";

export function ProjectCard({ project, index }: { project: Project; index: number }) {
  const excite = () => {
    sceneState.energy = 1;
  };

  return (
    <Link
      href={`/work/${project.slug}`}
      onPointerEnter={excite}
      onFocus={excite}
      className="glass group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transition-transform duration-500 ease-out-expo hover:-translate-y-1 md:p-8"
    >
      <div
        aria-hidden
        className="absolute -top-24 -right-24 size-64 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-80"
        style={{ background: `hsl(${project.hue} 90% 60% / 0.5)` }}
      />
      <div className="relative flex items-center justify-between font-mono text-xs text-muted">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span>{project.year}</span>
      </div>
      <h3 className="relative mt-16 text-3xl font-semibold tracking-tight md:text-4xl">{project.title}</h3>
      <p className="relative mt-3 max-w-md text-fg/70">{project.tagline}</p>
      <ul className="relative mt-6 flex flex-wrap gap-2">
        {project.stack.slice(0, 4).map((s) => (
          <li key={s} className="rounded-full border border-line px-3 py-1 text-xs text-fg/70">
            {s}
          </li>
        ))}
      </ul>
      <div className="relative mt-auto flex items-end justify-between gap-4 pt-10">
        <p>
          <span className="block text-2xl font-semibold text-accent">{project.metrics[0].value}</span>
          <span className="text-sm text-muted">{project.metrics[0].label}</span>
        </p>
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-full border border-line transition-all duration-500 ease-out-expo group-hover:rotate-[-45deg] group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent"
        >
          →
        </span>
      </div>
    </Link>
  );
}
