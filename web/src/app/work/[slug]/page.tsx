import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/content/site";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { ProjectVisual } from "@/components/ProjectVisual";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) return {};
  return { title: project.title, description: project.tagline };
}

export default async function CaseStudy({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) notFound();
  const project = projects[index];
  const next = projects[(index + 1) % projects.length];

  return (
    <article className="container-page pt-36 pb-24">
      <div data-shape="sphere" data-shape-x="0.5" data-shape-scale="0.7">
        <Reveal>
          <Link href="/#work" className="font-mono text-xs tracking-widest text-muted uppercase hover:text-fg">
            ← All work
          </Link>
          <h1 className="mt-8 text-6xl font-bold tracking-[-0.05em] md:text-9xl">
            <SplitReveal text={project.title} />
          </h1>
          <p className="mt-6 max-w-2xl text-xl text-balance text-fg/75 md:text-2xl">{project.tagline}</p>
        </Reveal>

        <Reveal delay={0.1} className="glass mt-12 grid gap-6 rounded-3xl p-6 sm:grid-cols-3 md:p-8">
          <div>
            <p className="font-mono text-xs tracking-widest text-muted uppercase">Role</p>
            <p className="mt-2">{project.role}</p>
          </div>
          <div>
            <p className="font-mono text-xs tracking-widest text-muted uppercase">Year</p>
            <p className="mt-2">{project.year}</p>
          </div>
          <div>
            <p className="font-mono text-xs tracking-widest text-muted uppercase">Stack</p>
            <p className="mt-2">{project.stack.join(", ")}</p>
          </div>
        </Reveal>
      </div>

      <div data-shape="knot" data-shape-x="-0.55" data-shape-scale="0.7" className="mt-24 grid gap-16 md:grid-cols-12">
        {(project.image || project.live) && (
          // Stays in view beside the story while you read it.
          <div className="md:col-span-4 md:col-start-1">
            <Reveal className="md:sticky md:top-28">
              <div className={project.image ? "mx-auto w-[70%] max-w-[20rem] md:w-full" : ""}>
                <ProjectVisual project={project} size="hero" />
              </div>
            </Reveal>
          </div>
        )}
        <div className="space-y-16 md:col-span-7 md:col-start-6">
          <Reveal>
            <h2 className="font-mono text-xs tracking-widest text-accent uppercase">The problem</h2>
            <p className="mt-4 text-2xl leading-snug text-fg/90">{project.problem}</p>
          </Reveal>
          <Reveal>
            <h2 className="font-mono text-xs tracking-widest text-accent uppercase">Approach</h2>
            <ol className="mt-4 space-y-4 text-lg text-fg/80">
              {project.approach.map((step, i) => (
                <li key={step} className="flex gap-4">
                  <span className="font-mono text-sm text-muted">0{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal>
            <h2 className="font-mono text-xs tracking-widest text-accent uppercase">Key decisions</h2>
            <div className="mt-4 space-y-4">
              {project.decisions.map((d) => (
                <div key={d.title} className="glass rounded-3xl p-6">
                  <h3 className="text-lg font-semibold">{d.title}</h3>
                  <p className="mt-2 text-fg/70">{d.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      <div data-shape="galaxy" data-shape-scale="1" className="mt-24">
        <Reveal>
          <h2 className="font-mono text-xs tracking-widest text-accent uppercase">Outcome</h2>
          <p className="mt-4 max-w-3xl text-3xl leading-tight font-semibold tracking-tight text-balance md:text-4xl">
            {project.outcome}
          </p>
          {project.links.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {project.links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="Open"
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-fg px-6 text-sm font-medium text-canvas transition-colors duration-300 hover:bg-accent"
                >
                  {l.label}
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          )}
        </Reveal>
        <ul className="mt-12 grid gap-5 sm:grid-cols-3">
          {project.metrics.map((m, i) => (
            <li key={m.label}>
              <Reveal delay={i * 0.06} className="glass h-full rounded-3xl p-6">
                <CountUp value={m.value} className="block font-display text-5xl font-bold text-accent" />
                <p className="mt-2 text-fg/70">{m.label}</p>
              </Reveal>
            </li>
          ))}
        </ul>

        <Link
          href={`/work/${next.slug}`}
          data-cursor="Next"
          className="group mt-24 flex items-end justify-between gap-6 border-t border-line pt-10"
        >
          <span>
            <span className="font-mono text-xs tracking-widest text-muted uppercase">Next project</span>
            <span className="mt-3 block text-4xl font-semibold tracking-tight transition-colors group-hover:text-accent md:text-6xl">
              {next.title}
            </span>
          </span>
          <span aria-hidden className="text-4xl transition-transform duration-500 ease-out-expo group-hover:translate-x-2">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}
